const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const { EventEmitter } = require('events');
const crypto = require('crypto');

// Global event bus for real-time staff & guest updates
const realtimeBus = new EventEmitter();
realtimeBus.setMaxListeners(100);

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase = null;
let isConfigured = false;

if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('your-project')) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    isConfigured = true;
    console.log('✓ Successfully initialized Supabase Client connected to:', SUPABASE_URL);
  } catch (err) {
    console.warn('! Supabase initialization failed, falling back to local database engine:', err.message);
  }
} else {
  console.log('ℹ Supabase credentials not set or using placeholder. Running in High-Fidelity Reactive Mode.');
}

// ----------------------------------------------------------------------------
// Local In-Memory Reactive Store (Mirrors Supabase PostgreSQL Schema & Constraints)
// ----------------------------------------------------------------------------
const initialRooms = [
  {
    id: 'a1111111-1111-1111-1111-111111111101',
    room_number: '101',
    room_type: 'Deluxe Ocean View',
    floor: 1,
    price_per_night: 280.00,
    capacity: 2,
    status: 'AVAILABLE',
    amenities: ['King Bed', 'Ocean Balcony', 'Espresso Machine', 'Rain Shower', 'High-speed Wi-Fi', '4K Smart TV'],
    image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    description: 'Panoramic ocean vistas from an expansive private terrace with custom Italian marble bathroom.'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111102',
    room_number: '102',
    room_type: 'Executive Garden Suite',
    floor: 1,
    price_per_night: 340.00,
    capacity: 3,
    status: 'AVAILABLE',
    amenities: ['King Bed', 'Private Zen Garden', 'Soaking Tub', 'Lounge Area', 'Butler Service', 'Complimentary Mini-Bar'],
    image_url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
    description: 'Serene ground-level suite opening onto a private courtyard garden with hand-crafted teak furniture.'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111201',
    room_number: '201',
    room_type: 'Presidential Horizon Penthouse',
    floor: 2,
    price_per_night: 650.00,
    capacity: 4,
    status: 'AVAILABLE',
    amenities: ['Two Master Bedrooms', 'Private Plunge Pool', 'Dining Room for 6', 'Sub-Zero Wine Cellar', '24/7 Butler', 'Bang & Olufsen Audio'],
    image_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    description: 'The pinnacle of coastal luxury featuring 360-degree shoreline panoramas and a private rooftop plunge pool.'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111202',
    room_number: '202',
    room_type: 'Azure Sunset Villa Room',
    floor: 2,
    price_per_night: 310.00,
    capacity: 2,
    status: 'OCCUPIED',
    amenities: ['King Bed', 'Sunset Terrace', 'Whirlpool Jacuzzi', 'Walk-in Wardrobe', 'Nespresso Atelier'],
    image_url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    description: 'West-facing sanctuary designed to capture golden sunset hues over the turquoise cove.'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111301',
    room_number: '301',
    room_type: 'Skyline Grand King',
    floor: 3,
    price_per_night: 240.00,
    capacity: 2,
    status: 'CLEANING',
    amenities: ['Plush King Bed', 'Floor-to-Ceiling Glass', 'Aromatherapy Diffuser', 'Dyson Supersonic', 'Smart Climate Control'],
    image_url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
    description: 'Sleek contemporary design with sweeping city skyline and harbor views.'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111302',
    room_number: '302',
    room_type: 'Royal Heritage Chamber',
    floor: 3,
    price_per_night: 390.00,
    capacity: 2,
    status: 'MAINTENANCE',
    amenities: ['Handcrafted Canopy Bed', 'Fireplace', 'Hermes Bath Amenities', 'Library Alcove', 'Chauffeur Service'],
    image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    description: 'Rich mahogany finishes and authentic historical accents paired with modern state-of-the-art comforts.'
  }
];

