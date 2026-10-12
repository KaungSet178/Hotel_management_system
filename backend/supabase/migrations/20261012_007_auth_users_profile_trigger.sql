-- ============================================================================
-- Migration: 20261012_007_auth_users_profile_trigger.sql
-- Description:
--   1. Automatically syncs auth.users into public.profiles upon signup/login.
--   2. Ensures public.profiles contains matching UUIDs for foreign key integrity
--      on public.bookings.guest_id (preventing bookings_guest_id_fkey violation).
--   3. Synchronizes existing orphaned auth.users into public.profiles.
-- ============================================================================

-- 1. Create or replace the handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name TEXT;
BEGIN
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'Guest'
    );

    -- Insert or update profile row linked to auth.users.id
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        LOWER(TRIM(NEW.email)),
        v_full_name,
        'GUEST',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach trigger to auth.users (runs on new account creation)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill any existing users in auth.users that are not yet in public.profiles
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
    u.id,
    LOWER(TRIM(u.email)),
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(u.email, '@', 1), 'Guest'),
    'GUEST'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
