-- ============================================================================
-- HOTEL MANAGEMENT SYSTEM: CUSTOMER FRONTEND (STAYEASE) SUPPORT MIGRATION
-- Migration: 20261011_005_customer_frontend_support.sql
-- ============================================================================
-- Purpose:
-- 1. Extend custom ENUM types for payment methods, payment statuses, and booking states.
-- 2. Create 'destinations' and 'hotels' catalog tables.
-- 3. Enhance 'rooms' table with slugs, hotel associations, galleries, and specifications.
-- 4. Enhance 'bookings' table with 4-digit Folio PINs, draft keys, itemized prices,
--    preferences, and payment proof slip storage.
-- 5. Enhance 'room_service_requests' with delivery times and reservation references.
-- 6. Upgrade 'book_room_atomic' PostgreSQL stored procedure with concurrency support
--    for PENDING bookings and new customer attributes.
-- 7. Seed destination and hotel property catalogs with StayEase luxury profiles.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND ENUM TYPES
-- ----------------------------------------------------------------------------

-- Add payment methods used by customer frontend
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'KBZPAY';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'WAVEPAY';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'CB_PAY';
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'CARD';

-- Add payment statuses
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'AWAITING_REVIEW';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'SETTLED';

-- Add booking statuses
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE public.booking_status ADD VALUE IF NOT EXISTS 'NO_SHOW';

-- Add service request statuses
ALTER TYPE public.service_status ADD VALUE IF NOT EXISTS 'ASSIGNED';
ALTER TYPE public.service_status ADD VALUE IF NOT EXISTS 'IN_TRANSIT';

-- ----------------------------------------------------------------------------
-- 2. CREATE DESTINATIONS & HOTELS TABLES
-- ----------------------------------------------------------------------------