const initialProfiles = [
  {
    id: 'user-guest-001',
    email: 'elena.rostova@example.com',
    full_name: 'Elena Rostova',
    role: 'GUEST',
    phone: '+1 555-0199'
  },
  {
    id: 'user-guest-002',
    email: 'marcus.vance@example.com',
    full_name: 'Marcus Vance',
    role: 'GUEST',
    phone: '+1 555-0142'
  },
  {
    id: 'user-receptionist-001',
    email: 'reception@grandazure.luxury',
    full_name: 'Sophia Clark',
    role: 'RECEPTIONIST',
    phone: '+1 555-0120'
  },
  {
    id: 'user-housekeeping-001',
    email: 'housekeeping@grandazure.luxury',
    full_name: 'Maria Gomez',
    role: 'HOUSEKEEPING',
    phone: '+1 555-0130'
  },
  {
    id: 'user-admin-001',
    email: 'admin@grandazure.luxury',
    full_name: 'Arthur Sterling',
    role: 'ADMIN',
    phone: '+1 555-0100'
  }
];

const initialBookings = [
  {
    id: 'b1111111-2222-3333-4444-555555555001',
    booking_reference: 'LUX-8491',
    guest_id: 'user-guest-001',
    guest_name: 'Elena Rostova',
    guest_email: 'elena.rostova@example.com',
    guest_phone: '+1 555-0199',
    room_id: 'a1111111-1111-1111-1111-111111111202',
    room_number: '202',
    check_in_date: '2026-10-10',
    check_out_date: '2026-10-14',
    total_amount: 1240.00,
    payment_method: 'ONLINE',
    payment_status: 'PAID',
    booking_status: 'CHECKED_IN',
    qr_token: 'LUX-QR-LUX-8491-9e8a71b2',
    checked_in_at: new Date().toISOString(),
    auto_cancel_at: null,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'b1111111-2222-3333-4444-555555555002',
    booking_reference: 'LUX-9230',
    guest_id: 'user-guest-002',
    guest_name: 'Marcus Vance',
    guest_email: 'marcus.vance@example.com',
    guest_phone: '+1 555-0142',
    room_id: 'a1111111-1111-1111-1111-111111111101',
    room_number: '101',
    check_in_date: '2026-10-11',
    check_out_date: '2026-10-13',
    total_amount: 560.00,
    payment_method: 'PAY_AT_HOTEL',
    payment_status: 'PENDING',
    booking_status: 'CONFIRMED',
    qr_token: 'LUX-QR-LUX-9230-4c3d2e1f',
    checked_in_at: null,
    // 24-hr cancellation policy applies here:
    auto_cancel_at: new Date(Date.now() + 3600000 * 18).toISOString(),
    created_at: new Date(Date.now() - 3600000 * 6).toISOString()
  }
];

const initialServiceRequests = [
  {
    id: 's1111111-1111-2222-3333-444444444001',
    booking_id: 'b1111111-2222-3333-4444-555555555001',
    room_id: 'a1111111-1111-1111-1111-111111111202',
    room_number: '202',
    guest_name: 'Elena Rostova',
    category: 'TOWELS',
    details: 'Extra set of Egyptian cotton bath towels and spa robes please.',
    priority: 'NORMAL',
    status: 'IN_PROGRESS',
    assigned_to: 'Housekeeping Team Beta',
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString()
  },
  {
    id: 's1111111-1111-2222-3333-444444444002',
    booking_id: 'b1111111-2222-3333-4444-555555555001',
    room_id: 'a1111111-1111-1111-1111-111111111202',
    room_number: '202',
    guest_name: 'Elena Rostova',
    category: 'FOOD_BEVERAGE',
    details: 'Chilled bottle of vintage Champagne and artisan cheese platter.',
    priority: 'URGENT',
    status: 'PENDING',
    assigned_to: null,
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString()
  }
];

const auditLogs = [];

// In-memory tables
const memoryStore = {
  profiles: [...initialProfiles],
  rooms: [...initialRooms],
  bookings: [...initialBookings],
  serviceRequests: [...initialServiceRequests],
  auditLogs: [...auditLogs]
};

// Row-level lock mutex simulation for atomic concurrency
const roomLocks = new Set();

async function acquireRoomLock(roomId) {
  while (roomLocks.has(roomId)) {
    await new Promise((res) => setTimeout(res, 30));
  }
  roomLocks.add(roomId);
}

function releaseRoomLock(roomId) {
  roomLocks.delete(roomId);
}

// ----------------------------------------------------------------------------
// DATA REPOSITORY FUNCTIONS
// ----------------------------------------------------------------------------

async function getRooms() {
  if (isConfigured && supabase) {
    const { data, error } = await supabase.from('rooms').select('*').order('room_number');
    if (!error && data) return data;
  }
  return memoryStore.rooms;
}

