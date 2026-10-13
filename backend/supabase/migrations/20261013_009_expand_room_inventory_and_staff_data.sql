-- ============================================================================
-- Migration: 20261013_009_expand_room_inventory_and_staff_data.sql
-- Description:
--   1. Expands bookings table with channel (WALK_IN vs ONLINE), clerk_name, guest_nrc_passport.
--   2. Adds room_number column to room_service_requests.
--   3. Normalizes and expands public.rooms to 20 luxury suites with Myanmar Kyats (MMK) pricing.
--   4. Creates stored procedure verify_booking_payment_proof for receptionist slip approval.
--   5. Seeds sample active booking requests with payment proof slips and multi-month bookings.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTEND BOOKINGS & SERVICE REQUESTS TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'ONLINE',
    ADD COLUMN IF NOT EXISTS clerk_name TEXT,
    ADD COLUMN IF NOT EXISTS guest_nrc_passport TEXT;

ALTER TABLE public.room_service_requests
    ADD COLUMN IF NOT EXISTS room_number TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_channel ON public.bookings(channel);

-- ----------------------------------------------------------------------------
-- 2. POPULATE & NORMALIZE LUXURY ROOMS INVENTORY (MMK PRICING)
-- ----------------------------------------------------------------------------
INSERT INTO public.rooms (
    id,
    room_number,
    room_type,
    floor,
    price_per_night,
    capacity,
    status,
    amenities,
    image_url,
    description,
    slug,
    hotel_id,
    category,
    wing,
    floor_range,
    bed_configuration,
    area_sqm,
    rating,
    review_count,
    inventory,
    tags
) VALUES
-- Floor 1
(
    'a1111111-1111-1111-1111-111111111101',
    '101',
    'Deluxe Courtyard',
    1,
    165000.00,
    2,
    'AVAILABLE',
    '["Courtyard View", "Free High-Speed Wi-Fi", "Rain Shower", "4K Smart TV"]'::jsonb,
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    'Peaceful ground-floor courtyard retreat with lush colonial garden access.',
    'deluxe-courtyard-101',
    'yangon-riverside',
    'Deluxe',
    'Garden Wing',
    'Floor 1',
    '1 Queen Bed',
    31,
    4.8,
    110,
    1,
    '["Garden View", "Quiet"]'::jsonb
),
(
    'a1111111-1111-1111-1111-111111111102',
    '102',
    'Executive Garden Suite',
    1,
    340000.00,
    3,
    'MAINTENANCE',
    '["King Bed", "Private Zen Garden", "Soaking Tub", "Lounge Area", "Butler Service", "Complimentary Mini-Bar"]'::jsonb,
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
    'Serene ground-level suite opening onto a private courtyard garden with hand-crafted teak furniture.',
    'executive-ocean-suite',
    'yangon-riverside',
    'Executive',
    'Garden Wing',
    'Floor 1',
    '1 King Bed',
    45,
    5.0,
    98,
    1,
    '["Top Floor", "Executive Lounge"]'::jsonb
),
(
    'a1111111-1111-1111-1111-111111111106',
    '106',
    'Heritage Superior',
    1,
    175000.00,
    2,
    'AVAILABLE',
    '["Garden Terrace", "Free High-Speed Wi-Fi", "Espresso Machine"]'::jsonb,
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    'Classic colonial architecture combined with contemporary artisan finishes.',
    'heritage-superior-106',
    'yangon-riverside',
    'Heritage',
    'Garden Wing',
    'Floor 1',
    '1 Queen Bed',
    34,
    4.9,
    124,
    1,
    '["Garden Terrace", "Artisan"]'::jsonb
),
(
    'a1111111-1111-1111-1111-111111111110',
    '110',
    'Standard Twin',
    1,
    150000.00,
    2,
    'AVAILABLE',
    '["Free High-Speed Wi-Fi", "Twin Beds", "Work Desk"]'::jsonb,
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
    'Comfortable twin-bed configuration ideal for business travelers or friends.',
    'standard-twin-110',
    'yangon-riverside',
    'Standard',
    'East Corridor',
    'Floor 1',
    '2 Twin Beds',
    30,
    4.7,
    88,
    1,
    '["Twin Beds", "Value"]'::jsonb
),
(
    'a1111111-1111-1111-1111-111111111118',
    '118',
    'Deluxe Courtyard',
    1,
    165000.00,
    2,
    'OCCUPIED',
    '["Courtyard View", "Kettle & Drip Coffee", "Free High-Speed Wi-Fi"]'::jsonb,
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    'Quiet sanctuary along the East Corridor with courtyard ambiance.',
    'deluxe-courtyard-118',
    'yangon-riverside',
    'Deluxe',
    'East Corridor',
    'Floor 1',
    '2 Twin Beds',
    33,
    4.8,
    95,
    1,
    '["Courtyard"]'::jsonb
),

