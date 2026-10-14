const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const {
  isConfigured,
  realtimeBus,
  getRooms,
  getRoomById,
  getBookings,
  getBookingByRefOrToken,
  createAtomicBooking
} = require('../supabaseClient');
const { createSecureQrToken } = require('../qrService');
const { optionalAuth } = require('../middleware/auth');

// ----------------------------------------------------------------------------
// StayEase Catalog Constants & Calculations
// ----------------------------------------------------------------------------

const ADD_ONS = [
  {
    id: 'early-checkin',
    label: 'Guaranteed Early Check-in',
    category: 'privilege',
    price: 65000,
    description: 'Direct suite entry guaranteed from 11:00 AM (standard is 2:00 PM). Fresh espresso service on arrival.',
    icon: 'Clock'
  },
  {
    id: 'late-checkout',
    label: 'Late Check-out Privilege',
    category: 'privilege',
    price: 85000,
    description: 'Keep your suite until 4:00 PM on departure day (standard is 12:00 PM). Full access to pool & lounge.',
    icon: 'Sun'
  },
  {
    id: 'strand-club',
    label: 'Strand Club Access',
    category: 'concierge',
    price: 45000,
    description: 'Complimentary evening cocktails at the private harbour pavilion (5:30–7:30 PM).',
    icon: 'Sparkles'
  },
  {
    id: 'butler',
    label: '24/7 Dedicated Butler',
    category: 'concierge',
    price: 45000,
    description: 'Instant WhatsApp concierge and garment pressing on arrival included.',
    icon: 'ConciergeBell'
  },
  {
    id: 'airport-transfer',
    label: 'Airport Limousine Transfer',
    category: 'transport',
    price: 150000,
    description: "Yangon Int'l Airport private greeting with uniformed chauffeur. Chilled hand towels included.",
    icon: 'Car'
  },
  {
    id: 'champagne-platter',
    label: 'Champagne & Fruit Platter',
    category: 'indulgence',
    price: 180000,
    description: 'Chilled champagne with fresh artisanal tropical fruit platter prepared in suite.',
    icon: 'Wine'
  }
];

function getRoomNightlyRate(pricePerNight) {
  const num = Number(pricePerNight);
  if (!Number.isFinite(num) || num <= 0) return 200000;
  return num >= 10000 ? Math.round(num) : Math.round(num * 1000);
}

function buildRatePlans(nightlyRate, isWellnessEligible = false) {
  const flexible = Math.round(nightlyRate);
  const saver = Math.round(flexible * 0.85);
  const wellness = isWellnessEligible ? Math.round(flexible * 1.25) : flexible;

  return [
    {
      id: 'flexible',
      label: 'Standard Flexible Rate',
      nightlyRate: flexible,
      features: [
        'Free cancellation until 48h before check-in',
        'Prepaid online with verified confirmation',
        'Daily gourmet buffet breakfast',
        'Complimentary ultra-speed Wi-Fi 6',
        'Instant confirmation'
      ],
      refundable: true,
      payAtHotel: false,
      recommended: true,
      promoNote: 'Free cancellation until 48h prior'
    },
    {
      id: 'saver',
      label: 'Non-Refundable Saver Rate',
      nightlyRate: saver,
      features: [
        'Save 15% vs flexible rate',
        'Non-refundable & non-amendable',
        'Daily gourmet buffet breakfast',
        'Complimentary ultra-speed Wi-Fi 6',
        'Full payment required at booking'
      ],
      refundable: false,
      payAtHotel: false,
      savePercent: 15
    },
    {
      id: 'wellness',
      label: 'Maritime Wellness & Dining Package',
      nightlyRate: wellness,
      features: [
        'Daily 60-min heritage spa massage for 2',
        'Full à la carte & buffet breakfast',
        'Daily colonial afternoon tea',
        'Flexible cancellation up to 24h prior',
        'Optional tailored services'
      ],
      refundable: true,
      payAtHotel: false
    }
  ];
}

function computePriceBreakdown(ratePlan, nights, rooms = 1, addOns = []) {
  const safeNights = Math.max(1, nights);
  const safeRooms = Math.max(1, rooms);
  const roomTotal = Math.round(ratePlan.nightlyRate * safeNights * safeRooms);
  const extrasTotal = addOns.reduce((sum, a) => sum + (a.price || 0), 0);
  const subtotal = roomTotal + extrasTotal;
  const serviceCharge = Math.round(subtotal * 0.10);
  const tax = Math.round(subtotal * 0.05);

  const lines = [
    {
      label: safeRooms > 1
        ? `${ratePlan.nightlyRate.toLocaleString()} MMK × ${safeNights} nights × ${safeRooms} rooms`
        : `${ratePlan.nightlyRate.toLocaleString()} MMK × ${safeNights} nights`,
      amount: roomTotal,
      note: ratePlan.label
    }
  ];

  for (const a of addOns) {
    lines.push({ label: a.label, amount: a.price, note: 'Add-on' });
  }

  return {
    lines,
    subtotal,
    serviceCharge,
    tax,
    total: subtotal + serviceCharge + tax,
    currency: 'MMK'
  };
}

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function generateFolioId() {
  const year = new Date().getFullYear();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `SF-${year}-${num}`;
}