async function getRoomById(roomId) {
  if (isConfigured && supabase) {
    const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single();
    if (data) return data;
  }
  return memoryStore.rooms.find(r => r.id === roomId || r.room_number === roomId);
}

async function updateRoomStatus(roomId, newStatus) {
  if (isConfigured && supabase) {
    await supabase.from('rooms').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', roomId);
  }
  const room = memoryStore.rooms.find(r => r.id === roomId || r.room_number === roomId);
  if (room) {
    room.status = newStatus;
    room.updated_at = new Date().toISOString();
    realtimeBus.emit('room:updated', room);
  }
  return room;
}

async function getBookings(user = null) {
  if (isConfigured && supabase) {
    let query = supabase.from('bookings').select('*, rooms(room_number, room_type)').order('created_at', { ascending: false });
    if (user && user.role === 'GUEST') {
      query = query.or(`guest_id.eq.${user.id},guest_email.eq.${user.email}`);
    }
    const { data, error } = await query;
    if (!error && data) return data;
  }
  if (user && user.role === 'GUEST') {
    return memoryStore.bookings.filter(b =>
      b.guest_id === user.id ||
      (b.guest_email && b.guest_email.toLowerCase() === user.email.toLowerCase())
    );
  }
  return memoryStore.bookings;
}

async function getBookingByRefOrToken(query) {
  if (isConfigured && supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);
    const filter = isUuid
      ? `id.eq.${query},booking_reference.eq.${query},qr_token.eq.${query}`
      : `booking_reference.eq.${query},qr_token.eq.${query}`;
    const { data } = await supabase
      .from('bookings')
      .select('*, rooms(room_number, room_type, price_per_night)')
      .or(filter)
      .maybeSingle();
    if (data) {
      if (data.rooms && !data.room_number) {
        data.room_number = data.rooms.room_number;
      }
      return data;
    }
  }
  return memoryStore.bookings.find(b =>
    b.booking_reference.toLowerCase() === query.toLowerCase() ||
    b.qr_token === query ||
    b.id === query
  );
}

/**
 * Concurrency-safe atomic booking creation
 * Mirrors PostgreSQL book_room_atomic stored procedure
 */