-- Floor 2
(
    'a1111111-1111-1111-1111-111111111201',
    '201',
    'Presidential Horizon Penthouse',
    2,
    650000.00,
    4,
    'AVAILABLE',
    '["Two Master Bedrooms", "Private Plunge Pool", "Dining Room for 6", "Sub-Zero Wine Cellar", "24/7 Butler"]'::jsonb,
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    'The pinnacle of coastal luxury featuring private plunge pool and 24/7 butler service.',
    'presidential-garden-villa',
    'yangon-riverside',
    'Villa',
    'Private Villa Enclave',
    'Floor 2',
    '2 King Beds',
    95,
    5.0,
    64,
    1,
    '["Signature", "Private Butler"]'::jsonb
),
(
    'a1111111-1111-1111-1111-111111111202',
    '202',
    'Azure Sunset Villa Room',
    2,
    310000.00,
    2,
    'AVAILABLE',
    '["King Bed", "Sunset Terrace", "Whirlpool Jacuzzi", "Walk-in Wardrobe", "Nespresso Atelier"]'::jsonb,
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    'West-facing sanctuary designed to capture golden sunset hues over the waterfront.',
    'signature-villa',
    'yangon-riverside',
    'Villa',
    'Privilege Wing',
    'Floor 2',
    'King + Daybed',
    52,
    4.9,
    180,
    1,
    '["High Value", "Sunset View"]'::jsonb
),
(
    'a1111111-1111-1111-1111-111111111208',
    '208',
    'Heritage Junior Suite',
    2,
    185000.00,
    2,
    'OCCUPIED',
    '["Courtyard View", "Free High-Speed Wi-Fi", "Kettle & Drip Coffee", "Marble Bath"]'::jsonb,
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    'Charming junior suite blending vintage colonial aesthetics with luxury bedding.',
    'heritage-junior-208',
    'yangon-riverside',
    'Heritage',
    'East Corridor',
    'Floor 2',
    '2 Twin Beds',
    38,
    4.9,
    140,
    1,
    '["Heritage", "East Wing"]'::jsonb
),
(
    'a1111111-1111-1111-1111-111111111215',
    '215',
    'Garden Balcony',
    2,
    190000.00,
    2,
    'AVAILABLE',
    '["Private Balcony", "Free High-Speed Wi-Fi", "Espresso Machine"]'::jsonb,
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
    'Balcony suite overlooking manicured botanical gardens.',
    'garden-balcony-215',
    'yangon-riverside',
    'Deluxe',
    'Garden Wing',
    'Floor 2',
    '1 King Bed',
    36,
    4.8,
    98,
    1,
    '["Balcony", "Garden View"]'::jsonb
),