function generateReference() {
  const num = Math.floor(10000 + Math.random() * 90000);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const c1 = chars[Math.floor(Math.random() * chars.length)];
  const c2 = chars[Math.floor(Math.random() * chars.length)];
  return `SF-${num}-${c1}${c2}`;
}

// ----------------------------------------------------------------------------
// Entity Mapping Helpers
// ----------------------------------------------------------------------------

function mapHotel(h) {
  if (!h) return null;
  return {
    id: h.id,
    slug: h.slug || h.id,
    name: h.name,
    tagline: h.tagline || '',
    description: h.description || '',
    address: h.address || {
      line1: 'No. 84 Strand Road',
      city: 'Yangon',
      region: 'Yangon Region',
      country: 'Myanmar'
    },
    rating: Number(h.rating) || 5.0,
    reviewCount: Number(h.review_count) || 200,
    heroImage: h.hero_image || 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80',
    gallery: Array.isArray(h.gallery) ? h.gallery : [],
    facilities: Array.isArray(h.facilities) ? h.facilities : [],
    checkInTime: h.check_in_time || 'From 14:00',
    checkOutTime: h.check_out_time || 'Until 12:00',
    hotline: h.hotline || '+95 1 230 4567',
    featured: Boolean(h.featured)
  };
}

function mapRoom(r, hotel, dynamicAvailability = null) {
  const roomSlug = r.slug || `room-${r.room_number}`;
  const baseRate = getRoomNightlyRate(r.price_per_night);
  const isWellness = (r.category || '').toLowerCase() === 'villa' || (r.room_type || '').toLowerCase().includes('villa');
  const ratePlans = buildRatePlans(baseRate, isWellness);

  let gallery = [];
  if (Array.isArray(r.gallery) && r.gallery.length > 0) {
    gallery = r.gallery;
  } else if (r.gallery_urls && Array.isArray(r.gallery_urls) && r.gallery_urls.length > 0) {
    gallery = r.gallery_urls.map(url => ({ src: url, alt: r.room_type || r.name }));
  } else if (r.hero_image_url) {
    gallery = [{ src: r.hero_image_url, alt: r.room_type || r.name }];
  } else if (r.image_url) {
    gallery = [{ src: r.image_url, alt: r.room_type || r.name }];
  }

  const roomObj = {
    id: roomSlug,
    hotelId: r.hotel_id || 'yangon-riverside',
    name: r.room_type || r.name || `Room ${r.room_number}`,
    category: r.category || 'Deluxe',
    wing: r.wing || `Floor ${r.floor || 1}`,
    floorRange: r.floor_range || `Floor ${r.floor || 1}`,
    roomNumbers: r.room_number ? `#${r.room_number}` : 'Suite',
    description: r.description || 'Exclusive luxury hotel suite with premium amenities.',
    maxGuests: Number(r.capacity) || 2,
    bedConfiguration: r.bed_configuration || r.bed_setup || '1 King Bed',
    areaSqm: Number(r.area_sqm) || 35,
    amenities: Array.isArray(r.amenities) ? r.amenities : ['Wi-Fi 6', 'Air Conditioning', 'Espresso Machine', 'Breakfast'],
    images: gallery,
    rating: Number(r.rating) || 4.9,
    reviewCount: Number(r.review_count) || 120,
    inventory: Number(r.inventory) || 1,
    tags: Array.isArray(r.tags) ? r.tags : ['Recommended'],
    blockoutRanges: []
  };

  const defaultAvail = {
    available: r.status !== 'MAINTENANCE',
    roomsLeft: r.status !== 'MAINTENANCE' ? (r.inventory || 1) : 0
  };

  return {
    room: roomObj,
    hotel: hotel || mapHotel({
      id: r.hotel_id || 'yangon-riverside',
      name: 'StayEase Yangon Riverside'
    }),
    ratePlans,
    fromNightly: baseRate, // Single source of truth: nightly base rate matches Supabase rooms table and admin dashboard
    availability: dynamicAvailability || defaultAvail
  };
}