async function createAtomicBooking(bookingData) {
  const {
    room_id,
    guest_id = null,
    guest_name,
    guest_email,
    guest_phone,
    check_in_date,
    check_out_date,
    total_amount,
    payment_method,
    payment_status = 'PENDING',
    qr_token,
    booking_reference,
    folio_id = null,
    pin = null,
    draft_key = null,
    adults = 2,
    rooms_count = 1,
    rate_plan_id = 'flexible',
    add_ons = [],
    price_breakdown = {},
    guest_preferences = {},
    special_notes = null,
    payment_proof = null,
    booking_status = 'CONFIRMED'
  } = bookingData;

  // If connected to Supabase, invoke the PL/pgSQL RPC
  if (isConfigured && supabase) {
    let validGuestId = (guest_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(guest_id))
      ? guest_id
      : null;

    // Safety check: ensure guest_id actually exists in public.profiles to satisfy bookings_guest_id_fkey
    if (validGuestId) {
      try {
        const { data: pCheck } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', validGuestId)
          .maybeSingle();

        if (!pCheck) {
          // Check if profile exists by email with a different ID (e.g. from local tests)
          const targetEmail = (guest_email || '').trim().toLowerCase();
          if (targetEmail) {
            const { data: existingByEmail } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', targetEmail)
              .maybeSingle();

            if (existingByEmail) {
              await supabase
                .from('profiles')
                .update({ id: validGuestId })
                .eq('id', existingByEmail.id);
            } else {
              const { error: insErr } = await supabase
                .from('profiles')
                .upsert({
                  id: validGuestId,
                  email: targetEmail,
                  full_name: guest_name || 'Guest',
                  role: 'GUEST'
                }, { onConflict: 'id' });

              if (insErr) {
                console.warn('[createAtomicBooking] Auto-provisioning profile failed, falling back to null guest_id:', insErr.message);
                validGuestId = null;
              }
            }
          } else {
            validGuestId = null;
          }
        }
      } catch (checkErr) {
        console.warn('[createAtomicBooking] Profile verification failed, proceeding with fallback:', checkErr.message);
      }
    }

    const { data, error } = await supabase.rpc('book_room_atomic', {
      p_room_id: room_id,
      p_guest_id: validGuestId,
      p_guest_name: guest_name,
      p_guest_email: guest_email,
      p_guest_phone: guest_phone || '',
      p_check_in: check_in_date,
      p_check_out: check_out_date,
      p_total_amount: total_amount,
      p_payment_method: payment_method,
      p_payment_status: payment_status,
      p_qr_token: qr_token,
      p_booking_reference: booking_reference,
      p_folio_id: folio_id || null,
      p_pin: pin || null,
      p_draft_key: draft_key || null,
      p_adults: Number(adults) || 2,
      p_rooms_count: Number(rooms_count) || 1,
      p_rate_plan_id: rate_plan_id || 'flexible',
      p_add_ons: add_ons || [],
      p_price_breakdown: price_breakdown || {},
      p_guest_preferences: guest_preferences || {},
      p_special_notes: special_notes || null,
      p_payment_proof: payment_proof || null,
      p_booking_status: booking_status || 'CONFIRMED'
    });

    if (error) {
      throw new Error(error.message);
    }
    if (data && !data.success) {
      const err = new Error(data.message || 'Booking conflict');
      err.code = data.error;
      throw err;
    }
    return data;
  }

  // Local ACID-safe row locking simulation
  await acquireRoomLock(room_id);
  try {
    const room = memoryStore.rooms.find(r => r.id === room_id);
    if (!room) {
      const err = new Error('Room not found');
      err.code = 'ROOM_NOT_FOUND';
      throw err;
    }
    if (room.status === 'MAINTENANCE') {
      const err = new Error('Room is currently undergoing maintenance.');
      err.code = 'ROOM_IN_MAINTENANCE';
      throw err;
    }

    // Check overlapping bookings
    const checkIn = new Date(check_in_date).getTime();
    const checkOut = new Date(check_out_date).getTime();

    const conflict = memoryStore.bookings.some(b => {
      if (b.room_id !== room_id) return false;
      if (!['CONFIRMED', 'CHECKED_IN'].includes(b.booking_status)) return false;

      const bIn = new Date(b.check_in_date).getTime();
      const bOut = new Date(b.check_out_date).getTime();

      return (
        (bIn <= checkIn && bOut > checkIn) ||
        (bIn < checkOut && bOut >= checkOut) ||
        (bIn >= checkIn && bOut <= checkOut)
      );
    });

    if (conflict) {
      const err = new Error('This room is already reserved for the selected dates.');
      err.code = 'DATES_UNAVAILABLE';
      throw err;
    }

    // 24-Hour cancellation deadline for unpaid Pay-at-Hotel
    let autoCancelAt = null;
    if (payment_method === 'PAY_AT_HOTEL' && payment_status === 'PENDING') {
      autoCancelAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    }

    const newBooking = {
      id: crypto.randomUUID(),
      booking_reference,
      guest_id,
      guest_name,
      guest_email,
      guest_phone: guest_phone || '',
      room_id,
      room_number: room.room_number,
      check_in_date,
      check_out_date,
      total_amount,
      payment_method,
      payment_status,
      booking_status: 'CONFIRMED',
      qr_token,
      checked_in_at: null,
      auto_cancel_at: autoCancelAt,
      created_at: new Date().toISOString()
    };

    memoryStore.bookings.unshift(newBooking);

    // Emit Realtime event
    realtimeBus.emit('booking:created', newBooking);

    return {
      success: true,
      booking_id: newBooking.id,
      booking_reference: newBooking.booking_reference,
      room_number: room.room_number,
      qr_token: newBooking.qr_token,
      auto_cancel_at: autoCancelAt
    };
  } finally {
    releaseRoomLock(room_id);
  }
}

/**
 * Contactless QR Check-in verification
 */
