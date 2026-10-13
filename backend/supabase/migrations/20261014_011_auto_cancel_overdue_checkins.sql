-- Migration: 20261014_011_auto_cancel_overdue_checkins.sql
-- Description: Function and scheduled procedure to automatically cancel overdue un-checked-in bookings (no-shows)
-- and immediately release their rooms back to AVAILABLE inventory.

CREATE OR REPLACE FUNCTION public.auto_cancel_overdue_checkins()
RETURNS JSONB AS $$
DECLARE
    v_cancelled_count INTEGER := 0;
    v_record RECORD;
    v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Yangon')::DATE;
BEGIN
    FOR v_record IN
        SELECT id, booking_reference, room_id, guest_name
        FROM public.bookings
        WHERE booking_status IN ('CONFIRMED', 'PENDING')
          AND check_in_date < v_today
        FOR UPDATE
    LOOP
        -- Mark as CANCELLED (No-Show)
        UPDATE public.bookings
        SET booking_status = 'CANCELLED',
            special_notes = COALESCE(special_notes || ' ', '') || '[Auto-cancelled: Check-in date passed without arrival (No-show)]',
            updated_at = NOW()
        WHERE id = v_record.id;

        -- Immediately release room to AVAILABLE
        IF v_record.room_id IS NOT NULL THEN
            UPDATE public.rooms
            SET status = 'AVAILABLE',
                updated_at = NOW()
            WHERE id = v_record.room_id;
        END IF;

        -- Record immutable audit log
        INSERT INTO public.audit_logs (
            actor_role,
            action,
            entity_type,
            entity_id,
            details
        ) VALUES (
            'SYSTEM_CRON',
            'AUTO_CANCELLED_OVERDUE_NOSHOW',
            'bookings',
            v_record.id,
            jsonb_build_object(
                'reference', v_record.booking_reference,
                'guest_name', v_record.guest_name,
                'reason', 'Check-in date passed without arrival (No-show)'
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
