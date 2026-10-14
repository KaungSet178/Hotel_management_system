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
    room_type: 'Deluxe Courtyard',
    category: 'Deluxe',
    floor: 1,
    wing: 'Garden Wing',
    price_per_night: 165000,
    capacity: 2,
    area_sqm: 31,
    bed_configuration: '1 Queen Bed',
    status: 'AVAILABLE',
    amenities: ['Courtyard View', 'Free High-Speed Wi-Fi'],
    image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    description: 'Ground floor courtyard suite with authentic teak millwork.',
    slug: 'deluxe-courtyard-101'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111102',
    room_number: '102',
    room_type: 'Executive Garden Suite',
    category: 'Executive',
    floor: 1,
    wing: 'Garden Wing',
    price_per_night: 340000,
    capacity: 3,
    area_sqm: 45,
    bed_configuration: '1 King Bed',
    status: 'AVAILABLE',
    amenities: ['King Bed', 'Private Zen Garden', 'Soaking Tub', 'Lounge Area', 'Butler Service', 'Complimentary Mini-Bar'],
    image_url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
    description: 'Serene ground-level suite opening onto a private courtyard garden with hand-crafted teak furniture.',
    slug: 'executive-ocean-suite'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111106',
    room_number: '106',
    room_type: 'Heritage Superior',
    category: 'Heritage',
    floor: 1,
    wing: 'Heritage Wing',
    price_per_night: 175000,
    capacity: 2,
    area_sqm: 34,
    bed_configuration: '1 Queen Bed',
    status: 'OCCUPIED',
    amenities: ['Garden Terrace', 'Free High-Speed Wi-Fi', 'Breakfast Inc.'],
    image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    description: 'Heritage wing superior room overlooking central garden.',
    slug: 'heritage-superior-106'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111110',
    room_number: '110',
    room_type: 'Standard Twin',
    category: 'Standard',
    floor: 1,
    wing: 'City Wing',
    price_per_night: 150000,
    capacity: 2,
    area_sqm: 30,
    bed_configuration: '2 Twin Beds',
    status: 'AVAILABLE',
    amenities: ['Twin Beds', 'Free High-Speed Wi-Fi', 'City View'],
    image_url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    description: 'Comfortable twin bedding room tailored for business travellers.',
    slug: 'standard-twin-110'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111118',
    room_number: '118',
    room_type: 'Deluxe Courtyard',
    category: 'Deluxe',
    floor: 1,
    wing: 'Garden Wing',
    price_per_night: 165000,
    capacity: 2,
    area_sqm: 33,
    bed_configuration: '2 Twin Beds',
    status: 'AVAILABLE',
    amenities: ['Courtyard View', 'Free High-Speed Wi-Fi', 'Rain Shower'],
    image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    description: 'Quiet courtyard-facing deluxe room on the ground tier.',
    slug: 'deluxe-courtyard-118'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111201',
    room_number: '201',
    room_type: 'Presidential Horizon Penthouse',
    category: 'Villa',
    floor: 2,
    wing: 'Private Villa Enclave',
    price_per_night: 650000,
    capacity: 4,
    area_sqm: 95,
    bed_configuration: '2 King Beds',
    status: 'AVAILABLE',
    amenities: ['Two Master Bedrooms', 'Private Plunge Pool', 'Dining Room for 6', 'Sub-Zero Wine Cellar', '24/7 Butler'],
    image_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    description: 'The pinnacle of coastal luxury featuring private plunge pool and 24/7 butler service.',
    slug: 'presidential-garden-villa'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111202',
    room_number: '202',
    room_type: 'Azure Sunset Villa Room',
    category: 'Villa',
    floor: 2,
    wing: 'Private Villa Enclave',
    price_per_night: 310000,
    capacity: 2,
    area_sqm: 52,
    bed_configuration: 'King + Daybed',
    status: 'AVAILABLE',
    amenities: ['Sunset Balcony', 'Jacuzzi Tub', 'Private Butler', 'Nespresso Atelier'],
    image_url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    description: 'Enclave villa room capturing warm sunset hues over the shoreline.',
    slug: 'signature-villa'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111208',
    room_number: '208',
    room_type: 'Heritage Junior Suite',
    category: 'Heritage',
    floor: 2,
    wing: 'Heritage Wing',
    price_per_night: 185000,
    capacity: 2,
    area_sqm: 38,
    bed_configuration: '2 Twin Beds',
    status: 'AVAILABLE',
    amenities: ['Courtyard View', 'Free High-Speed Wi-Fi', 'Heritage Teak Desk'],
    image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    description: 'Spacious Junior suite with dedicated work alcove.',
    slug: 'heritage-junior-208'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111215',
    room_number: '215',
    room_type: 'Garden Balcony',
    category: 'Deluxe',
    floor: 2,
    wing: 'Garden Wing',
    price_per_night: 190000,
    capacity: 2,
    area_sqm: 36,
    bed_configuration: '1 King Bed',
    status: 'AVAILABLE',
    amenities: ['Private Balcony', 'Garden View', 'Espresso Machine'],
    image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    description: 'Elevated second-floor terrace suite overlooking landscaped botanical gardens.',
    slug: 'garden-balcony-215'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111301',
    room_number: '301',
    room_type: 'Skyline Grand King',
    category: 'Studio',
    floor: 3,
    wing: 'Harbor Wing',
    price_per_night: 240000,
    capacity: 2,
    area_sqm: 24,
    bed_configuration: '1 Queen Bed',
    status: 'AVAILABLE',
    amenities: ['City Skyline View', 'High-Speed Wi-Fi', 'Smart TV 4K', 'Espresso Bar'],
    image_url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
    description: 'High-floor studio suite offering dazzling urban skyline vistas.',
    slug: 'urban-studio'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111302',
    room_number: '302',
    room_type: 'Royal Heritage Chamber',
    category: 'Villa',
    floor: 3,
    wing: 'Heritage Wing',
    price_per_night: 390000,
    capacity: 2,
    area_sqm: 88,
    bed_configuration: 'King + Daybed',
    status: 'AVAILABLE',
    amenities: ['Canopy Bed', 'Private Fireplace', 'Hermes Amenities', 'Library Alcove'],
    image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    description: 'Lavish colonial master chamber with antique teak four-poster bed.',
    slug: 'executive-garden-villa'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111304',
    room_number: '304',
    room_type: 'Deluxe Azure Suite',
    category: 'Deluxe',
    floor: 3,
    wing: 'Sea Breeze Wing',
    price_per_night: 210000,
    capacity: 2,
    area_sqm: 40,
    bed_configuration: '1 King Bed',
    status: 'AVAILABLE',
    amenities: ['Harbor View', 'Free High-Speed Wi-Fi', 'Espresso Machine'],
    image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    description: 'Airy luxury suite with sweeping river breeze views.',
    slug: 'deluxe-azure-suite-304'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111306',
    room_number: '306',
    room_type: 'Deluxe Azure Suite',
    category: 'Deluxe',
    floor: 3,
    wing: 'Sea Breeze Wing',
    price_per_night: 220000,
    capacity: 2,
    area_sqm: 42,
    bed_configuration: '1 King Bed',
    status: 'AVAILABLE',
    amenities: ['Harbor View', 'Free High-Speed Wi-Fi', 'Breakfast Inc.', 'Espresso Machine'],
    image_url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
    description: 'Prime harbor-facing suite on the 3rd floor with panoramic view.',
    slug: 'deluxe-azure-suite-306'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111308',
    room_number: '308',
    room_type: 'Deluxe Azure Suite',
    category: 'Deluxe',
    floor: 3,
    wing: 'Sea Breeze Wing',
    price_per_night: 210000,
    capacity: 2,
    area_sqm: 40,
    bed_configuration: '1 King Bed',
    status: 'AVAILABLE',
    amenities: ['Harbor View', 'Free High-Speed Wi-Fi', 'Rain Shower'],
    image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    description: 'Coastal light-filled suite overlooking the Yangon River promenade.',
    slug: 'deluxe-azure-suite-308'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111402',
    room_number: '402',
    room_type: 'Deluxe Azure Suite',
    category: 'Deluxe',
    floor: 4,
    wing: 'Sea Breeze Wing',
    price_per_night: 220000,
    capacity: 2,
    area_sqm: 41,
    bed_configuration: '1 King Bed',
    status: 'AVAILABLE',
    amenities: ['Harbor View', 'Free High-Speed Wi-Fi', 'Breakfast Inc.'],
    image_url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
    description: 'High-floor ocean breeze suite with expansive double balcony.',
    slug: 'deluxe-azure-suite-402'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111411',
    room_number: '411',
    room_type: 'Executive Ocean Panorama',
    category: 'Executive',
    floor: 4,
    wing: 'Penthouse Level',
    price_per_night: 330000,
    capacity: 2,
    area_sqm: 54,
    bed_configuration: '1 Super King',
    status: 'AVAILABLE',
    amenities: ['Ocean Panorama', 'Free High-Speed Wi-Fi', 'Strand Club Access'],
    image_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    description: 'Panoramic ocean vista suite with evening cocktail lounge access.',
    slug: 'executive-ocean-411'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111412',
    room_number: '412',
    room_type: 'Executive Ocean Panorama',
    category: 'Executive',
    floor: 4,
    wing: 'Penthouse Level',
    price_per_night: 340000,
    capacity: 2,
    area_sqm: 56,
    bed_configuration: '1 Super King',
    status: 'OCCUPIED',
    amenities: ['Ocean Panorama', 'Free High-Speed Wi-Fi', 'Breakfast Inc.', 'Strand Club Access'],
    image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    description: 'Uninterrupted 180-degree ocean view suite at the penthouse boundary.',
    slug: 'executive-ocean-412'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111414',
    room_number: '414',
    room_type: 'Executive Ocean Panorama',
    category: 'Executive',
    floor: 4,
    wing: 'Penthouse Level',
    price_per_night: 335000,
    capacity: 2,
    area_sqm: 55,
    bed_configuration: '1 Super King',
    status: 'AVAILABLE',
    amenities: ['Ocean Panorama', 'Free High-Speed Wi-Fi', 'Espresso Machine'],
    image_url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    description: 'Corner panoramic suite featuring floor-to-ceiling glass wrapping.',
    slug: 'executive-ocean-414'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111501',
    room_number: '501',
    room_type: 'Governor Suite',
    category: 'Governor',
    floor: 5,
    wing: 'Penthouse Level',
    price_per_night: 460000,
    capacity: 3,
    area_sqm: 68,
    bed_configuration: '1 Super King',
    status: 'OCCUPIED',
    amenities: ['Ocean Panorama', 'Free High-Speed Wi-Fi', 'Breakfast Inc.', '24/7 Butler Service'],
    image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    description: 'Historic top-floor presidential suite with private dining salon.',
    slug: 'governor-suite-501'
  },
  {
    id: 'a1111111-1111-1111-1111-111111111512',
    room_number: '512',
    room_type: 'Presidential Villa',
    category: 'Presidential',
    floor: 5,
    wing: 'Penthouse Level',
    price_per_night: 520000,
    capacity: 3,
    area_sqm: 82,
    bed_configuration: '1 Super King',
    status: 'OCCUPIED',
    amenities: ['Private Pool', 'Ocean Panorama', 'Butler Service', 'Champagne Service'],
    image_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
    description: 'The pinnacle Grand Azure suite with private heated rooftop pool.',
    slug: 'presidential-villa-512'
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
    const { data: rawRooms, error } = await supabase.from('rooms').select('*').order('room_number');
    if (!error && rawRooms) {
      // Dynamic operational room status calculation for TODAY:
      // A room is only RESERVED if a confirmed reservation is active TODAY (check_in_date <= today && check_out_date > today).
      // Future reservations (e.g. check-in 29 Oct when today is 14 Oct) do NOT lock the room today -> it remains AVAILABLE!
      try {
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Yangon' }).format(new Date());

        const { data: activeBookings } = await supabase
          .from('bookings')
          .select('id, room_id, booking_status, check_in_date, check_out_date')
          .in('booking_status', ['CHECKED_IN', 'CONFIRMED']);

        const checkedInRoomIds = new Set();
        const todayReservedRoomIds = new Set();

        if (Array.isArray(activeBookings)) {
          for (const b of activeBookings) {
            if (!b.room_id) continue;
            const cIn = String(b.check_in_date || '').split('T')[0];
            const cOut = String(b.check_out_date || '').split('T')[0];

            if (b.booking_status === 'CHECKED_IN') {
              checkedInRoomIds.add(b.room_id);
            } else if (b.booking_status === 'CONFIRMED') {
              if (cIn <= today && cOut > today) {
                todayReservedRoomIds.add(b.room_id);
              }
            }
          }
        }

        return rawRooms.map(r => {
          let dynamicStatus = r.status;
          if (checkedInRoomIds.has(r.id)) {
            dynamicStatus = 'OCCUPIED';
          } else if (todayReservedRoomIds.has(r.id)) {
            dynamicStatus = 'RESERVED';
          } else if (r.status === 'MAINTENANCE' || r.status === 'CLEANING') {
            dynamicStatus = r.status;
          } else {
            dynamicStatus = 'AVAILABLE';
          }

          if (dynamicStatus !== r.status) {
            supabase.from('rooms').update({ status: dynamicStatus, updated_at: new Date().toISOString() }).eq('id', r.id).then();
          }

          return { ...r, status: dynamicStatus };
        });
      } catch (reconErr) {
        console.warn('[getRooms] Dynamic status calculation fallback:', reconErr.message);
        return rawRooms;
      }
    }
  }
  return memoryStore.rooms;
}