-- Destinations Table
CREATE TABLE IF NOT EXISTS public.destinations (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    hotel_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hotels Table
CREATE TABLE IF NOT EXISTS public.hotels (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    address JSONB NOT NULL DEFAULT '{}'::jsonb,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    hero_image TEXT,
    gallery JSONB DEFAULT '[]'::jsonb,
    facilities JSONB DEFAULT '[]'::jsonb,
    check_in_time TEXT DEFAULT 'From 14:00',
    check_out_time TEXT DEFAULT 'Until 12:00',
    hotline TEXT,
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. ENHANCE ROOMS TABLE
-- ----------------------------------------------------------------------------
ALTER TABLE public.rooms
    ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS hotel_id TEXT REFERENCES public.hotels(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Deluxe',
    ADD COLUMN IF NOT EXISTS wing TEXT,
    ADD COLUMN IF NOT EXISTS floor_range TEXT,
    ADD COLUMN IF NOT EXISTS bed_configuration TEXT DEFAULT '1 King Bed',
    ADD COLUMN IF NOT EXISTS area_sqm INTEGER DEFAULT 40,
    ADD COLUMN IF NOT EXISTS gallery JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 4.9,
    ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS inventory INTEGER DEFAULT 5,
    ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- ----------------------------------------------------------------------------
-- 4. ENHANCE BOOKINGS TABLE
-- ----------------------------------------------------------------------------
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS folio_id TEXT,
    ADD COLUMN IF NOT EXISTS pin TEXT,
    ADD COLUMN IF NOT EXISTS draft_key TEXT,
    ADD COLUMN IF NOT EXISTS adults INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS rooms_count INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS rate_plan_id TEXT DEFAULT 'flexible',
    ADD COLUMN IF NOT EXISTS add_ons JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS price_breakdown JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS guest_preferences JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS special_notes TEXT,
    ADD COLUMN IF NOT EXISTS payment_proof JSONB,
    ADD COLUMN IF NOT EXISTS transaction_id TEXT,
    ADD COLUMN IF NOT EXISTS cancel_refund_amount NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- ----------------------------------------------------------------------------
-- 5. ENHANCE ROOM SERVICE REQUESTS TABLE
-- ----------------------------------------------------------------------------
ALTER TABLE public.room_service_requests
    ADD COLUMN IF NOT EXISTS delivery_time TEXT,
    ADD COLUMN IF NOT EXISTS category_label TEXT,
    ADD COLUMN IF NOT EXISTS reservation_reference TEXT;

-- ----------------------------------------------------------------------------
-- 6. PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_pin ON public.bookings(pin);
CREATE INDEX IF NOT EXISTS idx_bookings_draft_key ON public.bookings(draft_key);
CREATE INDEX IF NOT EXISTS idx_bookings_folio_id ON public.bookings(folio_id);
CREATE INDEX IF NOT EXISTS idx_rooms_slug ON public.rooms(slug);
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON public.rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotels_slug ON public.hotels(slug);

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) FOR NEW CATALOG TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Public read destinations"
        ON public.destinations FOR SELECT
        USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Public read hotels"
        ON public.hotels FOR SELECT
        USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enable Realtime for hotels and destinations
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.destinations;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.hotels;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- 8. UPGRADED ATOMIC BOOKING STORED PROCEDURE
-- ----------------------------------------------------------------------------
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
    p_booking_reference TEXT,
    p_folio_id TEXT DEFAULT NULL,
    p_pin TEXT DEFAULT NULL,
    p_draft_key TEXT DEFAULT NULL,
    p_adults INTEGER DEFAULT 2,
    p_rooms_count INTEGER DEFAULT 1,
    p_rate_plan_id TEXT DEFAULT 'flexible',
    p_add_ons JSONB DEFAULT '[]'::jsonb,
    p_price_breakdown JSONB DEFAULT '{}'::jsonb,
    p_guest_preferences JSONB DEFAULT '{}'::jsonb,
    p_special_notes TEXT DEFAULT NULL,
    p_payment_proof JSONB DEFAULT NULL,
    p_booking_status public.booking_status DEFAULT 'CONFIRMED'
)
RETURNS JSONB AS $$
DECLARE
    v_room RECORD;
    v_conflict_count INTEGER;
    v_new_booking_id UUID;
    v_auto_cancel_at TIMESTAMPTZ := NULL;
    v_effective_status public.booking_status := p_booking_status;
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

    -- 2. Verify date overlap against CONFIRMED, CHECKED_IN, or PENDING bookings
    SELECT COUNT(*) INTO v_conflict_count
    FROM public.bookings
    WHERE room_id = p_room_id
      AND booking_status IN ('CONFIRMED', 'CHECKED_IN', 'PENDING')
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

    -- 3. Compute 24-hour hold window for Pay-at-Hotel or Pending bookings
    IF (p_payment_method = 'PAY_AT_HOTEL' OR p_payment_status IN ('PENDING', 'AWAITING_REVIEW')) THEN
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
        folio_id,
        pin,
        draft_key,
        adults,
        rooms_count,
        rate_plan_id,
        add_ons,
        price_breakdown,
        guest_preferences,
        special_notes,
        payment_proof
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
        v_effective_status,
        p_qr_token,
        v_auto_cancel_at,
        p_folio_id,
        p_pin,
        p_draft_key,
        p_adults,
        p_rooms_count,
        p_rate_plan_id,
        p_add_ons,
        p_price_breakdown,
        p_guest_preferences,
        p_special_notes,
        p_payment_proof
    )
    RETURNING id INTO v_new_booking_id;

    -- 5. Return success payload
    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_new_booking_id,
        'booking_reference', p_booking_reference,
        'room_number', v_room.room_number,
        'room_type', v_room.room_type,
        'check_in_date', p_check_in,
        'check_out_date', p_check_out,
        'total_amount', p_total_amount,
        'payment_status', p_payment_status,
        'booking_status', v_effective_status,
        'qr_token', p_qr_token,
        'folio_id', p_folio_id,
        'pin', p_pin,
        'auto_cancel_at', v_auto_cancel_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 9. SEED DESTINATIONS & HOTELS
-- ----------------------------------------------------------------------------