async function checkInWithQrToken(qrToken, user = null) {
  if (isConfigured && supabase) {
    // If GUEST role is scanning, verify reservation ownership
    if (user && user.role === 'GUEST') {
      const { data: bData } = await supabase
        .from('bookings')
        .select('id, guest_id, guest_email')
        .eq('qr_token', qrToken)
        .maybeSingle();

      if (bData) {
        const isOwner =
          (bData.guest_id && bData.guest_id === user.id) ||
          (bData.guest_email && bData.guest_email.toLowerCase() === user.email.toLowerCase());
        if (!isOwner) {
          const err = new Error('Forbidden: You are not authorized to check in for another guest reservation.');
          err.code = 'FORBIDDEN_GUEST';
          throw err;
        }
      }
    }

    const validStaffId = (user && user.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id))
      ? user.id
      : null;

    const { data, error } = await supabase.rpc('check_in_with_qr_token', {
      p_qr_token: qrToken,
      p_staff_or_kiosk_id: validStaffId
    });
    if (error) throw new Error(error.message);
    if (!data.success) {
      const err = new Error(data.message);
      err.code = data.error;
      err.checked_in_at = data.checked_in_at;
      throw err;
    }
    return data;
  }

  const booking = memoryStore.bookings.find(b => b.qr_token === qrToken);
  if (!booking) {
    const err = new Error('No reservation found matching this QR code token.');
    err.code = 'INVALID_TOKEN';
    throw err;
  }

  // If GUEST role is scanning, ensure it is their own reservation
  if (user && user.role === 'GUEST') {
    const isOwner = 
      (booking.guest_id && booking.guest_id === user.id) ||
      (booking.guest_email && booking.guest_email.toLowerCase() === user.email.toLowerCase());
    if (!isOwner) {
      const err = new Error('Forbidden: You are not authorized to check in for another guest reservation.');
      err.code = 'FORBIDDEN_GUEST';
      throw err;
    }
  }

  if (booking.booking_status === 'CHECKED_IN') {
    const err = new Error('Guest is already checked in.');
    err.code = 'ALREADY_CHECKED_IN';
    err.checked_in_at = booking.checked_in_at;
    throw err;
  }

  if (['CANCELLED', 'EXPIRED'].includes(booking.booking_status)) {
    const err = new Error('This reservation has been cancelled or has expired.');
    err.code = 'BOOKING_INACTIVE';
    throw err;
  }

  booking.booking_status = 'CHECKED_IN';
  booking.checked_in_at = new Date().toISOString();

  // Mark room as occupied
  const room = memoryStore.rooms.find(r => r.id === booking.room_id);
  if (room) {
    room.status = 'OCCUPIED';
    realtimeBus.emit('room:updated', room);
  }

  realtimeBus.emit('booking:checked_in', booking);

  return {
    success: true,
    booking_id: booking.id,
    booking_reference: booking.booking_reference,
    guest_name: booking.guest_name,
    room_number: room ? room.room_number : booking.room_number,
    checked_in_at: booking.checked_in_at
  };
}

/**
 * Check out guest
 */
async function checkOutBooking(bookingId) {
  if (isConfigured && supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
    let query = supabase.from('bookings').select('*, rooms(*)');
    if (isUuid) {
      query = query.or(`id.eq.${bookingId},booking_reference.eq.${bookingId}`);
    } else {
      query = query.eq('booking_reference', bookingId);
    }
    const { data: booking, error: bErr } = await query.maybeSingle();
    if (bErr || !booking) throw new Error('Booking not found');

    const now = new Date().toISOString();
    await supabase.from('bookings').update({
      booking_status: 'CHECKED_OUT',
      checked_out_at: now,
      updated_at: now
    }).eq('id', booking.id);

    await supabase.from('rooms').update({
      status: 'CLEANING',
      updated_at: now
    }).eq('id', booking.room_id);

    const updatedBooking = { ...booking, booking_status: 'CHECKED_OUT', checked_out_at: now };
    const updatedRoom = { ...(booking.rooms || {}), status: 'CLEANING' };
    realtimeBus.emit('room:updated', updatedRoom);
    realtimeBus.emit('booking:checked_out', updatedBooking);
    return { success: true, booking: updatedBooking, room: updatedRoom };
  }

  const booking = memoryStore.bookings.find(b => b.id === bookingId || b.booking_reference === bookingId);
  if (!booking) throw new Error('Booking not found');

  booking.booking_status = 'CHECKED_OUT';
  booking.checked_out_at = new Date().toISOString();

  const room = memoryStore.rooms.find(r => r.id === booking.room_id);
  if (room) {
    room.status = 'CLEANING'; // Auto set to cleaning for Housekeeping
    realtimeBus.emit('room:updated', room);
  }

  realtimeBus.emit('booking:checked_out', booking);
  return { success: true, booking, room };
}

