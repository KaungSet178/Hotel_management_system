-- ============================================================================
-- HOTEL MANAGEMENT SYSTEM: INITIAL SCHEMA & RLS
-- Migration: 20261010_001_initial_schema.sql
-- ============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Enumerated Types
CREATE TYPE user_role AS ENUM ('GUEST', 'RECEPTIONIST', 'HOUSEKEEPING', 'ADMIN');
CREATE TYPE room_status AS ENUM ('AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE');
CREATE TYPE payment_method AS ENUM ('ONLINE', 'PAY_AT_HOTEL');
CREATE TYPE payment_status AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED');
CREATE TYPE booking_status AS ENUM ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'EXPIRED');
CREATE TYPE service_category AS ENUM ('TOWELS', 'CLEANING', 'MAINTENANCE', 'FOOD_BEVERAGE', 'AMENITIES', 'OTHER');
CREATE TYPE service_priority AS ENUM ('LOW', 'NORMAL', 'URGENT');
CREATE TYPE service_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- 3. Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'GUEST',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Rooms table
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

-- 5. Bookings table
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
    qr_token TEXT UNIQUE NOT NULL,
    checked_in_at TIMESTAMPTZ,
    checked_out_at TIMESTAMPTZ,
    auto_cancel_at TIMESTAMPTZ, -- For 24-hr cancellation policy on unconfirmed/unpaid Pay-At-Hotel bookings
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_dates_valid CHECK (check_out_date > check_in_date)
);

-- 6. In-Room Service Requests (Real-time enabled)
CREATE TABLE IF NOT EXISTS public.room_service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    guest_name TEXT NOT NULL,
    category service_category NOT NULL DEFAULT 'TOWELS',
    details TEXT NOT NULL,
    priority service_priority NOT NULL DEFAULT 'NORMAL',
    status service_status NOT NULL DEFAULT 'PENDING',
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Indexes for High-Traffic Queries & Fast Booking Checks
CREATE INDEX IF NOT EXISTS idx_bookings_dates_room ON public.bookings (room_id, check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_qr_token ON public.bookings (qr_token);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_auto_cancel ON public.bookings (auto_cancel_at, payment_status, booking_status);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.room_service_requests (status, priority);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms (status);

-- 9. Row Level Security (RLS) Setup
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role from profiles
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
BEGIN
    RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Profiles Policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR current_user_role() IN ('ADMIN', 'RECEPTIONIST'));

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Rooms Policies (Public can view rooms, Staff/Admin can manage)
CREATE POLICY "Anyone can browse rooms"
    ON public.rooms FOR SELECT
    USING (true);

CREATE POLICY "Staff and admin can modify rooms"
    ON public.rooms FOR ALL
    USING (current_user_role() IN ('ADMIN', 'RECEPTIONIST', 'HOUSEKEEPING'));

-- Bookings Policies
CREATE POLICY "Guests view own bookings or Staff/Admin view all"
    ON public.bookings FOR SELECT
    USING (
        auth.uid() = guest_id 
        OR current_user_role() IN ('ADMIN', 'RECEPTIONIST')
    );

CREATE POLICY "Guests create bookings"
    ON public.bookings FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Staff and Admin update bookings"
    ON public.bookings FOR UPDATE
    USING (current_user_role() IN ('ADMIN', 'RECEPTIONIST'));

-- Service Requests Policies
CREATE POLICY "Guests view own service requests; Staff view all"
    ON public.room_service_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = room_service_requests.booking_id AND b.guest_id = auth.uid()
        )
        OR current_user_role() IN ('ADMIN', 'HOUSEKEEPING', 'RECEPTIONIST')
    );

CREATE POLICY "Guests and Staff create service requests"
    ON public.room_service_requests FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Staff update service requests"
    ON public.room_service_requests FOR UPDATE
    USING (current_user_role() IN ('ADMIN', 'HOUSEKEEPING', 'RECEPTIONIST'));

-- 10. Enable Supabase Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_service_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