-- Seed Destinations
INSERT INTO public.destinations (id, label, hotel_ids)
VALUES
    ('yangon-heritage', 'Yangon · Heritage Quarter', '["yangon-riverside"]'::jsonb),
    ('yangon-central', 'Yangon · Downtown Central', '["downtown-central"]'::jsonb),
    ('inle-lake', 'Inle Lake · Shan State', '["inle-lake"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    hotel_ids = EXCLUDED.hotel_ids,
    updated_at = NOW();

-- Seed Hotels
INSERT INTO public.hotels (
    id, slug, name, tagline, description, address, rating, review_count,
    hero_image, gallery, facilities, check_in_time, check_out_time, hotline, featured
)
VALUES
(
    'yangon-riverside',
    'yangon-riverside',
    'StayEase Yangon Riverside',
    'Colonial prestige above the Yangon River corridor',
    'Perched on Strand Road within our signature Heritage Quarter, StayEase Yangon Riverside blends quiet colonial prestige with ultra-modern maritime tranquility. Quarter-sawn teak millwork, bespoke woven silk textiles and double-glazed acoustic glass frame sunrise views across the water.',
    '{
        "line1": "No. 84 Strand Road",
        "line2": "Heritage Quarter",
        "city": "Yangon",
        "region": "Yangon Region",
        "country": "Myanmar"
    }'::jsonb,
    4.9,
    240,
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80',
    '[
        {"src": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80", "alt": "Infinity pool overlooking the Yangon river"},
        {"src": "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80", "alt": "Heritage lobby with teak millwork"},
        {"src": "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80", "alt": "Deluxe Azure Suite living area"}
    ]'::jsonb,
    '["Smart QR Express Check-in", "Outdoor & infinity pool", "Private hydro-lounge", "Heritage spa & wellness", "Executive lounge", "1 Gbps Wi-Fi 6", "Airport limousine service", "24/7 concierge & butler"]'::jsonb,
    'From 14:00',
    'Until 12:00',
    '+95 1 230 4567',
    TRUE
),
(
    'downtown-central',
    'downtown-central',
    'StayEase Downtown Central',
    'Smart urban stays in the beating heart of Yangon',
    'Steps from Sule Pagoda and the modern business district, Downtown Central pairs StayEase’s zero-waiting-time smart hospitality with high-performance workspaces, city-view studios and a vibrant breakfast social.',
    '{
        "line1": "No. 128 Sule Pagoda Road",
        "line2": "Downtown",
        "city": "Yangon",
        "region": "Yangon Region",
        "country": "Myanmar"
    }'::jsonb,
    4.8,
    310,
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80',
    '[
        {"src": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80", "alt": "Modern Downtown Central tower"},
        {"src": "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80", "alt": "Urban Superior Studio"}
    ]'::jsonb,
    '["Smart QR Express Check-in", "Free buffet breakfast", "Executive workstations", "500 Mbps secure Wi-Fi", "City-view gym", "24/7 front desk"]'::jsonb,
    'From 14:00',
    'Until 12:00',
    '+95 1 230 4567',
    FALSE
),
(
    'inle-lake',
    'inle-lake',
    'StayEase Inle Lake Sanctuary',
    'Private garden villas above the Stilt-house waters',
    'Floating over the tranquil shallows of Inle Lake in Shan State, the Sanctuary is our most intimate residence. Executive garden villas with private plunge pools face the dawn across the water, while the spa and dining pavilion draw on local artisan traditions.',
    '{
        "line1": "Inle Lake Shoreline",
        "line2": "Nyaungshwe",
        "city": "Nyaungshwe",
        "region": "Shan State",
        "country": "Myanmar"
    }'::jsonb,
    5.0,
    180,
    'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=80',
    '[
        {"src": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80", "alt": "Calm waters of Inle Lake at dawn"},
        {"src": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80", "alt": "Garden villa private plunge pool"}
    ]'::jsonb,
    '["Private plunge pools", "Lakeside spa pavilion", "Smart QR Express Check-in", "Boat transfers & charters", "Organic dining", "High-speed Wi-Fi", "24/7 concierge"]'::jsonb,
    'From 14:00',
    'Until 12:00',
    '+95 1 230 4567',
    FALSE
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tagline = EXCLUDED.tagline,
    description = EXCLUDED.description,
    address = EXCLUDED.address,
    rating = EXCLUDED.rating,
    review_count = EXCLUDED.review_count,
    hero_image = EXCLUDED.hero_image,
    gallery = EXCLUDED.gallery,
    facilities = EXCLUDED.facilities,
    hotline = EXCLUDED.hotline,
    featured = EXCLUDED.featured,
    updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 10. LINK EXISTING SEED ROOMS TO HOTELS & ADD SLUGS
-- ----------------------------------------------------------------------------

-- Room 101 -> Deluxe Ocean View / Deluxe Azure Suite
UPDATE public.rooms SET
    slug = 'deluxe-azure-suite',
    hotel_id = 'yangon-riverside',
    category = 'Deluxe',
    wing = 'Heritage Garden Level',
    floor_range = 'Rooms #304–308',
    bed_configuration = '1 King Bed',
    area_sqm = 42,
    rating = 4.9,
    review_count = 142,
    inventory = 5,
    tags = '["Recommended", "Best Value"]'::jsonb,
    gallery = '[
        {"src": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80", "alt": "Deluxe Azure Suite — king bedroom"},
        {"src": "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80", "alt": "Rainfall shower ensuite"}
    ]'::jsonb
WHERE room_number = '101' OR id = 'a1111111-1111-1111-1111-111111111101';

-- Room 102 -> Executive Garden Suite
UPDATE public.rooms SET
    slug = 'executive-ocean-suite',
    hotel_id = 'yangon-riverside',
    category = 'Executive',
    wing = 'Top Floor Executive Tier',
    floor_range = 'Rooms #701–704',
    bed_configuration = '1 King Bed',
    area_sqm = 65,
    rating = 5.0,
    review_count = 98,
    inventory = 4,
    tags = '["Top Floor", "Executive Lounge"]'::jsonb,
    gallery = '[
        {"src": "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80", "alt": "Executive Ocean Panorama Suite"},
        {"src": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80", "alt": "Private terrace view"}
    ]'::jsonb
WHERE room_number = '102' OR id = 'a1111111-1111-1111-1111-111111111102';

-- Room 201 -> Presidential Garden Villa
UPDATE public.rooms SET
    slug = 'presidential-garden-villa',
    hotel_id = 'yangon-riverside',
    category = 'Villa',
    wing = 'Private Villa Enclave',
    floor_range = 'Villa 01',
    bed_configuration = '2 King Beds',
    area_sqm = 95,
    rating = 5.0,
    review_count = 64,
    inventory = 1,
    tags = '["Signature", "Private Butler"]'::jsonb,
    gallery = '[
        {"src": "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80", "alt": "Presidential Garden Villa plunge pool"},
        {"src": "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80", "alt": "King master bedroom"}
    ]'::jsonb