-- Floor 3
(
    'a1111111-1111-1111-1111-111111111301',
    '301',
    'Skyline Grand King',
    3,
    240000.00,
    2,
    'CLEANING',
    '["Plush King Bed", "Floor-to-Ceiling Glass", "Aromatherapy Diffuser", "Dyson Supersonic"]'::jsonb,
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
    'Sleek contemporary design with sweeping city skyline and harbor views.',
    'urban-studio',
    'yangon-riverside',
    'Studio',
    'Smart Living Floors',
    'Floor 3',
    '1 Queen Bed',
    24,
    4.8,
    310,
    1,
    '["Best Value", "City View"]'::jsonb
),
(
    'a1111111-1111-1111-1111-111111111302',
    '302',
    'Royal Heritage Chamber',
    3,
    390000.00,
    2,
    'MAINTENANCE',
    '["Handcrafted Canopy Bed", "Fireplace", "Hermes Bath Amenities", "Library Alcove"]'::jsonb,
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    'Rich mahogany finishes and authentic historical accents paired with modern comforts.',
    'executive-garden-villa',
    'yangon-riverside',
    'Villa',
    'Lakeside Garden',
    'Floor 3',
    'King + Daybed',
    88,
    5.0,
    180,
    1,
    '["Heritage Chamber"]'::jsonb
),
(
    'a1111111-1111-1111-1111-111111111304',
    '304',
    'Deluxe Azure Suite',
    3,
    210000.00,
    2,
    'AVAILABLE',
    '["Garden Terrace", "Free High-Speed Wi-Fi", "Espresso Machine", "Rain Shower"]'::jsonb,
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    'Signature azure aesthetics with garden-facing terrace.',
    'deluxe-azure-suite-304',
    'yangon-riverside',
    'Deluxe',
    'Garden Wing',
    'Floor 3',
    '1 King Bed',
    40,
    4.9,
    155,
    1,
    '["Recommended", "Terrace"]'::jsonb
),
(
    'a1111111-1111-1111-1111-111111111306',
    '306',
    'Deluxe Azure Suite',
    3,
    220000.00,
    2,
    'AVAILABLE',
    '["Harbor View", "Free High-Speed Wi-Fi", "Breakfast Inc.", "Espresso Machine"]'::jsonb,
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
    'Prime harbor-facing suite on the 3rd floor with panoramic view.',
    'deluxe-azure-suite-306',
    'yangon-riverside',
    'Deluxe',
    'Sea Breeze Wing',
    'Floor 3',
    '1 King Bed',
    42,
    4.9,
    168,
    1,
    '["Harbor View", "Breakfast Inc."]'::jsonb
),
(
    'a1111111-1111-1111-1111-111111111308',
    '308',
    'Deluxe Azure Suite',
    3,
    210000.00,
    2,
    'OCCUPIED',
    '["Harbor View", "Free High-Speed Wi-Fi", "Rain Shower"]'::jsonb,
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    'Coastal light-filled suite overlooking the Yangon River promenade.',
    'deluxe-azure-suite-308',
    'yangon-riverside',
    'Deluxe',
    'Sea Breeze Wing',
    'Floor 3',
    '1 King Bed',
    40,
    4.9,
    132,
    1,
    '["River View"]'::jsonb
),

-- Floor 4
(
    'a1111111-1111-1111-1111-111111111402',
    '402',
    'Deluxe Azure Suite',
    4,
    220000.00,
    2,
    'OCCUPIED',
    '["Harbor View", "Free High-Speed Wi-Fi", "Breakfast Inc."]'::jsonb,
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
    'High-floor ocean breeze suite with expansive double balcony.',
    'deluxe-azure-suite-402',
    'yangon-riverside',
    'Deluxe',
    'Sea Breeze Wing',
    'Floor 4',
    '1 King Bed',
    41,
    4.9,
    145,
    1,
    '["High Floor", "Harbor View"]'::jsonb
),
(
    'a1111111-1111-1111-1111-111111111411',
    '411',
    'Executive Ocean Panorama',
    4,
    330000.00,
    2,
    'AVAILABLE',
    '["Ocean Panorama", "Free High-Speed Wi-Fi", "Strand Club Access"]'::jsonb,
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    'Panoramic ocean vista suite with evening cocktail lounge access.',
    'executive-ocean-411',
    'yangon-riverside',
    'Executive',
    'Penthouse Level',
    'Floor 4',
    '1 Super King',
    54,
    5.0,
    115,
    1,
    '["Club Access", "Panorama"]'::jsonb
),
(
    'a1111111-1111-1111-1111-111111111412',
    '412',
    'Executive Ocean Panorama',
    4,
    340000.00,
    2,
    'OCCUPIED',
    '["Ocean Panorama", "Free High-Speed Wi-Fi", "Breakfast Inc.", "Strand Club Access"]'::jsonb,
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    'Uninterrupted 180-degree ocean view suite at the penthouse boundary.',
    'executive-ocean-412',
    'yangon-riverside',
    'Executive',
    'Penthouse Level',
    'Floor 4',
    '1 Super King',
    56,
    5.0,
    178,
    1,
    '["VIP", "Ocean Panorama"]'::jsonb
),
(
    'a1111111-1111-1111-1111-111111111414',
    '414',
    'Executive Ocean Panorama',
    4,
    335000.00,
    2,
    'AVAILABLE',
    '["Ocean Panorama", "Free High-Speed Wi-Fi", "Espresso Machine"]'::jsonb,
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    'Corner panoramic suite featuring floor-to-ceiling glass wrapping.',
    'executive-ocean-414',
    'yangon-riverside',
    'Executive',
    'Penthouse Level',
    'Floor 4',
    '1 Super King',
    55,
    5.0,
    130,
    1,
    '["Corner Suite", "Panorama"]'::jsonb
),

