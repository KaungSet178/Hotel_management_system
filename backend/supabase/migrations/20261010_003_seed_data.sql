-- ============================================================================
-- HOTEL MANAGEMENT SYSTEM: SEED DATA
-- Migration: 20261010_003_seed_data.sql
-- ============================================================================

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