WHERE room_number = '201' OR id = 'a1111111-1111-1111-1111-111111111201';

-- Room 202 -> Azure Sunset Villa / Signature Villa
UPDATE public.rooms SET
    slug = 'signature-villa',
    hotel_id = 'yangon-riverside',
    category = 'Villa',
    wing = 'Privilege Wing',
    floor_range = 'Villa 02',
    bed_configuration = 'King + Daybed',
    area_sqm = 52,
    rating = 4.9,
    review_count = 180,
    inventory = 2,
    tags = '["High Value", "Sunset View"]'::jsonb,
    gallery = '[
        {"src": "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80", "alt": "Signature Villa living space"}
    ]'::jsonb
WHERE room_number = '202' OR id = 'a1111111-1111-1111-1111-111111111202';

-- Room 301 -> Superior Urban Studio (Downtown Central)
UPDATE public.rooms SET
    slug = 'urban-studio',
    hotel_id = 'downtown-central',
    category = 'Studio',
    wing = 'Smart Living Floors',
    floor_range = 'Rooms #201–215',
    bed_configuration = '1 Queen Bed',
    area_sqm = 24,
    rating = 4.8,
    review_count = 310,
    inventory = 15,
    tags = '["Best Value", "City View"]'::jsonb,
    gallery = '[
        {"src": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80", "alt": "Superior Urban Studio"}
    ]'::jsonb
WHERE room_number = '301' OR id = 'a1111111-1111-1111-1111-111111111301';

-- Room 302 -> Executive Garden Villa (Inle Lake)
UPDATE public.rooms SET
    slug = 'executive-garden-villa',
    hotel_id = 'inle-lake',
    category = 'Villa',
    wing = 'Lakeside Garden',
    floor_range = 'Villas #11–18',
    bed_configuration = 'King + Daybed',
    area_sqm = 88,
    rating = 5.0,
    review_count = 180,
    inventory = 8,
    tags = '["Ocean View", "Lakeside Plunge Pool"]'::jsonb,
    gallery = '[
        {"src": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80", "alt": "Executive Garden Villa over Inle Lake"}
    ]'::jsonb
WHERE room_number = '302' OR id = 'a1111111-1111-1111-1111-111111111302';
