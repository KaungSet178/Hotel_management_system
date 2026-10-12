-- ============================================================================
-- Migration: 20261012_006_strict_row_level_security.sql
-- Description: Comprehensive Row Level Security (RLS) Policies for StayFlow
-- ============================================================================

-- 1. Helper function for role lookup that avoids RLS infinite recursion
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
DECLARE
    u_role text;
BEGIN
    SELECT role::text INTO u_role FROM public.profiles WHERE id = auth.uid();
    RETURN COALESCE(u_role, 'GUEST');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Ensure RLS is active on all core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES POLICIES
-- Guests can only view and update their own profile; Staff/Admin can view all.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id 
        OR current_user_role() IN ('ADMIN', 'RECEPTIONIST')
    );

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id 
        OR current_user_role() IN ('ADMIN', 'RECEPTIONIST')
    );

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id 
        OR current_user_role() = 'ADMIN'
    );

-- ----------------------------------------------------------------------------
-- ROOMS POLICIES
-- Anyone can browse rooms; only Staff and Admin can modify room status or details.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can browse rooms" ON public.rooms;
DROP POLICY IF EXISTS "rooms_select_policy" ON public.rooms;

CREATE POLICY "rooms_select_policy" ON public.rooms
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff and admin can modify rooms" ON public.rooms;
DROP POLICY IF EXISTS "rooms_modify_policy" ON public.rooms;

CREATE POLICY "rooms_modify_policy" ON public.rooms
    FOR ALL USING (
        current_user_role() IN ('ADMIN', 'RECEPTIONIST', 'HOUSEKEEPING')
    );

-- ----------------------------------------------------------------------------
-- BOOKINGS POLICIES
-- Guests can view only their own bookings; Staff and Admin can view all.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Guests can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Guests view own bookings or Staff/Admin view all" ON public.bookings;
DROP POLICY IF EXISTS "bookings_select_policy" ON public.bookings;

CREATE POLICY "bookings_select_policy" ON public.bookings
    FOR SELECT USING (
        auth.uid() = guest_id 
        OR current_user_role() IN ('ADMIN', 'RECEPTIONIST')
    );

DROP POLICY IF EXISTS "Guests can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Guests create bookings" ON public.bookings;
DROP POLICY IF EXISTS "bookings_insert_policy" ON public.bookings;

CREATE POLICY "bookings_insert_policy" ON public.bookings
    FOR INSERT WITH CHECK (
        auth.uid() = guest_id 
        OR current_user_role() IN ('ADMIN', 'RECEPTIONIST')
        OR auth.uid() IS NULL -- Allows server-side SECURITY DEFINER atomic procedures
    );

DROP POLICY IF EXISTS "Staff and Admin update bookings" ON public.bookings;
DROP POLICY IF EXISTS "bookings_update_policy" ON public.bookings;

CREATE POLICY "bookings_update_policy" ON public.bookings
    FOR UPDATE USING (
        auth.uid() = guest_id 
        OR current_user_role() IN ('ADMIN', 'RECEPTIONIST')
    );

DROP POLICY IF EXISTS "bookings_delete_policy" ON public.bookings;

CREATE POLICY "bookings_delete_policy" ON public.bookings
    FOR DELETE USING (
        current_user_role() = 'ADMIN'
    );

-- ----------------------------------------------------------------------------
-- ROOM SERVICE REQUESTS POLICIES
-- Guests can only view and create requests for their own active bookings.
-- Staff can view all and update request status.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view service requests" ON public.room_service_requests;
DROP POLICY IF EXISTS "Guests view own service requests; Staff view all" ON public.room_service_requests;
DROP POLICY IF EXISTS "service_requests_select_policy" ON public.room_service_requests;

CREATE POLICY "service_requests_select_policy" ON public.room_service_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = room_service_requests.booking_id AND b.guest_id = auth.uid()
        )
        OR current_user_role() IN ('ADMIN', 'HOUSEKEEPING', 'RECEPTIONIST')
    );

DROP POLICY IF EXISTS "Guests can create service requests" ON public.room_service_requests;
DROP POLICY IF EXISTS "Guests and Staff create service requests" ON public.room_service_requests;
DROP POLICY IF EXISTS "service_requests_insert_policy" ON public.room_service_requests;

CREATE POLICY "service_requests_insert_policy" ON public.room_service_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = room_service_requests.booking_id AND b.guest_id = auth.uid()
        )
        OR current_user_role() IN ('ADMIN', 'HOUSEKEEPING', 'RECEPTIONIST')
    );

DROP POLICY IF EXISTS "Staff can update service requests" ON public.room_service_requests;
DROP POLICY IF EXISTS "Staff update service requests" ON public.room_service_requests;
DROP POLICY IF EXISTS "service_requests_update_policy" ON public.room_service_requests;

CREATE POLICY "service_requests_update_policy" ON public.room_service_requests
    FOR UPDATE USING (
        current_user_role() IN ('ADMIN', 'HOUSEKEEPING', 'RECEPTIONIST')
    );

-- ----------------------------------------------------------------------------
-- DESTINATIONS & HOTELS POLICIES
-- Public read for catalog exploration; modification restricted to Admin.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read destinations" ON public.destinations;
DROP POLICY IF EXISTS "destinations_select_policy" ON public.destinations;

CREATE POLICY "destinations_select_policy" ON public.destinations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "destinations_modify_policy" ON public.destinations;

CREATE POLICY "destinations_modify_policy" ON public.destinations
    FOR ALL USING (current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "Public read hotels" ON public.hotels;
DROP POLICY IF EXISTS "hotels_select_policy" ON public.hotels;

CREATE POLICY "hotels_select_policy" ON public.hotels
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "hotels_modify_policy" ON public.hotels;

CREATE POLICY "hotels_modify_policy" ON public.hotels
    FOR ALL USING (current_user_role() = 'ADMIN');

-- ----------------------------------------------------------------------------
-- AUDIT LOGS POLICIES
-- Read access restricted to Admin; inserts permitted for system logging.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;

CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT USING (current_user_role() = 'ADMIN');

DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;

CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
    FOR INSERT WITH CHECK (true);