/**
 * In-room service requests
 */
async function getServiceRequests(user = null) {
  if (isConfigured && supabase) {
    let query = supabase
      .from('room_service_requests')
      .select('*')
      .order('created_at', { ascending: false });
    const { data, error } = await query;
    if (!error && data) {
      if (user && user.role === 'GUEST') {
        return data.filter(r => r.guest_id === user.id || r.guest_name === user.full_name);
      }
      return data;
    }
  }

  if (user && user.role === 'GUEST') {
    const guestBookingIds = new Set(
      memoryStore.bookings
        .filter(b => b.guest_id === user.id || (b.guest_email && b.guest_email.toLowerCase() === user.email.toLowerCase()))
        .map(b => b.id)
    );
    const guestRooms = new Set(
      memoryStore.bookings
        .filter(b => b.guest_id === user.id || (b.guest_email && b.guest_email.toLowerCase() === user.email.toLowerCase()))
        .map(b => String(b.room_number))
    );

    return memoryStore.serviceRequests.filter(r =>
      (r.guest_id && r.guest_id === user.id) ||
      guestBookingIds.has(r.booking_id) ||
      guestRooms.has(String(r.room_number)) ||
      (r.guest_name && (r.guest_name === user.full_name || r.guest_name === user.email))
    );
  }

  return memoryStore.serviceRequests;
}

async function createServiceRequest(requestData) {
  const {
    room_number,
    guest_id = null,
    guest_name,
    category,
    details,
    priority = 'NORMAL',
    booking_id = null
  } = requestData;

  const room = memoryStore.rooms.find(r => r.room_number === String(room_number));
  const roomId = room ? room.id : crypto.randomUUID();

  const newRequest = {
    id: crypto.randomUUID(),
    booking_id: booking_id || (room ? 'guest-in-room' : null),
    room_id: roomId,
    room_number: String(room_number),
    guest_id,
    guest_name: guest_name || `Guest Room ${room_number}`,
    category: category || 'TOWELS',
    details,
    priority: priority || 'NORMAL',
    status: 'PENDING',
    assigned_to: null,
    created_at: new Date().toISOString()
  };

  if (isConfigured && supabase) {
    await supabase.from('room_service_requests').insert(newRequest);
  }

  memoryStore.serviceRequests.unshift(newRequest);
  realtimeBus.emit('service_request:created', newRequest);
  return newRequest;
}

async function updateServiceRequestStatus(id, status, assigned_to = null) {
  const req = memoryStore.serviceRequests.find(r => r.id === id);
  if (!req) throw new Error('Service request not found');

  req.status = status;
  if (assigned_to !== null) req.assigned_to = assigned_to;
  if (status === 'COMPLETED') req.resolved_at = new Date().toISOString();
  req.updated_at = new Date().toISOString();

  if (isConfigured && supabase) {
    await supabase.from('room_service_requests').update({
      status,
      assigned_to: req.assigned_to,
      resolved_at: req.resolved_at,
      updated_at: req.updated_at
    }).eq('id', id);
  }

  realtimeBus.emit('service_request:updated', req);
  return req;
}

/**
 * 24-Hour cancellation policy background runner
 */
async function runCancellationCheck() {
  if (isConfigured && supabase) {
    const { data } = await supabase.rpc('auto_cancel_unpaid_bookings');
    return data || { cancelled_count: 0 };
  }

  const now = Date.now();
  let cancelledCount = 0;

  for (const b of memoryStore.bookings) {
    if (
      b.booking_status === 'CONFIRMED' &&
      b.payment_status === 'PENDING' &&
      b.auto_cancel_at &&
      new Date(b.auto_cancel_at).getTime() <= now
    ) {
      b.booking_status = 'CANCELLED';
      b.cancelled_reason = '24-hour unpaid Pay-at-Hotel policy expired';
      cancelledCount++;
      realtimeBus.emit('booking:cancelled', b);
    }
  }

  return { success: true, cancelled_count: cancelledCount, timestamp: new Date().toISOString() };
}