function mapBookingToFrontend(b, roomListing) {
  const room = roomListing ? roomListing.room : {
    id: b.room_id,
    hotelId: 'yangon-riverside',
    name: b.room_number ? `Suite ${b.room_number}` : 'StayEase Suite',
    category: 'Deluxe',
    wing: 'Main Tier',
    floorRange: 'Floor 1',
    roomNumbers: b.room_number || '101',
    description: 'Boutique hospitality suite',
    maxGuests: 2,
    bedConfiguration: '1 King Bed',
    areaSqm: 42,
    amenities: [],
    images: [],
    rating: 5.0,
    reviewCount: 100,
    inventory: 1,
    tags: [],
    blockoutRanges: []
  };

  const hotel = roomListing ? roomListing.hotel : mapHotel({
    id: 'yangon-riverside',
    name: 'StayEase Yangon Riverside'
  });

  const baseBookingRate = getRoomNightlyRate(b.total_amount ? (b.total_amount / (nights || 1)) : room.pricePerNight);
  const ratePlans = buildRatePlans(baseBookingRate);
  const ratePlan = ratePlans.find(rp => rp.id === b.rate_plan_id) || ratePlans[0];

  const checkIn = String(b.check_in_date).split('T')[0];
  const checkOut = String(b.check_out_date).split('T')[0];
  const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 3600 * 24)));

  const priceBreakdown = b.price_breakdown && b.price_breakdown.subtotal
    ? b.price_breakdown
    : computePriceBreakdown(ratePlan, nights, b.rooms_count || 1, b.add_ons || []);

  const frontendStatus = (b.booking_status || b.status || 'pending').toLowerCase();
  const frontendPaymentStatus = (b.payment_status || 'awaiting_review').toLowerCase();

  return {
    reference: b.booking_reference,
    folioId: b.folio_id || `SF-2026-${(b.booking_reference || '').replace(/\D/g, '').slice(-4)}`,
    pin: b.pin || '1234',
    draftKey: b.draft_key || `dk_${b.id}`,
    hotel,
    room,
    stay: { checkIn, checkOut },
    nights,
    adults: b.adults || 2,
    rooms: b.rooms_count || 1,
    ratePlan,
    addOns: Array.isArray(b.add_ons) ? b.add_ons : [],
    guest: {
      fullName: b.guest_name,
      email: b.guest_email,
      phoneCountryCode: '+95',
      phone: b.guest_phone || '',
      estimatedArrival: '14:00',
      preferences: b.guest_preferences || {
        highFloor: false,
        quietRoom: false,
        lateCheckIn: false,
        featherFreePillows: false,
        celebrationNote: false
      },
      conNotes: b.special_notes || '',
      agreeToTerms: true
    },
    price: priceBreakdown,
    status: frontendStatus,
    paymentMethod: b.payment_method || 'KBZPAY',
    paymentStatus: frontendPaymentStatus,
    paymentProof: b.payment_proof
      ? {
          ...b.payment_proof,
          dataUrl: b.payment_proof.dataUrl || b.payment_proof.receiptUrl || b.payment_proof.base64DataUrl || undefined,
          receiptUrl: b.payment_proof.receiptUrl || b.payment_proof.dataUrl || b.payment_proof.base64DataUrl || undefined,
          image: b.payment_proof.image || b.payment_proof.dataUrl || b.payment_proof.receiptUrl || undefined,
        }
      : undefined,
    transactionId: b.transaction_id || undefined,
    roomNumber: b.room_number || undefined,
    cancelRefundAmount: b.cancel_refund_amount ? Number(b.cancel_refund_amount) : undefined,
    cancelledAt: b.cancelled_at || undefined,
    createdAt: b.created_at || new Date().toISOString()
  };
}

// ----------------------------------------------------------------------------
// Endpoints Implementation
// ----------------------------------------------------------------------------

