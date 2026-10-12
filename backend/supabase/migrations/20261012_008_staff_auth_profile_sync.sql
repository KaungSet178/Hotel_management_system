-- ============================================================================
-- Migration: 20261012_008_staff_auth_profile_sync.sql
-- Description:
--   1. Ensures staff & admin roles are cleanly synchronized from auth.users into public.profiles.
--   2. Supports role provisioning via raw_user_meta_data->>'role' or email heuristics.
--   3. Handles conflict resolution and re-linking for pre-existing placeholder emails.
-- ============================================================================

-- 1. Upgrade handle_new_user() trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_full_name TEXT;
    v_role public.user_role;
    v_meta_role TEXT;
    v_existing_id UUID;
BEGIN
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'Staff Member'
    );

    -- Extract role from metadata if specified
    v_meta_role := COALESCE(
        NEW.raw_user_meta_data->>'role',
        NEW.raw_app_meta_data->>'role'
    );

    IF v_meta_role IS NOT NULL AND v_meta_role IN ('ADMIN', 'RECEPTIONIST', 'HOUSEKEEPING', 'GUEST') THEN
        v_role := v_meta_role::public.user_role;
    ELSIF LOWER(NEW.email) LIKE '%admin%' THEN
        v_role := 'ADMIN'::public.user_role;
    ELSIF LOWER(NEW.email) LIKE '%reception%' THEN
        v_role := 'RECEPTIONIST'::public.user_role;
    ELSIF LOWER(NEW.email) LIKE '%housekeeping%' THEN
        v_role := 'HOUSEKEEPING'::public.user_role;
    ELSE
        v_role := 'GUEST'::public.user_role;
    END IF;

    -- Check if a profile with this email already exists
    SELECT id INTO v_existing_id
    FROM public.profiles
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email))
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
        -- If existing ID differs from NEW.id, update the existing row to point to NEW.id
        UPDATE public.profiles
        SET id = NEW.id,
            full_name = COALESCE(v_full_name, full_name),
            role = COALESCE(v_role, role),
            updated_at = NOW()
        WHERE id = v_existing_id;
    ELSE
        -- Insert new profile row linked to auth.users.id
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
            v_role,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
            role = COALESCE(EXCLUDED.role, public.profiles.role),
            updated_at = NOW();
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Fallback: Ensure trigger never blocks user creation in auth.users
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Re-attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