/**
 * Mark a booking as PAID upon verified webhook payment confirmation.
 * Automatically clears auto_cancel_at (unlocking from 24h cancellation watchlist)
 * and ensures valid qr_token is assigned.
 */
async function markBookingAsPaid(bookingId, paymentDetails = {}) {
  let booking = memoryStore.bookings.find(b =>
    b.id === bookingId ||
    b.booking_reference === bookingId
  );

  if (!booking && isConfigured && supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
    let query = supabase.from('bookings').select('*');
    if (isUuid) {
      query = query.or(`id.eq.${bookingId},booking_reference.eq.${bookingId}`);
    } else {
      query = query.eq('booking_reference', bookingId);
    }
    const { data } = await query.maybeSingle();
    if (data) booking = data;
  }

  if (!booking) {
    const err = new Error(`Booking "${bookingId}" not found for payment confirmation.`);
    err.code = 'BOOKING_NOT_FOUND';
    throw err;
  }

  // Ensure cryptographic QR token is present
  if (!booking.qr_token) {
    const { createSecureQrToken } = require('./qrService');
    booking.qr_token = createSecureQrToken(booking.id, booking.booking_reference);
  }

  booking.payment_status = 'PAID';
  booking.booking_status = 'CONFIRMED';
  booking.status = 'CONFIRMED';
  booking.auto_cancel_at = null; // Cleared from 24h cancellation rule
  booking.payment_provider = paymentDetails.provider || 'VISA';
  booking.payment_transaction_id = paymentDetails.transaction_id || null;
  booking.paid_at = new Date().toISOString();
  booking.updated_at = new Date().toISOString();

  if (isConfigured && supabase) {
    await supabase.from('bookings').update({
      payment_status: 'PAID',
      booking_status: 'CONFIRMED',
      auto_cancel_at: null,
      qr_token: booking.qr_token,
      updated_at: booking.updated_at
    }).eq('id', booking.id);
  }

  realtimeBus.emit('booking:paid', booking);
  realtimeBus.emit('booking:updated', booking);

  return booking;
}

/**
 * Verify payment proof slip (approve or reject by receptionist)
 */
async function verifyPaymentProof(bookingId, approved, notes = '', user = null) {
  let booking = memoryStore.bookings.find(b =>
    b.id === bookingId || b.booking_reference === bookingId
  );

  if (!booking && isConfigured && supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
    let query = supabase.from('bookings').select('*');
    if (isUuid) {
      query = query.or(`id.eq.${bookingId},booking_reference.eq.${bookingId}`);
    } else {
      query = query.eq('booking_reference', bookingId);
    }
    const { data } = await query.maybeSingle();
    if (data) booking = data;
  }

  if (!booking) {
    const err = new Error(`Booking "${bookingId}" not found.`);
    err.code = 'BOOKING_NOT_FOUND';
    throw err;
  }

  const actorName = user?.full_name || user?.name || 'Front Desk Staff';
  const now = new Date().toISOString();

  if (approved) {
    booking.payment_status = 'PAID';
    booking.booking_status = 'CONFIRMED';
    booking.auto_cancel_at = null;
    booking.updated_at = now;

    if (isConfigured && supabase) {
      await supabase.from('bookings').update({
        payment_status: 'PAID',
        booking_status: 'CONFIRMED',
        auto_cancel_at: null,
        special_notes: (booking.special_notes ? booking.special_notes + ' ' : '') + `[Payment slip approved by ${actorName}]`,
        updated_at: now
      }).eq('id', booking.id);

      await supabase.from('audit_logs').insert({
        actor_id: user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id) ? user.id : null,
        actor_role: user?.role || 'RECEPTIONIST',
        action: 'PAYMENT_PROOF_APPROVED',
        entity_type: 'bookings',
        entity_id: booking.id,
        details: {
          reference: booking.booking_reference,
          guest_name: booking.guest_name,
          amount: booking.total_amount,
          notes,
          verified_by: actorName
        }
      });
    }

    realtimeBus.emit('booking:paid', booking);
    realtimeBus.emit('booking:updated', booking);
  } else {
    booking.booking_status = 'CANCELLED';
    booking.updated_at = now;

    if (isConfigured && supabase) {
      await supabase.from('bookings').update({
        booking_status: 'CANCELLED',
        special_notes: (booking.special_notes ? booking.special_notes + ' ' : '') + `[Payment slip rejected by ${actorName}: ${notes || 'Unverified'}]`,
        updated_at: now
      }).eq('id', booking.id);

      await supabase.from('audit_logs').insert({
        actor_id: user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id) ? user.id : null,
        actor_role: user?.role || 'RECEPTIONIST',
        action: 'PAYMENT_PROOF_REJECTED',
        entity_type: 'bookings',
        entity_id: booking.id,
        details: {
          reference: booking.booking_reference,
          guest_name: booking.guest_name,
          reason: notes,
          rejected_by: actorName
        }
      });
    }

    realtimeBus.emit('booking:cancelled', booking);
    realtimeBus.emit('booking:updated', booking);
  }

  return booking;
}