// 1. GET /destinations
router.get('/destinations', async (req, res) => {
  try {
    if (isConfigured) {
      const { data, error } = await require('../supabaseClient').supabase.from('destinations').select('*').order('id');
      if (!error && data && data.length > 0) {
        return res.json(data.map(d => ({
          id: d.id,
          label: d.label,
          hotelIds: d.hotel_ids || []
        })));
      }
    }
    // Static fallback
    res.json([
      { id: 'yangon-heritage', label: 'Yangon · Heritage Quarter', hotelIds: ['yangon-riverside'] },
      { id: 'yangon-central', label: 'Yangon · Downtown Central', hotelIds: ['downtown-central'] },
      { id: 'inle-lake', label: 'Inle Lake · Shan State', hotelIds: ['inle-lake'] }
    ]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. GET /hotels
router.get('/hotels', async (req, res) => {
  try {
    const { destination, featured } = req.query;

    // When requested with featured=true, frontend HotelService.getFeaturedRooms expects RoomListing[]
    if (featured === 'true') {
      const rawRooms = await getRooms();
      let allHotels = [];
      if (isConfigured) {
        const { data } = await require('../supabaseClient').supabase.from('hotels').select('*');
        if (data) allHotels = data.map(mapHotel);
      }
      if (allHotels.length === 0) {
        allHotels = [
          mapHotel({ id: 'yangon-riverside', slug: 'yangon-riverside', name: 'StayEase Yangon Riverside', featured: true }),
          mapHotel({ id: 'downtown-central', slug: 'downtown-central', name: 'StayEase Downtown Central', featured: false }),
          mapHotel({ id: 'inle-lake', slug: 'inle-lake', name: 'StayEase Inle Lake Sanctuary', featured: false })
        ];
      }
      const hotelMap = new Map(allHotels.map(h => [h.id, h]));
      const featuredRooms = rawRooms.filter(r => r.is_featured || r.featured || r.status === 'AVAILABLE');
      const targetRooms = featuredRooms.length > 0 ? featuredRooms : rawRooms;
      const listings = targetRooms.slice(0, 6).map(r => {
        const h = hotelMap.get(r.hotel_id) || mapHotel({ id: r.hotel_id || 'yangon-riverside', name: 'StayEase Yangon Riverside', featured: true });
        return mapRoom(r, h);
      });
      return res.json(listings);
    }

    let hotels = [];

    if (isConfigured) {
      let q = require('../supabaseClient').supabase.from('hotels').select('*');
      const { data, error } = await q;
      if (!error && data) {
        hotels = data.map(mapHotel);
      }
    }

    if (hotels.length === 0) {
      // Fallback
      hotels = [
        mapHotel({ id: 'yangon-riverside', slug: 'yangon-riverside', name: 'StayEase Yangon Riverside', featured: true }),
        mapHotel({ id: 'downtown-central', slug: 'downtown-central', name: 'StayEase Downtown Central', featured: false }),
        mapHotel({ id: 'inle-lake', slug: 'inle-lake', name: 'StayEase Inle Lake Sanctuary', featured: false })
      ];
    }

    if (destination) {
      // Filter by destination if specified
      if (destination.includes('heritage')) hotels = hotels.filter(h => h.id === 'yangon-riverside');
      else if (destination.includes('central')) hotels = hotels.filter(h => h.id === 'downtown-central');
      else if (destination.includes('inle')) hotels = hotels.filter(h => h.id === 'inle-lake');
    }

    res.json(hotels);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. GET /hotels/:hotelId
router.get('/hotels/:hotelId', async (req, res) => {
  try {
    const { hotelId } = req.params;
    let hotel = null;

    if (isConfigured) {
      const { data } = await require('../supabaseClient').supabase
        .from('hotels')
        .select('*')
        .or(`id.eq.${hotelId},slug.eq.${hotelId}`)
        .maybeSingle();
      if (data) hotel = mapHotel(data);
    }

    if (!hotel) {
      if (hotelId === 'yangon-riverside') hotel = mapHotel({ id: 'yangon-riverside', name: 'StayEase Yangon Riverside', featured: true });
      else if (hotelId === 'downtown-central') hotel = mapHotel({ id: 'downtown-central', name: 'StayEase Downtown Central' });
      else if (hotelId === 'inle-lake') hotel = mapHotel({ id: 'inle-lake', name: 'StayEase Inle Lake Sanctuary' });
    }

    if (!hotel) return res.status(404).json({ message: `Hotel "${hotelId}" not found.` });
    res.json(hotel);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. GET /hotels/:hotelId/rooms
router.get('/hotels/:hotelId/rooms', async (req, res) => {
  try {
    const { hotelId } = req.params;
    const { checkIn, checkOut, adults } = req.query;

    const rawRooms = await getRooms();
    let hotelObj = null;
    if (isConfigured) {
      const { data } = await require('../supabaseClient').supabase
        .from('hotels')
        .select('*')
        .or(`id.eq.${hotelId},slug.eq.${hotelId}`)
        .maybeSingle();
      if (data) hotelObj = mapHotel(data);
    }
    if (!hotelObj) hotelObj = mapHotel({ id: hotelId, name: 'StayEase Hotel' });

    let hotelRooms = rawRooms.filter(r => (r.hotel_id || 'yangon-riverside') === hotelId || hotelId === 'all');
    if (adults && Number(adults) > 0) {
      const capacityFiltered = hotelRooms.filter(r => (Number(r.capacity) || 2) >= Number(adults));
      if (capacityFiltered.length > 0) hotelRooms = capacityFiltered;
    }

    // Query conflicting bookings for stay date range
    const conflictingRoomIds = new Set();
    if (checkIn && checkOut && isConfigured) {
      const { data: bookedRooms } = await require('../supabaseClient').supabase
        .from('bookings')
        .select('room_id')
        .in('booking_status', ['CONFIRMED', 'CHECKED_IN', 'PENDING'])
        .lt('check_in_date', checkOut)
        .gt('check_out_date', checkIn);

      if (Array.isArray(bookedRooms)) {
        for (const b of bookedRooms) {
          if (b.room_id) conflictingRoomIds.add(b.room_id);
        }
      }
    }

    const listings = hotelRooms.map(r => {
      const isBooked = conflictingRoomIds.has(r.id);
      const isAvail = !isBooked && r.status !== 'MAINTENANCE';
      const dynamicAvail = {
        available: isAvail,
        roomsLeft: isAvail ? (r.inventory || 4) : 0,
        reason: isAvail ? undefined : 'sold_out'
      };
      return mapRoom(r, hotelObj, dynamicAvail);
    });

    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. GET /rooms
router.get('/rooms', async (req, res, next) => {
  // If no stay query parameters provided, pass through to existing staff / test handler
  if (!req.query.destination && !req.query.checkIn && !req.query.checkOut && !req.query.adults && !req.query.rooms) {
    return next();
  }
  try {
    const { destination, checkIn, checkOut, adults } = req.query;
    const rawRooms = await getRooms();

    let allHotels = [];
    if (isConfigured) {
      const { data } = await require('../supabaseClient').supabase.from('hotels').select('*');
      if (data) allHotels = data.map(mapHotel);
    }
    if (allHotels.length === 0) {
      allHotels = [
        mapHotel({ id: 'yangon-riverside', slug: 'yangon-riverside', name: 'StayEase Yangon Riverside', featured: true }),
        mapHotel({ id: 'downtown-central', slug: 'downtown-central', name: 'StayEase Downtown Central', featured: false }),
        mapHotel({ id: 'inle-lake', slug: 'inle-lake', name: 'StayEase Inle Lake Sanctuary', featured: false })
      ];
    }

    const hotelMap = new Map(allHotels.map(h => [h.id, h]));

    // Filter by destination
    let targetHotelIds = null;
    if (destination) {
      if (destination.includes('heritage') || destination.includes('riverside')) targetHotelIds = ['yangon-riverside'];
      else if (destination.includes('central') || destination.includes('downtown')) targetHotelIds = ['downtown-central'];
      else if (destination.includes('inle')) targetHotelIds = ['inle-lake'];
    }

    let filteredRooms = targetHotelIds
      ? rawRooms.filter(r => targetHotelIds.includes(r.hotel_id || 'yangon-riverside'))
      : rawRooms;

    // Filter by capacity if adults requested
    if (adults && Number(adults) > 0) {
      const minCapacity = Number(adults);
      const capacityFiltered = filteredRooms.filter(r => (Number(r.capacity) || 2) >= minCapacity);
      if (capacityFiltered.length > 0) {
        filteredRooms = capacityFiltered;
      }
    }

    // Check dynamic availability for stay dates against Supabase bookings table
    const conflictingRoomIds = new Set();
    if (checkIn && checkOut && isConfigured) {
      const { data: bookedRooms, error } = await require('../supabaseClient').supabase
        .from('bookings')
        .select('room_id')
        .in('booking_status', ['CONFIRMED', 'CHECKED_IN', 'PENDING'])
        .lt('check_in_date', checkOut)
        .gt('check_out_date', checkIn);

      if (!error && Array.isArray(bookedRooms)) {
        for (const b of bookedRooms) {
          if (b.room_id) conflictingRoomIds.add(b.room_id);
        }
      }
    }

    const listings = filteredRooms.map(r => {
      const h = hotelMap.get(r.hotel_id) || mapHotel({ id: r.hotel_id || 'yangon-riverside', name: 'StayEase Hotel' });
      const isBooked = conflictingRoomIds.has(r.id);
      const isAvail = !isBooked && r.status !== 'MAINTENANCE';
      const dynamicAvail = {
        available: isAvail,
        roomsLeft: isAvail ? (r.inventory || 4) : 0,
        reason: isAvail ? undefined : 'sold_out'
      };
      return mapRoom(r, h, dynamicAvail);
    });

    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. GET /rooms/:roomId
router.get('/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const rawRooms = await getRooms();
    const room = rawRooms.find(r => r.id === roomId || r.slug === roomId || r.room_number === roomId || `room-${r.room_number}` === roomId);

    if (!room) {
      return res.status(404).json({ message: `Room "${roomId}" not found.` });
    }

    let hotel = null;
    if (isConfigured) {
      const { data } = await require('../supabaseClient').supabase
        .from('hotels')
        .select('*')
        .eq('id', room.hotel_id || 'yangon-riverside')
        .maybeSingle();
      if (data) hotel = mapHotel(data);
    }
    if (!hotel) hotel = mapHotel({ id: room.hotel_id || 'yangon-riverside', name: 'StayEase Hotel' });

    res.json(mapRoom(room, hotel));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 7. GET /rooms/:roomId/availability
router.get('/rooms/:roomId/availability', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { checkIn, checkOut } = req.query;

    const rawRooms = await getRooms();
    const room = rawRooms.find(r => r.id === roomId || r.slug === roomId || r.room_number === roomId || `room-${r.room_number}` === roomId);

    if (!room) {
      return res.status(404).json({ message: `Room "${roomId}" not found.` });
    }

    let isAvailable = room.status !== 'MAINTENANCE';
    let roomsLeft = isAvailable ? (room.inventory || 4) : 0;

    if (checkIn && checkOut && isConfigured) {
      const { data: conflicts, error } = await require('../supabaseClient').supabase
        .from('bookings')
        .select('id')
        .eq('room_id', room.id)
        .in('booking_status', ['CONFIRMED', 'CHECKED_IN', 'PENDING'])
        .lt('check_in_date', checkOut)
        .gt('check_out_date', checkIn);

      if (!error && Array.isArray(conflicts) && conflicts.length > 0) {
        isAvailable = false;
        roomsLeft = 0;
      }
    }

    res.json({
      available: isAvailable,
      roomsLeft,
      reason: isAvailable ? undefined : 'sold_out'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 8. GET /add-ons
router.get('/add-ons', (req, res) => {
  res.json(ADD_ONS);
});

// 9. POST /bookings
router.post('/bookings', optionalAuth, async (req, res, next) => {
  // If request uses staff payload format (snake_case room_id or check_in_date), delegate to staff handler
  if (req.body.room_id || req.body.check_in_date) {
    return next();
  }
  try {
    const {
      draftKey,
      hotelId,
      roomId,
      checkIn,
      checkOut,
      adults = 2,
      rooms = 1,
      ratePlanId = 'flexible',
      addOnIds = [],
      guest,
      paymentMethod = 'KBZPAY',
      paymentStatus = 'awaiting_review',
      paymentProof,
      transactionId
    } = req.body;

    if (!roomId || !checkIn || !checkOut || !guest || !guest.fullName || !guest.email) {
      return res.status(422).json({ message: 'Missing required booking fields or guest details.' });
    }

    // Server-side authentication and email verification enforcement
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required. Please sign in before completing your room reservation.',
        code: 'UNAUTHORIZED'
      });
    }

    if (req.user.role === 'GUEST' && req.user.is_email_verified === false) {
      return res.status(403).json({
        message: 'Email verification required. Please verify your email before completing a room reservation.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // Idempotency: Return existing booking if draftKey is repeated
    if (draftKey && isConfigured) {
      const { data: existing } = await require('../supabaseClient').supabase
        .from('bookings')
        .select('*')
        .eq('draft_key', draftKey)
        .maybeSingle();

      if (existing) {
        return res.json(mapBookingToFrontend(existing));
      }
    }

    // Resolve room row in database
    const rawRooms = await getRooms();
    const roomRow = rawRooms.find(r => r.id === roomId || r.slug === roomId || r.room_number === roomId || `room-${r.room_number}` === roomId);
    if (!roomRow) {
      return res.status(404).json({ message: `Room "${roomId}" not found.` });
    }

    // Compute prices and rate plan strictly from Supabase room record
    const baseRate = getRoomNightlyRate(roomRow.price_per_night);
    const isWellness = (roomRow.category || '').toLowerCase() === 'villa' || (roomRow.room_type || '').toLowerCase().includes('villa');
    const ratePlans = buildRatePlans(baseRate, isWellness);
    const chosenRatePlan = ratePlans.find(rp => rp.id === ratePlanId) || ratePlans[0];

    const selectedAddOns = (addOnIds || []).map(id => ADD_ONS.find(a => a.id === id)).filter(Boolean);
    const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 3600 * 24)));
    const priceBreakdown = computePriceBreakdown(chosenRatePlan, nights, rooms, selectedAddOns);

    // Generate public identifiers
    const reference = generateReference();
    const folioId = generateFolioId();
    const pin = generatePin();
    const qrToken = createSecureQrToken(crypto.randomUUID(), reference);

    // Normalize payment proof to ensure all image URI and metadata aliases exist
    const normalizedPaymentProof = paymentProof ? {
      ...paymentProof,
      dataUrl: paymentProof.dataUrl || paymentProof.receiptUrl || paymentProof.base64DataUrl || null,
      receiptUrl: paymentProof.receiptUrl || paymentProof.dataUrl || paymentProof.base64DataUrl || null,
      image: paymentProof.image || paymentProof.dataUrl || paymentProof.receiptUrl || null,
      fileName: paymentProof.fileName || 'payment-slip.jpg',
      mimeType: paymentProof.mimeType || 'image/jpeg',
      uploadedAt: paymentProof.uploadedAt || new Date().toISOString()
    } : null;

    // Atomic Booking Execution
    const atomicResult = await createAtomicBooking({
      room_id: roomRow.id,
      guest_id: req.user.id,
      guest_name: guest.fullName || req.user.full_name || 'Guest',
      guest_email: req.user.email || guest.email,
      guest_phone: guest.phone ? `${guest.phoneCountryCode || '+95'} ${guest.phone}` : '',
      check_in_date: checkIn,
      check_out_date: checkOut,
      total_amount: priceBreakdown.total,
      payment_method: paymentMethod,
      payment_status: (paymentStatus || 'AWAITING_REVIEW').toUpperCase(),
      booking_status: 'PENDING',
      qr_token: qrToken,
      booking_reference: reference,
      folio_id: folioId,
      pin,
      draft_key: draftKey,
      adults: Number(adults) || 2,
      rooms_count: Number(rooms) || 1,
      rate_plan_id: chosenRatePlan.id,
      add_ons: selectedAddOns,
      price_breakdown: priceBreakdown,
      guest_preferences: guest.preferences || {},
      special_notes: guest.conNotes || '',
      payment_proof: normalizedPaymentProof
    });

    // Construct full response object
    const createdBooking = {
      reference,
      folioId,
      pin,
      draftKey: draftKey || `dk_${reference}`,
      hotel: mapHotel({ id: roomRow.hotel_id || hotelId || 'yangon-riverside', name: 'StayEase Hotel' }),
      room: mapRoom(roomRow).room,
      stay: { checkIn, checkOut },
      nights,
      adults: Number(adults) || 2,
      rooms: Number(rooms) || 1,
      ratePlan: chosenRatePlan,
      addOns: selectedAddOns,
      guest,
      price: priceBreakdown,
      status: 'pending',
      paymentMethod,
      paymentStatus: (paymentStatus || 'awaiting_review').toLowerCase(),
      paymentProof: normalizedPaymentProof || undefined,
      transactionId: transactionId || undefined,
      roomNumber: roomRow.room_number,
      createdAt: new Date().toISOString()
    };

    res.status(200).json(createdBooking);
  } catch (err) {
    console.error('Customer booking error:', err.message);
    const statusCode = err.code === 'DATES_UNAVAILABLE' ? 409 : 422;
    res.status(statusCode).json({ message: err.message || 'Unable to create booking.' });
  }
});

// 10. POST /payments (Reserved / Gateway mode)
router.post('/payments', (req, res) => {
  const { amount, currency, method, idempotencyKey } = req.body;
  res.json({
    success: true,
    transactionId: `txn_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
    message: `Payment authorized via ${method || 'Gateway'}`
  });
});

// 11. GET /reservations (List reservations)
router.get('/reservations', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required to view reservations.', code: 'UNAUTHORIZED' });
    }
    const bookings = await getBookings(req.user);
    const rawRooms = await getRooms();
    const roomMap = new Map(rawRooms.map(r => [r.id, mapRoom(r)]));

    const result = bookings.map(b => mapBookingToFrontend(b, roomMap.get(b.room_id)));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 12. GET /reservations/:reference (Folio lookup with 4-digit PIN access)
router.get('/reservations/:reference', optionalAuth, async (req, res) => {
  try {
    const { reference } = req.params;
    const { pin } = req.query;

    let booking = null;
    if (isConfigured) {
      const { data } = await require('../supabaseClient').supabase
        .from('bookings')
        .select('*')
        .or(`booking_reference.eq.${reference},folio_id.eq.${reference}`)
        .maybeSingle();
      if (data) booking = data;
    }

    if (!booking) {
      const all = await getBookings();
      booking = all.find(b =>
        (b.booking_reference && b.booking_reference.toLowerCase() === reference.toLowerCase()) ||
        (b.folio_id && b.folio_id.toLowerCase() === reference.toLowerCase())
      );
    }

    if (!booking) {
      return res.status(404).json({ message: `Reservation "${reference}" not found.` });
    }

    // Access control: Guest must provide matching PIN, or be authenticated owner / staff
    const pinMatches = pin && String(booking.pin) === String(pin);
    const isOwner = req.user && (
      req.user.id === booking.guest_id ||
      (req.user.email && booking.guest_email && req.user.email.toLowerCase() === booking.guest_email.toLowerCase()) ||
      ['RECEPTIONIST', 'ADMIN'].includes(req.user.role)
    );

    if (!pinMatches && !isOwner) {
      return res.status(401).json({
        message: 'Folio PIN required to view this reservation statement.'
      });
    }

    const rawRooms = await getRooms();
    const roomListing = rawRooms.find(r => r.id === booking.room_id) ? mapRoom(rawRooms.find(r => r.id === booking.room_id)) : null;

    res.json(mapBookingToFrontend(booking, roomListing));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 13. POST /reservations/:reference/cancel
router.post('/reservations/:reference/cancel', optionalAuth, async (req, res) => {
  try {
    const { reference } = req.params;
    const { pin } = req.body;

    let booking = null;
    if (isConfigured) {
      const { data } = await require('../supabaseClient').supabase
        .from('bookings')
        .select('*')
        .or(`booking_reference.eq.${reference},folio_id.eq.${reference}`)
        .maybeSingle();
      if (data) booking = data;
    }

    if (!booking) {
      const all = await getBookings();
      booking = all.find(b => (b.booking_reference || '').toLowerCase() === reference.toLowerCase());
    }

    if (!booking) {
      return res.status(404).json({ message: `Reservation "${reference}" not found.` });
    }

    if (!pin || String(booking.pin) !== String(pin)) {
      return res.status(401).json({ message: 'Invalid 4-digit Folio PIN.' });
    }

    const cancelledAt = new Date().toISOString();
    let refundAmount = Number(booking.total_amount) || 0;
    if ((booking.rate_plan_id || '').toLowerCase() === 'saver') {
      refundAmount = 0; // Non-refundable saver
    }

    if (isConfigured) {
      const client = require('../supabaseClient').supabase;
      await client
        .from('bookings')
        .update({
          booking_status: 'CANCELLED',
          cancelled_at: cancelledAt,
          cancel_refund_amount: refundAmount
        })
        .eq('id', booking.id);

      if (booking.room_id) {
        await client
          .from('rooms')
          .update({
            status: 'AVAILABLE',
            updated_at: cancelledAt
          })
          .eq('id', booking.room_id);
      }
    }

    booking.booking_status = 'CANCELLED';
    booking.cancelled_at = cancelledAt;
    booking.cancel_refund_amount = refundAmount;

    realtimeBus.emit('booking:cancelled', booking);

    const rawRooms = await getRooms();
    const roomListing = rawRooms.find(r => r.id === booking.room_id) ? mapRoom(rawRooms.find(r => r.id === booking.room_id)) : null;

    res.json(mapBookingToFrontend(booking, roomListing));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 14. GET /reservations/:reference/service-requests
router.get('/reservations/:reference/service-requests', async (req, res) => {
  try {
    const { reference } = req.params;
    let requests = [];

    if (isConfigured) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reference);
      const orFilter = isUuid
        ? `id.eq.${reference},booking_reference.eq.${reference},folio_id.eq.${reference}`
        : `booking_reference.eq.${reference},folio_id.eq.${reference}`;

      const { data: booking } = await require('../supabaseClient').supabase
        .from('bookings')
        .select('id, booking_reference, folio_id, guest_name')
        .or(orFilter)
        .maybeSingle();

      let query = require('../supabaseClient').supabase
        .from('room_service_requests')
        .select('*');

      if (booking) {
        query = query.or(`reservation_reference.eq.${reference},reservation_reference.eq.${booking.booking_reference},booking_id.eq.${booking.id}`);
      } else {
        query = query.eq('reservation_reference', reference);
      }

      const { data } = await query.order('created_at', { ascending: false });
      if (data) requests = data;
    }

    if (requests.length === 0) {
      const { memoryStore } = require('../supabaseClient');
      if (memoryStore && Array.isArray(memoryStore.serviceRequests)) {
        requests = memoryStore.serviceRequests.filter(r =>
          (r.reservation_reference && r.reservation_reference.toLowerCase() === reference.toLowerCase()) ||
          (r.booking_id && r.booking_id === reference)
        );
      }
    }

    // Resolve assigned staff names from profiles
    const assignedIds = [...new Set(requests.map(r => r.assigned_to).filter(Boolean))];
    const staffNames = {};
    if (isConfigured && assignedIds.length > 0) {
      const { data: profiles } = await require('../supabaseClient').supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .in('id', assignedIds);
      (profiles || []).forEach(p => {
        staffNames[p.id] = p.full_name || p.email;
      });
    }

    res.json(requests.map(r => {
      const assignedName = (r.assigned_to && staffNames[r.assigned_to])
        ? staffNames[r.assigned_to]
        : (r.assigned_to ? 'Staff Assigned' : undefined);

      return {
        id: r.id,
        reservationReference: r.reservation_reference || reference,
        category: (r.category_label || r.category || 'other').toLowerCase(),
        categoryLabel: r.category_label || r.category || 'Service Request',
        details: r.description || r.details || '',
        deliveryTime: r.delivery_time || 'Immediate',
        status: (r.status || 'pending').toLowerCase(),
        createdAt: r.created_at,
        updatedAt: r.updated_at || r.created_at,
        staffName: assignedName
      };
    }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 15. POST /reservations/:reference/service-requests
router.post('/reservations/:reference/service-requests', async (req, res) => {
  try {
    const { reference } = req.params;
    const { category = 'other', categoryLabel, details = '', deliveryTime = 'Immediate' } = req.body;

    let booking = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reference);
    const orFilter = isUuid
      ? `id.eq.${reference},booking_reference.eq.${reference},folio_id.eq.${reference}`
      : `booking_reference.eq.${reference},folio_id.eq.${reference}`;

    if (isConfigured) {
      const { data } = await require('../supabaseClient').supabase
        .from('bookings')
        .select('*')
        .or(orFilter)
        .maybeSingle();
      if (data) booking = data;
    }

    if (!booking) {
      const all = await getBookings();
      booking = all.find(b =>
        (b.booking_reference || '').toLowerCase() === reference.toLowerCase() ||
        (b.folio_id || '').toLowerCase() === reference.toLowerCase()
      );
    }

    if (!booking) {
      return res.status(404).json({ message: `Reservation "${reference}" not found.` });
    }

    // Resolve room number
    let roomNumber = booking.room_number || null;
    if (!roomNumber && booking.room_id && isConfigured) {
      const { data: rm } = await require('../supabaseClient').supabase
        .from('rooms')
        .select('room_number')
        .eq('id', booking.room_id)
        .maybeSingle();
      if (rm?.room_number) roomNumber = rm.room_number;
    }

    const categoryMap = {
      extra_towels: 'TOWELS',
      towels: 'TOWELS',
      housekeeping: 'CLEANING',
      cleaning: 'CLEANING',
      maintenance: 'MAINTENANCE',
      minibar: 'FOOD_BEVERAGE',
      dining: 'FOOD_BEVERAGE',
      food_beverage: 'FOOD_BEVERAGE',
      amenities: 'AMENITIES',
      airport: 'OTHER',
      other: 'OTHER'
    };
    const dbCategory = categoryMap[String(category || '').toLowerCase()] || 'OTHER';

    const requestId = crypto.randomUUID();
    const cleanRef = booking.booking_reference || reference;
    const effectiveLabel = categoryLabel || category;

    const newRequest = {
      id: requestId,
      booking_id: booking.id,
      room_id: booking.room_id || 'a1111111-1111-1111-1111-111111111101',
      room_number: String(roomNumber || '101'),
      guest_name: booking.guest_name || 'In-House Guest',
      category: dbCategory,
      category_label: effectiveLabel,
      description: details || `Service request for ${effectiveLabel}`,
      delivery_time: deliveryTime,
      reservation_reference: cleanRef,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isConfigured) {
      try {
        await require('../supabaseClient').supabase
          .from('room_service_requests')
          .insert({
            id: newRequest.id,
            booking_id: newRequest.booking_id,
            room_id: newRequest.room_id,
            room_number: newRequest.room_number,
            guest_name: newRequest.guest_name,
            category: newRequest.category,
            category_label: newRequest.category_label,
            description: newRequest.description,
            delivery_time: newRequest.delivery_time,
            reservation_reference: newRequest.reservation_reference,
            status: 'PENDING',
            created_at: newRequest.created_at
          });
      } catch (insertErr) {
        console.warn('Customer service request insert error:', insertErr.message);
      }
    }

    const { memoryStore, realtimeBus } = require('../supabaseClient');
    if (memoryStore && Array.isArray(memoryStore.serviceRequests)) {
      memoryStore.serviceRequests.unshift(newRequest);
    }
    realtimeBus.emit('service_request:created', newRequest);

    res.status(201).json({
      id: requestId,
      reservationReference: cleanRef,
      category,
      categoryLabel: effectiveLabel,
      details,
      deliveryTime,
      status: 'pending',
      createdAt: newRequest.created_at,
      updatedAt: newRequest.created_at
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
