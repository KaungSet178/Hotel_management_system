-- Migration: 20261014_010_auto_room_status_sync_trigger.sql
-- Description: Automatic synchronization triggers ensuring room status stays 100% consistent with bookings

-- 1. Function to synchronize a room's status based on active bookings
CREATE OR REPLACE FUNCTION public.sync_room_occupancy_status()
RETURNS TRIGGER AS $$
DECLARE
    v_room_id UUID;
    v_has_checked_in BOOLEAN;
    v_has_confirmed BOOLEAN;
BEGIN
    -- Determine which room_id to evaluate
    IF (TG_OP = 'DELETE') THEN
        v_room_id := OLD.room_id;
    ELSE
        v_room_id := NEW.room_id;
    END IF;

    IF v_room_id IS NOT NULL THEN
        -- Check if any active checked-in booking exists for this room
        SELECT EXISTS (
            SELECT 1 FROM public.bookings
            WHERE room_id = v_room_id
              AND booking_status = 'CHECKED_IN'
        ) INTO v_has_checked_in;

        -- Check if any active confirmed reservation exists for this room
        SELECT EXISTS (
            SELECT 1 FROM public.bookings
            WHERE room_id = v_room_id
              AND booking_status = 'CONFIRMED'
        ) INTO v_has_confirmed;

        -- Update rooms table status accordingly
        IF v_has_checked_in THEN
            UPDATE public.rooms
            SET status = 'OCCUPIED', updated_at = NOW()
            WHERE id = v_room_id AND status != 'OCCUPIED';
        ELSIF v_has_confirmed THEN
            UPDATE public.rooms
            SET status = 'RESERVED', updated_at = NOW()
            WHERE id = v_room_id AND status != 'RESERVED';
        ELSE
            UPDATE public.rooms
            SET status = 'AVAILABLE', updated_at = NOW()
            WHERE id = v_room_id AND status != 'AVAILABLE';
        END IF;
    END IF;

    -- Also check OLD room_id if room_id changed during an update
    IF (TG_OP = 'UPDATE' AND OLD.room_id IS DISTINCT FROM NEW.room_id AND OLD.room_id IS NOT NULL) THEN
        SELECT EXISTS (
            SELECT 1 FROM public.bookings
            WHERE room_id = OLD.room_id
              AND booking_status = 'CHECKED_IN'
        ) INTO v_has_checked_in;

        SELECT EXISTS (
            SELECT 1 FROM public.bookings
            WHERE room_id = OLD.room_id
              AND booking_status = 'CONFIRMED'
        ) INTO v_has_confirmed;

        IF v_has_checked_in THEN
            UPDATE public.rooms
            SET status = 'OCCUPIED', updated_at = NOW()
            WHERE id = OLD.room_id AND status != 'OCCUPIED';
        ELSIF v_has_confirmed THEN
            UPDATE public.rooms
            SET status = 'RESERVED', updated_at = NOW()
            WHERE id = OLD.room_id AND status != 'RESERVED';
        ELSE
            UPDATE public.rooms
            SET status = 'AVAILABLE', updated_at = NOW()
            WHERE id = OLD.room_id AND status != 'AVAILABLE';
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop trigger if already exists and recreate
DROP TRIGGER IF EXISTS trg_sync_room_occupancy ON public.bookings;

CREATE TRIGGER trg_sync_room_occupancy
AFTER INSERT OR UPDATE OF booking_status, room_id OR DELETE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.sync_room_occupancy_status();