/**
 * Register walk-in booking directly from front-desk counter
 */
async function createWalkInBooking(walkInData, user = null) {
  const {
    room_id,
    room_number,
    guest_name,
    guest_phone,
    guest_nrc_passport,
    check_in_date,
    check_out_date,
    total_amount,
    payment_method = 'PAY_AT_HOTEL',
    payment_status = 'PAID',
    special_notes = ''
  } = walkInData;

  const rooms = await getRooms();
  const room = rooms.find(r => r.id === room_id || r.room_number === room_number);
  if (!room) {
    const err = new Error('Room not found');
    err.code = 'ROOM_NOT_FOUND';
    throw err;
  }

  const randomSuffix = `${Math.floor(1000 + Math.random() * 9000)}`;
  const booking_reference = `WI-2026-${randomSuffix}`;
  const folio_id = `SF-2026-${randomSuffix}`;
  const pin = `${Math.floor(1000 + Math.random() * 9000)}`;
  const { createSecureQrToken } = require('./qrService');
  const qr_token = createSecureQrToken(require('crypto').randomUUID(), booking_reference);

  const clerkName = user?.full_name || user?.name || 'Daw Nu Nu (Front Desk 01)';
  const now = new Date().toISOString();

  let newBooking = {
    id: require('crypto').randomUUID(),
    booking_reference,
    guest_name,
    guest_email: `walkin.${randomSuffix}@hotel.internal`,
    guest_phone: guest_phone || '',
    room_id: room.id,
    room_number: room.room_number,
    check_in_date,
    check_out_date,
    total_amount: Number(total_amount),
    payment_method,
    payment_status,
    booking_status: 'CHECKED_IN',
    checked_in_at: now,
    qr_token,
    folio_id,
    pin,
    special_notes: (special_notes ? special_notes + ' ' : '') + `[Counter walk-in registered by ${clerkName}]`,
    created_at: now,
    updated_at: now
  };

  if (isConfigured && supabase) {
    const { data: inserted, error: insErr } = await supabase.from('bookings').insert(newBooking).select().single();
    if (!insErr && inserted) newBooking = inserted;

    await supabase.from('rooms').update({ status: 'OCCUPIED', updated_at: now }).eq('id', room.id);

    await supabase.from('audit_logs').insert({
      actor_id: user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id) ? user.id : null,
      actor_role: user?.role || 'RECEPTIONIST',
      action: 'WALK_IN_REGISTERED',
      entity_type: 'bookings',
      entity_id: newBooking.id,
      details: {
        reference: booking_reference,
        guest_name,
        room_number: room.room_number,
        amount: total_amount,
        clerk: clerkName
      }
    });
  } else {
    memoryStore.bookings.unshift(newBooking);
    room.status = 'OCCUPIED';
  }

  realtimeBus.emit('room:updated', { ...room, status: 'OCCUPIED' });
  realtimeBus.emit('booking:created', newBooking);
  realtimeBus.emit('booking:checked_in', newBooking);

  return newBooking;
}

module.exports = {
  supabase,
  isConfigured,
  realtimeBus,
  getRooms,
  getRoomById,
  updateRoomStatus,
  getBookings,
  getBookingByRefOrToken,
  createAtomicBooking,
  checkInWithQrToken,
  checkOutBooking,
  getServiceRequests,
  createServiceRequest,
  updateServiceRequestStatus,
  runCancellationCheck,
  markBookingAsPaid,
  verifyPaymentProof,
  createWalkInBooking,
  memoryStore
};