async function getRoomById(roomId) {
  const allRooms = await getRooms();
  const room = allRooms.find(r => r.id === roomId || r.room_number === roomId || r.slug === roomId || `room-${r.room_number}` === roomId);
  if (room) return room;
  return null;
}

async function updateRoomStatus(roomId, newStatus) {
  if (isConfigured && supabase) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomId);
    let q = supabase.from('rooms').update({ status: newStatus, updated_at: new Date().toISOString() });
    if (isUuid) q = q.eq('id', roomId);
    else q = q.eq('room_number', roomId);
    await q;
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

  let normalizedProof = payment_proof;
  if (payment_proof && typeof payment_proof === 'object') {
    const rawImg = payment_proof.dataUrl || payment_proof.receiptUrl || payment_proof.image || payment_proof.base64DataUrl || null;
    normalizedProof = {
      ...payment_proof,
      dataUrl: payment_proof.dataUrl || rawImg,
      receiptUrl: payment_proof.receiptUrl || rawImg,
      image: payment_proof.image || rawImg,
      fileName: payment_proof.fileName || 'payment-slip.jpg',
      mimeType: payment_proof.mimeType || 'image/jpeg',
      uploadedAt: payment_proof.uploadedAt || new Date().toISOString()
    };
  }

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
      p_payment_proof: normalizedProof || null,
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
      payment_proof: normalizedProof,
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
    const { data: bData } = await supabase
      .from('bookings')
      .select('id, guest_id, guest_email, booking_status')
      .eq('qr_token', qrToken)
      .maybeSingle();

    if (bData) {
      if (bData.booking_status === 'PENDING') {
        const err = new Error('Reservation is awaiting payment approval. Please verify payment slip first.');
        err.code = 'BOOKING_PENDING';
        throw err;
      }

      // If GUEST role is scanning, verify reservation ownership
      if (user && user.role === 'GUEST') {
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

  if (booking.booking_status === 'PENDING') {
    const err = new Error('Reservation is awaiting payment approval. Please verify payment slip first.');
    err.code = 'BOOKING_PENDING';
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
    room.status = 'CLEANING';
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

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const room = memoryStore.rooms.find(r => r.room_number === String(room_number));
  let roomId = room ? room.id : 'a1111111-1111-1111-1111-111111111101';
  if (!isUuid.test(roomId)) roomId = 'a1111111-1111-1111-1111-111111111101';

  const validBookingId = (booking_id && isUuid.test(booking_id)) ? booking_id : null;
  const validGuestId = (guest_id && isUuid.test(guest_id)) ? guest_id : null;

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
  const safeCategory = categoryMap[String(category || '').toLowerCase()] || 'OTHER';

  const newRequest = {
    id: crypto.randomUUID(),
    booking_id: validBookingId,
    room_id: roomId,
    room_number: String(room_number || '101'),
    guest_id: validGuestId,
    guest_name: guest_name || `Guest Room ${room_number || '101'}`,
    category: safeCategory,
    category_label: category || safeCategory,
    description: details || `Service request for ${category || safeCategory}`,
    priority: priority === 'URGENT' ? 'URGENT' : 'NORMAL',
    status: 'PENDING',
    assigned_to: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (isConfigured && supabase) {
    try {
      await supabase.from('room_service_requests').insert({
        id: newRequest.id,
        booking_id: newRequest.booking_id,
        room_id: newRequest.room_id,
        room_number: newRequest.room_number,
        guest_name: newRequest.guest_name,
        category: newRequest.category,
        category_label: newRequest.category_label,
        description: newRequest.description,
        priority: newRequest.priority,
        status: 'PENDING',
        created_at: newRequest.created_at
      });
    } catch (insertErr) {
      console.warn('createServiceRequest Supabase insert error:', insertErr.message);
    }
  }

  memoryStore.serviceRequests.unshift(newRequest);
  realtimeBus.emit('service_request:created', newRequest);
  return newRequest;
}

async function updateServiceRequestStatus(id, status, assigned_to = null) {
  let req = memoryStore.serviceRequests.find(r => r.id === id);
  if (!req && isConfigured && supabase) {
    try {
      const { data: dbReq } = await supabase.from('room_service_requests').select('*').eq('id', id).maybeSingle();
      if (dbReq) {
        req = { ...dbReq };
        memoryStore.serviceRequests.push(req);
      }
    } catch (fetchErr) {
      console.warn('Could not fetch service request from Supabase:', fetchErr.message);
    }
  }

  if (!req) {
    req = { id, status: 'PENDING', assigned_to: null };
    memoryStore.serviceRequests.push(req);
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let validAssignedTo = null;
  if (assigned_to && isUuid.test(assigned_to)) {
    validAssignedTo = assigned_to;
  } else if (req.assigned_to && isUuid.test(req.assigned_to)) {
    validAssignedTo = req.assigned_to;
  }

  const normalizedStatus = (status || 'PENDING').toUpperCase();
  req.status = normalizedStatus;
  if (validAssignedTo) req.assigned_to = validAssignedTo;
  if (normalizedStatus === 'COMPLETED') req.resolved_at = new Date().toISOString();
  req.updated_at = new Date().toISOString();

  if (isConfigured && supabase) {
    const updatePayload = {
      status: normalizedStatus,
      resolved_at: req.resolved_at,
      updated_at: req.updated_at
    };
    if (validAssignedTo) {
      updatePayload.assigned_to = validAssignedTo;
    }
    const { error: updateErr } = await supabase.from('room_service_requests').update(updatePayload).eq('id', id);
    if (updateErr) {
      console.warn('updateServiceRequestStatus Supabase error:', updateErr.message);
      // If error was foreign key constraint on assigned_to, retry with assigned_to: null
      if (updateErr.code === '23503' || updateErr.message?.includes('foreign key')) {
        await supabase.from('room_service_requests').update({
          status: normalizedStatus,
          assigned_to: null,
          resolved_at: req.resolved_at,
          updated_at: req.updated_at
        }).eq('id', id);
      }
    }
  }

  realtimeBus.emit('service_request:updated', req);
  return req;
}

/**
 * 24-Hour cancellation policy background runner
 */
async function runCancellationCheck() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Yangon' }).format(new Date());

  if (isConfigured && supabase) {
    // 1. Auto-cancel 24-hr unpaid Pay-at-Hotel holds
    let rpcCount = 0;
    try {
      const { data } = await supabase.rpc('auto_cancel_unpaid_bookings');
      rpcCount = data?.cancelled_count || 0;
    } catch {}

    // 2. Auto-cancel overdue arrivals: check_in_date < today and not checked in
    let overdueCancelled = 0;
    try {
      const { data: overdueBookings } = await supabase
        .from('bookings')
        .select('id, room_id, booking_reference')
        .in('booking_status', ['CONFIRMED', 'PENDING'])
        .lt('check_in_date', today);

      if (overdueBookings && overdueBookings.length > 0) {
        for (const b of overdueBookings) {
          await supabase
            .from('bookings')
            .update({
              booking_status: 'CANCELLED',
              special_notes: 'Auto-cancelled: Check-in date passed without arrival (No-show).',
              updated_at: new Date().toISOString()
            })
            .eq('id', b.id);

          if (b.room_id) {
            await supabase
              .from('rooms')
              .update({
                status: 'AVAILABLE',
                updated_at: new Date().toISOString()
              })
              .eq('id', b.room_id);
          }
          overdueCancelled++;
        }
      }
    } catch (err) {
      console.error('[runCancellationCheck] overdue check error:', err.message);
    }

    return {
      success: true,
      cancelled_count: rpcCount + overdueCancelled,
      overdue_cancelled: overdueCancelled,
      timestamp: new Date().toISOString()
    };
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
    } else if (
      (b.booking_status === 'CONFIRMED' || b.booking_status === 'PENDING') &&
      b.check_in_date &&
      b.check_in_date < today
    ) {
      b.booking_status = 'CANCELLED';
      b.cancelled_reason = 'Check-in date passed without arrival (No-show)';
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
    realtimeBus.emit('booking:approved', booking);

    if (isConfigured && supabase) {
      try {
        supabase.channel('stayease-live-broadcast').send({
          type: 'broadcast',
          event: 'BOOKING_APPROVED',
          payload: {
            reference: booking.booking_reference,
            roomNumber: booking.room_number,
            guestName: booking.guest_name,
            totalAmount: booking.total_amount
          }
        }).catch(() => {});
      } catch {}
    }
  } else {
    booking.booking_status = 'CANCELLED';
    booking.updated_at = now;

    if (isConfigured && supabase) {
      await supabase.from('bookings').update({
        booking_status: 'CANCELLED',
        special_notes: (booking.special_notes ? booking.special_notes + ' ' : '') + `[Payment slip rejected by ${actorName}: ${notes || 'Unverified'}]`,
        updated_at: now
      }).eq('id', booking.id);

      if (booking.room_id) {
        await supabase.from('rooms').update({
          status: 'AVAILABLE',
          updated_at: now
        }).eq('id', booking.room_id);
      }

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

      try {
        supabase.channel('stayease-live-broadcast').send({
          type: 'broadcast',
          event: 'BOOKING_REJECTED',
          payload: {
            reference: booking.booking_reference,
            reason: notes || 'Payment review declined'
          }
        }).catch(() => {});
      } catch {}
    }

    realtimeBus.emit('booking:cancelled', booking);
    realtimeBus.emit('booking:updated', booking);
    realtimeBus.emit('booking:rejected', booking);
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
    payment_method = 'KBZPAY',
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

  // Ensure valid enum value for payment_method ('KBZPAY', 'CARD', 'WAVEPAY', 'ONLINE', 'PAY_AT_HOTEL')
  let normalizedPaymentMethod = String(payment_method || 'KBZPAY').toUpperCase();
  if (!['KBZPAY', 'CARD', 'WAVEPAY', 'ONLINE', 'PAY_AT_HOTEL'].includes(normalizedPaymentMethod)) {
    normalizedPaymentMethod = 'KBZPAY';
  }

  const effectiveCheckIn = check_in_date || now.split('T')[0];
  const effectiveCheckOut = check_out_date || new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];

  let newBooking = {
    id: require('crypto').randomUUID(),
    booking_reference,
    guest_name: guest_name || 'Walk-In Guest',
    guest_email: `walkin.${booking_reference.toLowerCase()}@hotel.internal`,
    guest_phone: guest_phone || '',
    room_id: room.id,
    check_in_date: effectiveCheckIn,
    check_out_date: effectiveCheckOut,
    total_amount: Number(total_amount) || Number(room.price_per_night) * 2 || 340000,
    payment_method: normalizedPaymentMethod,
    payment_status: payment_status || 'PAID',
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
    if (insErr) {
      console.error('Supabase walk-in insert error:', insErr);
      throw new Error(`Failed to create walk-in booking: ${insErr.message}`);
    }
    if (inserted) newBooking = inserted;

    await supabase.from('rooms').update({ status: 'OCCUPIED', updated_at: now }).eq('id', room.id);

    try {
      await supabase.from('audit_logs').insert({
        actor_id: user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id) ? user.id : null,
        actor_role: user?.role || 'RECEPTIONIST',
        action: 'WALK_IN_REGISTERED',
        entity_type: 'bookings',
        entity_id: newBooking.id,
        details: {
          reference: booking_reference,
          guest_name: newBooking.guest_name,
          room_number: room.room_number,
          amount: newBooking.total_amount,
          clerk: clerkName
        }
      });
    } catch {
      // non-fatal
    }
  } else {
    memoryStore.bookings.unshift(newBooking);
    room.status = 'OCCUPIED';
  }

  realtimeBus.emit('room:updated', { ...room, status: 'OCCUPIED' });
  realtimeBus.emit('booking:created', newBooking);
  realtimeBus.emit('booking:checked_in', newBooking);

  return { ...newBooking, room_number: room.room_number };
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