-- Floor 5
(
    'a1111111-1111-1111-1111-111111111501',
    '501',
    'Governor Suite',
    5,
    460000.00,
    3,
    'OCCUPIED',
    '["Ocean Panorama", "Free High-Speed Wi-Fi", "Breakfast Inc.", "24/7 Butler Service"]'::jsonb,
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    'Historic top-floor presidential suite with private dining salon.',
    'governor-suite-501',
    'yangon-riverside',
    'Governor',
    'Penthouse Level',
    'Floor 5',
    '1 Super King',
    68,
    5.0,
    94,
    1,
    '["Governor Suite", "Top Floor"]'::jsonb
),
(
    'a1111111-1111-1111-1111-111111111512',
    '512',
    'Presidential Villa',
    5,
    520000.00,
    3,
    'OCCUPIED',
    '["Private Pool", "Ocean Panorama", "Butler Service", "Champagne Service"]'::jsonb,
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    'The pinnacle Grand Azure suite with private heated rooftop pool.',
    'presidential-villa-512',
    'yangon-riverside',
    'Presidential',
    'Penthouse Level',
    'Floor 5',
    '1 Super King',
    82,
    5.0,
    88,
    1,
    '["Presidential", "Private Pool"]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    room_number = EXCLUDED.room_number,
    room_type = EXCLUDED.room_type,
    floor = EXCLUDED.floor,
    price_per_night = EXCLUDED.price_per_night,
    capacity = EXCLUDED.capacity,
    amenities = EXCLUDED.amenities,
    image_url = EXCLUDED.image_url,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    wing = EXCLUDED.wing,
    floor_range = EXCLUDED.floor_range,
    bed_configuration = EXCLUDED.bed_configuration,
    area_sqm = EXCLUDED.area_sqm,
    updated_at = NOW();

-- ----------------------------------------------------------------------------
-- 3. STORED PROCEDURE: VERIFY PAYMENT PROOF (SLIP APPROVAL / REJECTION)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_booking_payment_proof(
    p_booking_id UUID,
    p_approved BOOLEAN,
    p_notes TEXT DEFAULT NULL,
    p_actor_id UUID DEFAULT NULL,
    p_actor_name TEXT DEFAULT 'Front Desk Staff'
)
RETURNS JSONB AS $$
DECLARE
    v_booking RECORD;
    v_new_payment_status public.payment_status;
    v_new_booking_status public.booking_status;
BEGIN
    SELECT * INTO v_booking
    FROM public.bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND', 'message', 'Booking not found');
    END IF;

    IF p_approved THEN
        v_new_payment_status := 'PAID';
        v_new_booking_status := 'CONFIRMED';

        UPDATE public.bookings
        SET payment_status = v_new_payment_status,
            booking_status = v_new_booking_status,
            auto_cancel_at = NULL,
            special_notes = COALESCE(special_notes || ' ', '') || '[Payment slip verified by ' || p_actor_name || ']',
            updated_at = NOW()
        WHERE id = p_booking_id;

        INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, details)
        VALUES (
            p_actor_id,
            'RECEPTIONIST',
            'PAYMENT_PROOF_APPROVED',
            'bookings',
            p_booking_id,
            jsonb_build_object(
                'reference', v_booking.booking_reference,
                'guest_name', v_booking.guest_name,
                'amount', v_booking.total_amount,
                'notes', p_notes,
                'verified_by', p_actor_name
            )
        );
    ELSE
        v_new_booking_status := 'CANCELLED';

        UPDATE public.bookings
        SET booking_status = v_new_booking_status,
            special_notes = COALESCE(special_notes || ' ', '') || '[Payment slip rejected by ' || p_actor_name || ': ' || COALESCE(p_notes, 'Unverified') || ']',
            updated_at = NOW()
        WHERE id = p_booking_id;

        INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, details)
        VALUES (
            p_actor_id,
            'RECEPTIONIST',
            'PAYMENT_PROOF_REJECTED',
            'bookings',
            p_booking_id,
            jsonb_build_object(
                'reference', v_booking.booking_reference,
                'guest_name', v_booking.guest_name,
                'reason', p_notes,
                'rejected_by', p_actor_name
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'booking_reference', v_booking.booking_reference,
        'payment_status', v_new_payment_status,
        'booking_status', v_new_booking_status
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 4. SEED SAMPLE ACTIVE BOOKINGS WITH PAYMENT PROOF SLIPS
-- ----------------------------------------------------------------------------
INSERT INTO public.bookings (
    id,
    booking_reference,
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
    folio_id,
    pin,
    channel,
    clerk_name,
    special_notes,
    payment_proof,
    created_at
) VALUES
(
    'b1111111-2026-1018-0001-951000000001',
    'SF-9510',
    'Thant Zin Oo',
    'thant.zin@example.com',
    '+95 9 798 123 456',
    'a1111111-1111-1111-1111-111111111304',
    '2026-10-18',
    '2026-10-21',
    759000.00,
    'KBZPAY',
    'AWAITING_REVIEW',
    'PENDING',
    'SF-2026-9510',
    '1234',
    'ONLINE',
    NULL,
    'Celebrating wedding anniversary. Requesting quiet high floor with harbor view.',
    jsonb_build_object(
        'txnRef', 'KBZ-PAY-2026-9481-QK9',
        'amount', 759000,
        'payer', 'Thant Zin Oo',
        'recipient', 'StayFlow Hospitality Co., Ltd',
        'timestamp', '18 Oct 2026, 14:18 MMT',
        'fileName', 'kbzpay_slip_9510.png',
        'receiptUrl', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80'
    ),
    NOW() - INTERVAL '12 minutes'
),
(
    'b1111111-2026-1018-0002-951200000002',
    'SF-9512',
    'Dr. Kenneth Holmes',
    'dr.holmes@example.com',
    '+95 9 745 200 118',
    'a1111111-1111-1111-1111-111111111208',
    '2026-10-18',
    '2026-10-20',
    185000.00,
    'PAY_AT_HOTEL',
    'PENDING',
    'CONFIRMED',
    'SF-2026-9512',
    '4567',
    'WALK_IN',
    'Daw Nu Nu (Front Desk 01)',
    'Valid passport on file. Room clean and ready for arrival.',
    NULL,
    NOW() - INTERVAL '28 minutes'
),
(
    'b1111111-2026-1018-0003-951500000003',
    'SF-9515',
    'Daw May Thida',
    'may.thida@example.com',
    '+95 9 400 221 455',
    'a1111111-1111-1111-1111-111111111412',
    '2026-10-20',
    '2026-10-23',
    1020000.00,
    'WAVEPAY',
    'AWAITING_REVIEW',
    'PENDING',
    'SF-2026-9515',
    '8891',
    'ONLINE',
    NULL,
    'WavePay deposit transfer submitted for suite 412.',
    jsonb_build_object(
        'txnRef', 'WAVE-PAY-2026-8891-WP2',
        'amount', 1020000,
        'payer', 'Daw May Thida',
        'recipient', 'StayFlow Hospitality Co., Ltd',
        'timestamp', '18 Oct 2026, 15:40 MMT',
        'fileName', 'wavepay_slip_9515.png',
        'receiptUrl', 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=600&q=80'
    ),
    NOW() - INTERVAL '9 minutes'
)
ON CONFLICT (booking_reference) DO UPDATE SET
    payment_status = EXCLUDED.payment_status,
    payment_proof = EXCLUDED.payment_proof,
    channel = EXCLUDED.channel;

-- ----------------------------------------------------------------------------
-- 5. SEED SAMPLE IN-ROOM SERVICE REQUESTS
-- ----------------------------------------------------------------------------
INSERT INTO public.room_service_requests (
    id,
    booking_id,
    room_id,
    room_number,
    category,
    description,
    priority,
    status,
    delivery_time,
    category_label,
    reservation_reference,
    created_at
) VALUES
(
    'c1111111-0001-0001-0001-000000000001',
    'b1111111-2026-1018-0001-951000000001',
    'a1111111-1111-1111-1111-111111111304',
    '304',
    'AMENITIES',
    'Champagne & Tropical Fruit Platter in suite prior to 17:00 arrival',
    'NORMAL',
    'PENDING',
    '16:30',
    'Concierge',
    'SF-9510',
    NOW() - INTERVAL '15 minutes'
),
(
    'c1111111-0002-0002-0002-000000000002',
    'b1111111-2026-1018-0002-951200000002',
    'a1111111-1111-1111-1111-111111111208',
    '208',
    'TOWELS',
    'Extra set of Egyptian cotton bath sheets & evening turndown service',
    'NORMAL',
    'IN_PROGRESS',
    'Immediate',
    'Housekeeping',
    'SF-9512',
    NOW() - INTERVAL '40 minutes'
),
(
    'c1111111-0003-0003-0003-000000000003',
    'b1111111-2026-1018-0003-951500000003',
    'a1111111-1111-1111-1111-111111111412',
    '412',
    'MAINTENANCE',
    'Balcony sliding door latch adjustment requested by guest',
    'URGENT',
    'PENDING',
    '15:00',
    'Maintenance',
    'SF-9515',
    NOW() - INTERVAL '5 minutes'
)
ON CONFLICT (id) DO NOTHING;
