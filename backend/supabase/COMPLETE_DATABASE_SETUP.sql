-- ============================================================================
-- GRAND AZURE LUXURY RESORT & HOTEL MANAGEMENT SYSTEM
-- MASTER DATABASE INITIALIZATION & MIGRATION SCRIPT (MIGRATIONS 001 - 004)
-- ============================================================================
-- Instructions:
-- 1. Open your Supabase Project Dashboard: https://supabase.com/dashboard/project/mzmkiivcjbnhjjymiuha
-- 2. Go to "SQL Editor" -> Click "New query"
-- 3. Paste this ENTIRE script into the editor and click "Run" (or Ctrl + Enter).
-- 4. All tables, custom ENUMs, Row Level Security, concurrency row-locking
--    stored procedures, seed rooms, and native pg_cron jobs will be deployed!
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ----------------------------------------------------------------------------
-- 2. CUSTOM ENUM TYPES
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('GUEST', 'RECEPTIONIST', 'HOUSEKEEPING', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE room_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('ONLINE', 'PAY_AT_HOTEL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE service_category AS ENUM ('TOWELS', 'CLEANING', 'MAINTENANCE', 'FOOD_BEVERAGE', 'AMENITIES', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE service_priority AS ENUM ('LOW', 'NORMAL', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE service_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 3. RELATIONAL TABLES
-- ----------------------------------------------------------------------------

-- Profiles Table (Users & Roles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'GUEST',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms Inventory Table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number TEXT UNIQUE NOT NULL,
    room_type TEXT NOT NULL,
    floor INTEGER NOT NULL DEFAULT 1,
    price_per_night NUMERIC(10, 2) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 2,
    status room_status NOT NULL DEFAULT 'AVAILABLE',
    amenities JSONB DEFAULT '[]'::jsonb,
    image_url TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings Table (Concurrency & Policy Protected)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference TEXT UNIQUE NOT NULL,
    guest_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_phone TEXT,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'PAY_AT_HOTEL',
    payment_status payment_status NOT NULL DEFAULT 'PENDING',
    booking_status booking_status NOT NULL DEFAULT 'CONFIRMED',
    qr_token TEXT UNIQUE,
    auto_cancel_at TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ,
    checked_out_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_date_range CHECK (check_out_date > check_in_date)
);

-- In-Room Digital Concierge Service Requests
CREATE TABLE IF NOT EXISTS public.room_service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
    category service_category NOT NULL,
    description TEXT NOT NULL,
    priority service_priority NOT NULL DEFAULT 'NORMAL',
    status service_status NOT NULL DEFAULT 'PENDING',
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Immutable Security & Concurrency Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    actor_role TEXT NOT NULL DEFAULT 'SYSTEM',
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_concurrency ON public.bookings(room_id, check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_qr_token ON public.bookings(qr_token);
CREATE INDEX IF NOT EXISTS idx_bookings_auto_cancel ON public.bookings(auto_cancel_at) WHERE payment_status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.room_service_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Rooms Policies
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.rooms;
CREATE POLICY "Anyone can view rooms" ON public.rooms FOR SELECT USING (true);

-- Bookings Policies
DROP POLICY IF EXISTS "Guests can view own bookings" ON public.bookings;
CREATE POLICY "Guests can view own bookings" ON public.bookings FOR SELECT
USING (auth.uid() = guest_id OR auth.jwt() ->> 'role' IN ('RECEPTIONIST', 'ADMIN'));

DROP POLICY IF EXISTS "Guests can insert bookings" ON public.bookings;
CREATE POLICY "Guests can insert bookings" ON public.bookings FOR INSERT WITH CHECK (true);

-- Service Requests Policies
DROP POLICY IF EXISTS "Anyone can view service requests" ON public.room_service_requests;
CREATE POLICY "Anyone can view service requests" ON public.room_service_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Guests can create service requests" ON public.room_service_requests;
CREATE POLICY "Guests can create service requests" ON public.room_service_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can update service requests" ON public.room_service_requests;
CREATE POLICY "Staff can update service requests" ON public.room_service_requests FOR UPDATE USING (true);

-- ----------------------------------------------------------------------------
-- 6. REALTIME REPLICATION (SUPABASE REALTIME)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_service_requests;
EXCEPTION WHEN OTHERS THEN
    NULL; -- Publication already includes these tables
END $$;

-- ----------------------------------------------------------------------------
-- 7. STORED PROCEDURES (ATOMIC ROW LOCKING & POLICY FUNCTIONS)
-- ----------------------------------------------------------------------------

-- A. Atomic Double-Booking Protection Procedure
CREATE OR REPLACE FUNCTION public.book_room_atomic(
    p_room_id UUID,
    p_guest_id UUID,
    p_guest_name TEXT,
    p_guest_email TEXT,
    p_guest_phone TEXT,
    p_check_in DATE,
    p_check_out DATE,
    p_total_amount NUMERIC,
    p_payment_method public.payment_method,
    p_payment_status public.payment_status,
    p_qr_token TEXT,
    p_booking_reference TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_room RECORD;
    v_conflict_count INTEGER;
    v_new_booking_id UUID;
    v_auto_cancel_at TIMESTAMPTZ := NULL;
BEGIN
    -- 1. Acquire exclusive row lock on the room
    SELECT * INTO v_room
    FROM public.rooms
    WHERE id = p_room_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ROOM_NOT_FOUND',
            'message', 'Selected room does not exist.'
        );
    END IF;

    -- 2. Verify date overlap against CONFIRMED or CHECKED_IN bookings
    SELECT COUNT(*) INTO v_conflict_count
    FROM public.bookings
    WHERE room_id = p_room_id
      AND booking_status IN ('CONFIRMED', 'CHECKED_IN')
      AND (
          (check_in_date < p_check_out AND check_out_date > p_check_in)
      );

    IF v_conflict_count > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'DATES_UNAVAILABLE',
            'message', 'Room is already reserved for the selected date range.'
        );
    END IF;

    -- 3. Compute 24-hour hold window for PAY_AT_HOTEL
    IF p_payment_method = 'PAY_AT_HOTEL' AND p_payment_status = 'PENDING' THEN
        v_auto_cancel_at := NOW() + INTERVAL '24 hours';
    END IF;

    -- 4. Insert booking atomically
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


-- B. Contactless QR Check-In Procedure
CREATE OR REPLACE FUNCTION public.check_in_with_qr_token(
    p_qr_token TEXT,
    p_staff_or_kiosk_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_booking RECORD;
    v_room RECORD;
BEGIN
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

    IF v_booking.booking_status IN ('CANCELLED', 'EXPIRED') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'BOOKING_INACTIVE',
            'message', 'Reservation is cancelled or expired.'
        );
    END IF;

    SELECT * INTO v_room
    FROM public.rooms
    WHERE id = v_booking.room_id
    FOR UPDATE;

    -- Update booking status
    UPDATE public.bookings
    SET booking_status = 'CHECKED_IN',
        checked_in_at = NOW(),
        updated_at = NOW()
    WHERE id = v_booking.id;

    -- Update room status to OCCUPIED
    UPDATE public.rooms
    SET status = 'OCCUPIED',
        updated_at = NOW()
    WHERE id = v_booking.room_id;

    -- Audit log
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


-- C. Automated 24-Hour Policy Cancellation Procedure
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

-- ----------------------------------------------------------------------------
-- 8. SEED DATA (LUXURY SUITES CATALOG)
-- ----------------------------------------------------------------------------
INSERT INTO public.rooms (id, room_number, room_type, floor, price_per_night, capacity, status, amenities, image_url, description)
VALUES
(
    'a1111111-1111-1111-1111-111111111101',
    '101',
    'Deluxe Ocean View',
    1,
    280.00,
    2,
    'AVAILABLE',
    '["King Bed", "Ocean Balcony", "Espresso Machine", "Rain Shower", "High-speed Wi-Fi", "4K Smart TV"]'::jsonb,
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    'Panoramic ocean vistas from an expansive private terrace with custom Italian marble bathroom.'
),
(
    'a1111111-1111-1111-1111-111111111102',
    '102',
    'Executive Garden Suite',
    1,
    340.00,
    3,
    'AVAILABLE',
    '["King Bed", "Private Zen Garden", "Soaking Tub", "Lounge Area", "Butler Service", "Complimentary Mini-Bar"]'::jsonb,
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
    'Serene ground-level suite opening onto a private courtyard garden with hand-crafted teak furniture.'
),
(
    'a1111111-1111-1111-1111-111111111201',
    '201',
    'Presidential Horizon Penthouse',
    2,
    650.00,
    4,
    'AVAILABLE',
    '["Two Master Bedrooms", "Private Plunge Pool", "Dining Room for 6", "Sub-Zero Wine Cellar", "24/7 Butler", "Bang & Olufsen Audio"]'::jsonb,
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    'The pinnacle of coastal luxury featuring 360-degree shoreline panoramas and a private rooftop plunge pool.'
),
(
    'a1111111-1111-1111-1111-111111111202',
    '202',
    'Azure Sunset Villa Room',
    2,
    310.00,
    2,
    'OCCUPIED',
    '["King Bed", "Sunset Terrace", "Whirlpool Jacuzzi", "Walk-in Wardrobe", "Nespresso Atelier"]'::jsonb,
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    'West-facing sanctuary designed to capture golden sunset hues over the turquoise cove.'
),
(
    'a1111111-1111-1111-1111-111111111301',
    '301',
    'Skyline Grand King',
    3,
    240.00,
    2,
    'CLEANING',
    '["Plush King Bed", "Floor-to-Ceiling Glass", "Aromatherapy Diffuser", "Dyson Supersonic", "Smart Climate Control"]'::jsonb,
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
    'Sleek contemporary design with sweeping city skyline and harbor views.'
),
(
    'a1111111-1111-1111-1111-111111111302',
    '302',
    'Royal Heritage Chamber',
    3,
    390.00,
    2,
    'MAINTENANCE',
    '["Handcrafted Canopy Bed", "Fireplace", "Hermes Bath Amenities", "Library Alcove", "Chauffeur Service"]'::jsonb,
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    'Rich mahogany finishes and authentic historical accents paired with modern state-of-the-art comforts.'
)
ON CONFLICT (room_number) DO NOTHING;

-- Seed Default Profiles for Staff & Guests
INSERT INTO public.profiles (id, email, full_name, role)
VALUES
('00000000-0000-0000-0000-000000000001', 'admin@hotel.com', 'Grand Azure Admin', 'ADMIN'),
('00000000-0000-0000-0000-000000000002', 'reception@hotel.com', 'Clara Vance', 'RECEPTIONIST'),
('00000000-0000-0000-0000-000000000003', 'housekeeping@hotel.com', 'Mateo Silva', 'HOUSEKEEPING')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 9. NATIVE PG_CRON SCHEDULER ACTIVATION
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        PERFORM cron.unschedule('hourly-24h-unpaid-cancellation-check')
        FROM cron.job
        WHERE jobname = 'hourly-24h-unpaid-cancellation-check';
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

SELECT cron.schedule(
    'hourly-24h-unpaid-cancellation-check',
    '0 * * * *',
    $$SELECT public.auto_cancel_unpaid_bookings();$$
);

SELECT 'GRAND AZURE HOTEL DATABASE INITIALIZED SUCCESSFULLY!' as status;
