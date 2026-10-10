-- ============================================================================
-- HOTEL MANAGEMENT SYSTEM: ATOMIC CONCURRENCY, QR SCAN & CANCELLATION JOBS
-- Migration: 20261010_002_concurrency_and_cancellation.sql
-- ============================================================================

-- 1. ATOMIC BOOKING FUNCTION (Row Locking to Prevent Double-Bookings)
-- Uses SELECT FOR UPDATE on the room record to serialize concurrent bookings.
CREATE OR REPLACE FUNCTION public.book_room_atomic(
    p_room_id UUID,
    p_guest_name TEXT,
    p_guest_email TEXT,
    p_guest_phone TEXT,
    p_check_in DATE,
    p_check_out DATE,
    p_total_amount NUMERIC,
    p_payment_method payment_method,
    p_payment_status payment_status,
    p_qr_token TEXT,
    p_booking_reference TEXT,
    p_guest_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_room RECORD;
    v_conflict_count INTEGER;
    v_new_booking_id UUID;
    v_auto_cancel_at TIMESTAMPTZ := NULL;
BEGIN
    -- 1. Row Lock the room to serialize concurrent booking attempts for this room
    SELECT * INTO v_room
    FROM public.rooms
    WHERE id = p_room_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ROOM_NOT_FOUND',
            'message', 'The requested room was not found.'
        );
    END IF;

    IF v_room.status = 'MAINTENANCE' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ROOM_IN_MAINTENANCE',
            'message', 'Room is currently under maintenance.'
        );
    END IF;

    -- 2. Verify date overlap with active bookings
    SELECT COUNT(*) INTO v_conflict_count
    FROM public.bookings
    WHERE room_id = p_room_id
      AND booking_status IN ('CONFIRMED', 'CHECKED_IN')
      AND (
          (check_in_date <= p_check_in AND check_out_date > p_check_in)
          OR (check_in_date < p_check_out AND check_out_date >= p_check_out)
          OR (check_in_date >= p_check_in AND check_out_date <= p_check_out)
      );

    IF v_conflict_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'DATES_UNAVAILABLE',
            'message', 'This room is already reserved for the selected dates.'
        );
    END IF;

    -- 3. Calculate 24-Hour cancellation policy timestamp:
    -- If Pay at Hotel & unconfirmed payment, set auto-cancellation deadline to NOW() + 24 hours
    IF p_payment_method = 'PAY_AT_HOTEL' AND p_payment_status = 'PENDING' THEN
        v_auto_cancel_at := NOW() + INTERVAL '24 hours';
    END IF;

    -- 4. Insert the booking safely
    INSERT INTO public.bookings (
        booking_reference,
        guest_id,
        guest_name,
        guest_email,
        guest_phone,
        room_id,
        check_in_date,
        check_out_date,
        total_amount,
        payment_method,
        payment_status,
        booking_status,
        qr_token,
        auto_cancel_at,
        created_at
    ) VALUES (
        p_booking_reference,
        p_guest_id,
        p_guest_name,
        p_guest_email,
        p_guest_phone,
        p_room_id,
        p_check_in,
        p_check_out,
        p_total_amount,
        p_payment_method,
        p_payment_status,
        'CONFIRMED',
        p_qr_token,
        v_auto_cancel_at,
        NOW()
    ) RETURNING id INTO v_new_booking_id;

    -- 5. Audit Log
    INSERT INTO public.audit_logs (
        actor_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        details
    ) VALUES (
        p_guest_id,
        'GUEST',
        'BOOKING_CREATED',
        'bookings',
        v_new_booking_id,
        jsonb_build_object(
            'reference', p_booking_reference,
            'room_id', p_room_id,
            'payment_method', p_payment_method,
            'auto_cancel_at', v_auto_cancel_at
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_new_booking_id,
        'booking_reference', p_booking_reference,
        'room_number', v_room.room_number,
        'qr_token', p_qr_token,
        'auto_cancel_at', v_auto_cancel_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. CONTACTLESS QR CHECK-IN FUNCTION
CREATE OR REPLACE FUNCTION public.check_in_with_qr_token(
    p_qr_token TEXT,
    p_staff_or_kiosk_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_booking RECORD;
    v_room RECORD;
BEGIN
    -- Look up active booking matching the QR token
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE qr_token = p_qr_token
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_TOKEN',
            'message', 'No booking found matching this QR code token.'
        );
    END IF;

    IF v_booking.booking_status = 'CHECKED_IN' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ALREADY_CHECKED_IN',
            'message', 'Guest is already checked in.',
            'checked_in_at', v_booking.checked_in_at
        );
    END IF;

    IF v_booking.booking_status = 'CANCELLED' OR v_booking.booking_status = 'EXPIRED' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'BOOKING_INACTIVE',
            'message', 'This reservation has been cancelled or has expired.'
        );
    END IF;

    -- Update booking status to CHECKED_IN
    UPDATE public.bookings
    SET booking_status = 'CHECKED_IN',
        checked_in_at = NOW(),
        updated_at = NOW()
    WHERE id = v_booking.id;

    -- Update room status to OCCUPIED
    UPDATE public.rooms
    SET status = 'OCCUPIED',
        updated_at = NOW()
    WHERE id = v_booking.room_id
    RETURNING room_number INTO v_room;

    -- Audit Log
    INSERT INTO public.audit_logs (
        actor_id,
        actor_role,
        action,
        entity_type,
        entity_id,
        details
    ) VALUES (
        p_staff_or_kiosk_id,
        'KIOSK_OR_RECEPTION',
        'CONTACTLESS_CHECK_IN',
        'bookings',
        v_booking.id,
        jsonb_build_object(
            'booking_reference', v_booking.booking_reference,
            'guest_name', v_booking.guest_name,
            'room_id', v_booking.room_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking.id,
        'booking_reference', v_booking.booking_reference,
        'guest_name', v_booking.guest_name,
        'room_number', v_room.room_number,
        'check_in_date', v_booking.check_in_date,
        'check_out_date', v_booking.check_out_date,
        'payment_status', v_booking.payment_status,
        'checked_in_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. 24-HOUR AUTOMATED CANCELLATION PROCEDURE (For pg_cron or Supabase Edge Functions)
CREATE OR REPLACE FUNCTION public.auto_cancel_unpaid_bookings()
RETURNS JSONB AS $$
DECLARE
    v_cancelled_count INTEGER := 0;
    v_record RECORD;
BEGIN
    FOR v_record IN
        SELECT id, booking_reference, room_id, guest_name, guest_email
        FROM public.bookings
        WHERE booking_status = 'CONFIRMED'
          AND payment_status = 'PENDING'
          AND auto_cancel_at IS NOT NULL
          AND auto_cancel_at <= NOW()
        FOR UPDATE
    LOOP
        -- Mark booking as CANCELLED
        UPDATE public.bookings
        SET booking_status = 'CANCELLED',
            updated_at = NOW()
        WHERE id = v_record.id;

        -- Create Audit Log
        INSERT INTO public.audit_logs (
            actor_role,
            action,
            entity_type,
            entity_id,
            details
        ) VALUES (
            'SYSTEM_CRON',
            'AUTO_CANCELLED_24HR_POLICY',
            'bookings',
            v_record.id,
            jsonb_build_object(
                'reference', v_record.booking_reference,
                'guest_name', v_record.guest_name,
                'reason', '24-hour unpaid Pay-at-Hotel policy expired'
            )
        );

        v_cancelled_count := v_cancelled_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'cancelled_count', v_cancelled_count,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
