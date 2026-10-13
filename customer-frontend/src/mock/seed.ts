import type {
  AddOn,
  Booking,
  BookingStatus,
  Destination,
  Hotel,
  PaymentMethod,
  PaymentStatus,
  RatePlan,
  RatePlanId,
  Room,
  ServiceRequest,
} from '@/types';
import { addDaysISO, todayPlus } from '@/lib/dates';
import { IMG } from './images';
import { computeBreakdown } from '@/lib/pricing';
import {
  generateFolioId,
  generatePin,
  generateReference,
} from '@/lib/refs';

export function subtractISO(value: string, days: number): string {
  return addDaysISO(value, -days);
}

export const DESTINATIONS: Destination[] = [
  { id: 'yangon-heritage', label: 'Yangon · Heritage Quarter', hotelIds: ['yangon-riverside'] },
  { id: 'yangon-central', label: 'Yangon · Downtown Central', hotelIds: ['downtown-central'] },
  { id: 'inle-lake', label: 'Inle Lake · Shan State', hotelIds: ['inle-lake'] },
];

export const HOTELS: Hotel[] = [
  {
    id: 'yangon-riverside',
    slug: 'yangon-riverside',
    name: 'StayFlow Yangon Riverside',
    tagline: 'Colonial prestige above the Yangon River corridor',
    description:
      'Perched on Strand Road within our signature Heritage Quarter, StayFlow Yangon Riverside blends quiet colonial prestige with ultra-modern maritime tranquility. Quarter-sawn teak millwork, bespoke woven silk textiles and double-glazed acoustic glass frame sunrise views across the water.',
    address: {
      line1: 'No. 84 Strand Road',
      line2: 'Heritage Quarter',
      city: 'Yangon',
      region: 'Yangon Region',
      country: 'Myanmar',
    },
    rating: 4.9,
    reviewCount: 240,
    heroImage: IMG.resortPool,
    gallery: [
      { src: IMG.resortPool, alt: 'Infinity pool overlooking the Yangon river' },
      { src: IMG.lobby, alt: 'Heritage lobby with teak millwork' },
      { src: IMG.luxuryRoom, alt: 'Deluxe Azure Suite living area' },
      { src: IMG.endlessPool, alt: 'Rooftop pool deck at sunset' },
      { src: IMG.restaurant, alt: 'Fine dining terrace' },
    ],
    facilities: [
      'Smart QR Express Check-in',
      'Outdoor & infinity pool',
      'Private hydro-lounge',
      'Heritage spa & wellness',
      'Executive lounge',
      '1 Gbps Wi-Fi 6',
      'Airport limousine service',
      '24/7 concierge & butler',
      'Fitness suite',
      'Colonial afternoon tea',
    ],
    checkInTime: 'From 14:00',
    checkOutTime: 'Until 12:00',
    hotline: '+95 1 230 4567',
    featured: true,
  },
  {
    id: 'downtown-central',
    slug: 'downtown-central',
    name: 'StayFlow Downtown Central',
    tagline: 'Smart urban stays in the beating heart of Yangon',
    description:
      'Steps from Sule Pagoda and the modern business district, Downtown Central pairs StayFlow’s zero-waiting-time smart hospitality with high-performance workspaces, city-view studios and a vibrant breakfast social. Engineered for the frequent traveller.',
    address: {
      line1: 'No. 128 Sule Pagoda Road',
      line2: 'Downtown',
      city: 'Yangon',
      region: 'Yangon Region',
      country: 'Myanmar',
    },
    rating: 4.8,
    reviewCount: 310,
    heroImage: IMG.building,
    gallery: [
      { src: IMG.building, alt: 'Modern Downtown Central tower' },
      { src: IMG.hotelRoom, alt: 'Urban Superior Studio' },
      { src: IMG.bedroomDark, alt: 'City-view suite at dusk' },
      { src: IMG.restaurant, alt: 'Breakfast social room' },
    ],
    facilities: [
      'Smart QR Express Check-in',
      'Free buffet breakfast',
      'Executive workstations',
      '500 Mbps secure Wi-Fi',
      'City-view gym',
      '24/7 front desk',
    ],
    checkInTime: 'From 14:00',
    checkOutTime: 'Until 12:00',
    hotline: '+95 1 230 4567',
  },
  {
    id: 'inle-lake',
    slug: 'inle-lake',
    name: 'StayFlow Inle Lake Sanctuary',
    tagline: 'Private garden villas above the Stilt-house waters',
    description:
      'Floating over the tranquil shallows of Inle Lake in Shan State, the Sanctuary is our most intimate residence. Executive garden villas with private plunge pools face the dawn across the water, while the spa and dining pavilion draw on local artisan traditions.',
    address: {
      line1: 'Inle Lake Shoreline',
      line2: 'Nyaungshwe',
      city: 'Nyaungshwe',
      region: 'Shan State',
      country: 'Myanmar',
    },
    rating: 5.0,
    reviewCount: 180,
    heroImage: IMG.water,
    gallery: [
      { src: IMG.water, alt: 'Calm waters of Inle Lake at dawn' },
      { src: IMG.villaBathtub, alt: 'Garden villa private plunge pool' },
      { src: IMG.poolVilla, alt: 'Villa terrace overlooking the lake' },
      { src: IMG.bathroom, alt: 'Stone bathtub framed by water' },
    ],
    facilities: [
      'Private plunge pools',
      'Lakeside spa pavilion',
      'Smart QR Express Check-in',
      'Boat transfers & charters',
      'Organic dining',
      'High-speed Wi-Fi',
      '24/7 concierge',
    ],
    checkInTime: 'From 14:00',
    checkOutTime: 'Until 12:00',
    hotline: '+95 1 230 4567',
  },
];

const demoDates = () => {
  const checkIn = todayPlus(7);
  return {
    upcomingCheckIn: checkIn,
    upcomingCheckOut: addDaysISO(checkIn, 3),
    activeCheckIn: subtractISO(todayPlus(0), 1),
    activeCheckOut: addDaysISO(subtractISO(todayPlus(0), 1), 3),
    pastCheckIn: todayPlus(-14),
    pastCheckOut: addDaysISO(todayPlus(-14), 3),
    villaBlockStart: todayPlus(7),
    villaBlockEnd: addDaysISO(todayPlus(7), 6),
  };
};

export function buildRatePlans(
  flexible: number,
  wellnessEligible = false,
): Record<RatePlanId, RatePlan> {
  const saver = Math.round(flexible * 0.85);
  const wellness = wellnessEligible ? Math.round(flexible * 1.25) : flexible;
  return {
    flexible: {
      id: 'flexible',
      label: 'Standard Flexible Rate',
      nightlyRate: flexible,
      features: [
        'Free cancellation until 48h before check-in',
        'Prepaid online with verified confirmation',
        'Daily gourmet buffet breakfast',
        'Complimentary ultra-speed Wi-Fi 6',
        'Instant confirmation',
      ],
      refundable: true,
      payAtHotel: false,
      recommended: true,
      promoNote: 'Free cancellation until 16 Oct, 14:00 (48h prior)',
    },
    saver: {
      id: 'saver',
      label: 'Non-Refundable Saver Rate',
      nightlyRate: saver,
      features: [
        'Save 15% vs flexible rate',
        'Non-refundable & non-amendable',
        'Daily gourmet buffet breakfast',
        'Complimentary ultra-speed Wi-Fi 6',
        'Full payment required at booking',
      ],
      refundable: false,
      payAtHotel: false,
      savePercent: 15,
    },
    wellness: {
      id: 'wellness',
      label: 'Maritime Wellness & Dining Package',
      nightlyRate: wellness,
      features: [
        'Daily 60-min heritage spa massage for 2',
        'Full à la carte & buffet breakfast',
        'Daily colonial afternoon tea',
        'Flexible cancellation up to 24h prior',
        'Optional tailored services',
      ],
      refundable: true,
      payAtHotel: false,
    },
  };
}

export const ROOMS: Room[] = [
  {
    id: 'deluxe-azure-suite',
    hotelId: 'yangon-riverside',
    name: 'Deluxe Azure Suite',
    category: 'Deluxe',
    wing: 'Heritage Garden Level',
    floorRange: 'Rooms #304–308',
    roomNumbers: '#304–308',
    description:
      'Elegantly curated boutique suite featuring indigenous Burmese teak decor, bespoke handwoven fabrics, and floor-to-ceiling garden views. Complimentary breakfast and rainfall shower included.',
    maxGuests: 2,
    bedConfiguration: '1 King Bed',
    areaSqm: 42,
    amenities: [
      'High-speed Wi-Fi',
      'Individual A/C',
      'Nespresso system',
      'Rainfall shower',
      'Free buffet breakfast',
      'Bathtub & hydro jet',
      'Private balcony / terrace',
      'Smart TV 4K',
      'Minibar & pantry',
    ],
    images: [
      { src: IMG.luxuryRoom, alt: 'Deluxe Azure Suite — king bedroom' },
      { src: IMG.bedWhite, alt: 'Pillowtop king bed' },
      { src: IMG.bathroom, alt: 'Rainfall shower ensuite' },
      { src: IMG.interior, alt: 'Teak seating alcove' },
    ],
    rating: 4.9,
    reviewCount: 142,
    inventory: 5,
    tags: ['Recommended', 'Best Value'],
    blockoutRanges: [],
  },
  {
    id: 'executive-ocean-suite',
    hotelId: 'yangon-riverside',
    name: 'Executive Ocean Panorama Suite',
    category: 'Executive',
    wing: 'Top Floor Executive Tier',
    floorRange: 'Rooms #701–704',
    roomNumbers: '#701–704',
    description:
      'Expansive high-floor suite with an oversized private terrace, separate dining corner, deep-soaking bathtub, and personalized concierge butler on demand.',
    maxGuests: 3,
    bedConfiguration: '1 King + 1 Sofa Bed',
    areaSqm: 58,
    amenities: [
      'Private balcony',
      'Executive lounge access',
      'Complimentary laundry',
      'Breakfast included',
      'Espresso bar',
      'Jacuzzi included',
      'Sunset panorama',
      'Workstation',
    ],
    images: [
      { src: IMG.bedroomDark, alt: 'Executive Ocean Panorama Suite terrace at dusk' },
      { src: IMG.villaBathtub, alt: 'Deep-soaking bathtub' },
      { src: IMG.endlessPool, alt: 'Executive lounge deck' },
    ],
    rating: 5.0,
    reviewCount: 96,
    inventory: 4,
    tags: ['Ocean View'],
    blockoutRanges: [],
  },
  {
    id: 'heritage-junior-suite',
    hotelId: 'yangon-riverside',
    name: 'Heritage Junior Suite',
    category: 'Junior',
    wing: 'Heritage Courtyard',
    floorRange: 'Rooms #112–118',
    roomNumbers: '#112–118',
    description:
      'Ideal for solo travellers or couples seeking a quiet workspace and authentic cultural aesthetics. Includes high ergonomic desk and garden courtyard views.',
    maxGuests: 2,
    bedConfiguration: '1 Queen Bed',
    areaSqm: 35,
    amenities: [
      'Workstation',
      'High-speed Wi-Fi',
      'City & courtyard view',
      'Air conditioning',
      'Tea/coffee setup',
    ],
    images: [
      { src: IMG.apartment, alt: 'Heritage Junior Suite interior' },
      { src: IMG.hotelRoom, alt: 'Quiet workspace' },
    ],
    rating: 4.8,
    reviewCount: 210,
    inventory: 7,
    tags: ['Best Value'],
    blockoutRanges: [],
  },
  {
    id: 'signature-villa',
    hotelId: 'yangon-riverside',
    name: 'Signature Villa',
    category: 'Villa',
    wing: 'Privilege Wing',
    floorRange: 'Villa 02',
    roomNumbers: 'Villa 02',
    description:
      'King bed with daybed seating, private planting balcony and Wi-Fi 6 throughout. High-value residential comfort with direct access to the hydro-lounge floor.',
    maxGuests: 3,
    bedConfiguration: 'King + Daybed',
    areaSqm: 52,
    amenities: ['Balcony', 'Wi-Fi 6', 'Hydro-lounge access', 'Espresso bar', 'Breakfast included'],
    images: [
      { src: IMG.interior, alt: 'Signature Villa living space' },
      { src: IMG.poolSunset, alt: 'Villa balcony at sunset' },
    ],
    rating: 4.9,
    reviewCount: 180,
    inventory: 2,
    tags: ['High Value'],
    blockoutRanges: [],
  },
  {
    id: 'presidential-garden-villa',
    hotelId: 'yangon-riverside',
    name: 'Presidential Garden Villa',
    category: 'Villa',
    wing: 'Private Villa Enclave',
    floorRange: 'Villa 01',
    roomNumbers: 'Villa 01',
    description:
      'Our pinnacle residence with private plunge pool, secluded bamboo garden patio, private chef pantry, and a dedicated 24-hour butler team.',
    maxGuests: 4,
    bedConfiguration: '2 King Beds',
    areaSqm: 95,
    amenities: ['Plunge pool', 'Butler team', 'Chef pantry', 'Garden patio', 'Spa on call'],
    images: [
      { src: IMG.poolVilla, alt: 'Presidential Garden Villa plunge pool' },
      { src: IMG.bedWhite, alt: 'King master bedroom' },
    ],
    rating: 5.0,
    reviewCount: 64,
    inventory: 1,
    tags: ['Signature'],
    blockoutRanges: [],
  },
  {
    id: 'urban-studio',
    hotelId: 'downtown-central',
    name: 'Superior Urban Studio',
    category: 'Studio',
    wing: 'Smart Living Floors',
    floorRange: 'Rooms #201–215',
    roomNumbers: '#201–215',
    description:
      'Compact, hyper-functional studio with queen bed, city view and free breakfast. Includes smart desk and 500 Mbps secure Wi-Fi for seamless remote work.',
    maxGuests: 2,
    bedConfiguration: '1 Queen Bed',
    areaSqm: 24,
    amenities: ['Free breakfast', 'City view', 'Smart desk', 'Wi-Fi 6', 'Smart TV'],
    images: [
      { src: IMG.hotelRoom, alt: 'Superior Urban Studio' },
      { src: IMG.bedroom, alt: 'Queen bed corner' },
    ],
    rating: 4.8,
    reviewCount: 310,
    inventory: 15,
    tags: ['Best Value'],
    blockoutRanges: [],
  },
  {
    id: 'urban-executive-suite',
    hotelId: 'downtown-central',
    name: 'Urban Executive Suite',
    category: 'Executive',
    wing: 'Sky Tier',
    floorRange: 'Rooms #901–906',
    roomNumbers: '#901–906',
    description:
      'City-view executive suite with separate lounge, queen bed and executive workstation. Ocean-facing upper floors with complimentary breakfast.',
    maxGuests: 3,
    bedConfiguration: '1 Queen + 1 Sofa Bed',
    areaSqm: 44,
    amenities: ['City & ocean view', 'Free breakfast', 'Executive lounge', 'Workstation', 'Wi-Fi 6'],
    images: [
      { src: IMG.luxuryRoom, alt: 'Urban Executive Suite lounge' },
      { src: IMG.bedroomDark, alt: 'Sky tier bedroom' },
    ],
    rating: 4.9,
    reviewCount: 128,
    inventory: 6,
    tags: ['City View'],
    blockoutRanges: [],
  },
  {
    id: 'executive-garden-villa',
    hotelId: 'inle-lake',
    name: 'Executive Garden Villa',
    category: 'Villa',
    wing: 'Lakeside Garden',
    floorRange: 'Villas #11–18',
    roomNumbers: '#11–18',
    description:
      'Freestanding villa over the stilt-house waters with king bed, private plunge pool, and bespoke daybed facing the Inle dawn. Breakfast and boat dock included.',
    maxGuests: 3,
    bedConfiguration: 'King + Daybed',
    areaSqm: 88,
    amenities: ['Plunge pool', 'Lakeside deck', 'Breakfast included', 'Boat dock', 'Wi-Fi'],
    images: [
      { src: IMG.water, alt: 'Executive Garden Villa over Inle Lake' },
      { src: IMG.villaBathtub, alt: 'Private plunge pool' },
    ],
    rating: 5.0,
    reviewCount: 180,
    inventory: 8,
    tags: ['Ocean View'],
    blockoutRanges: [],
  },
  {
    id: 'lakeside-heritage-suite',
    hotelId: 'inle-lake',
    name: 'Lakeside Heritage Suite',
    category: 'Deluxe',
    wing: 'Heritage Jetty',
    floorRange: 'Suites #21–26',
    roomNumbers: '#21–26',
    description:
      'Boutique suite on the heritage jetty with four-poster king bed, stone bathtub and sunrise sitting balcony. Shan artisanal tea ritual on arrival.',
    maxGuests: 2,
    bedConfiguration: '1 King Bed',
    areaSqm: 55,
    amenities: ['Sunrise balcony', 'Stone bathtub', 'Tea ritual', 'Wi-Fi', 'Breakfast included'],
    images: [
      { src: IMG.bedroom, alt: 'Lakeside Heritage Suite four-poster bed' },
      { src: IMG.bathroom, alt: 'Stone bathtub' },
    ],
    rating: 5.0,
    reviewCount: 96,
    inventory: 6,
    tags: [],
    blockoutRanges: [],
  },
] as const;

export const ADD_ONS: AddOn[] = [
  {
    id: 'early-checkin',
    label: 'Guaranteed Early Check-in',
    category: 'privilege',
    price: 65000,
    description: 'Direct suite entry guaranteed from 11:00 AM (standard is 2:00 PM). Fresh espresso service on arrival.',
    icon: 'Clock',
  },
  {
    id: 'late-checkout',
    label: 'Late Check-out Privilege',
    category: 'privilege',
    price: 85000,
    description: 'Keep your suite until 4:00 PM on departure day (standard is 12:00 PM). Full access to pool & lounge.',
    icon: 'Sun',
  },
  {
    id: 'strand-club',
    label: 'Strand Club Access',
    category: 'concierge',
    price: 45000,
    description: 'Complimentary evening cocktails at the private harbour pavilion (5:30–7:30 PM).',
    icon: 'Sparkles',
  },
  {
    id: 'butler',
    label: '24/7 Dedicated Butler',
    category: 'concierge',
    price: 45000,
    description: 'Instant WhatsApp concierge and garment pressing on arrival included.',
    icon: 'ConciergeBell',
  },
  {
    id: 'airport-transfer',
    label: 'Airport Limousine Transfer',
    category: 'transport',
    price: 150000,
    description: "Yangon Int'l Airport private greeting with uniformed chauffeur. Chilled hand towels included.",
    icon: 'Car',
  },
  {
    id: 'champagne-platter',
    label: 'Champagne & Fruit Platter',
    category: 'indulgence',
    price: 180000,
    description: 'Chilled champagne with fresh artisanal tropical fruit platter prepared in suite.',
    icon: 'Wine',
  },
];

export const FEATURED_ROOM_IDS: string[] = [
  'deluxe-azure-suite',
  'executive-garden-villa',
  'urban-studio',
];

function roomById(id: string): Room {
  const room = ROOMS.find((r) => r.id === id);
  if (!room) throw new Error(`Seed error: unknown room "${id}"`);
  return room;
}

function hotelById(id: string): Hotel {
  const hotel = HOTELS.find((h) => h.id === id);
  if (!hotel) throw new Error(`Seed error: unknown hotel "${id}"`);
  return hotel;
}

function buildSeedBooking(params: {
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  ratePlanId: RatePlanId;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  guestName: string;
  email: string;
  phone: string;
  createdAt: string;
  addOnIds?: string[];
  roomNumber?: string;
  reference?: string;
  transactionId?: string;
  cancelledAt?: string;
  cancelRefundAmount?: number;
  folioYear?: string;
}): Booking {
  const room = roomById(params.roomId);
  const hotel = hotelById(room.hotelId);
  const ratePlan = ratePlansForRoom(room)[params.ratePlanId];
  const nights = Math.max(1, Math.round((Date.parse(params.checkOut) - Date.parse(params.checkIn)) / 86_400_000));
  const addOns = (params.addOnIds ?? []).map((id) => {
    const addOn = ADD_ONS.find((a) => a.id === id);
    if (!addOn) throw new Error(`Seed error: unknown add-on "${id}"`);
    return addOn;
  });
  const reference = params.reference ?? generateReference();
  const checkIn = params.checkIn;
  const pin = generatePin();
  const price = computeBreakdown({ ratePlan, nights, addOns });
  return {
    reference,
    folioId: generateFolioId(2026),
    pin,
    draftKey: `seed-${reference}`,
    hotel,
    room,
    stay: { checkIn, checkOut: params.checkOut },
    nights,
    adults: params.adults,
    rooms: 1,
    ratePlan,
    addOns,
    guest: {
      fullName: params.guestName,
      email: params.email,
      phoneCountryCode: '+95',
      phone: params.phone,
      estimatedArrival: '14:00 - 16:00',
      preferences: {
        highFloor: false,
        quietRoom: false,
        lateCheckIn: false,
        featherFreePillows: false,
        celebrationNote: false,
      },
      conNotes: '',
      agreeToTerms: true,
    },
    price,
    status: params.status,
    paymentMethod: params.paymentMethod,
    paymentStatus: params.paymentStatus,
    transactionId: params.transactionId,
    roomNumber: params.roomNumber,
    cancelRefundAmount: params.cancelRefundAmount,
    cancelledAt: params.cancelledAt,
    createdAt: params.createdAt,
  };
}

export function defaultNightly(room: Room): number {
  switch (room.id) {
    case 'deluxe-azure-suite':
      return 220000;
    case 'executive-ocean-suite':
      return 340000;
    case 'heritage-junior-suite':
      return 185000;
    case 'signature-villa':
      return 380000;
    case 'presidential-garden-villa':
      return 520000;
    case 'urban-studio':
      return 165000;
    case 'urban-executive-suite':
      return 240000;
    case 'executive-garden-villa':
      return 240000;
    case 'lakeside-heritage-suite':
      return 310000;
    default:
      return 200000;
  }
}

/** Rate plans available for a room, derived from its base flexible nightly rate. */
export function ratePlansForRoom(room: Room): Record<RatePlanId, RatePlan> {
  const wellnessEligible = room.id === 'deluxe-azure-suite' || room.category === 'Villa';
  return buildRatePlans(defaultNightly(room), wellnessEligible);
}

/** Apply the demo date blocks (e.g. Presidential Garden Villa fully booked). */
export function applyDemoBlockouts(rooms: Room[]): Room[] {
  const d = demoDates();
  return rooms.map((room) => {
    if (room.id === 'presidential-garden-villa') {
      return {
        ...room,
        blockoutRanges: [
          ...room.blockoutRanges,
          { checkIn: d.villaBlockStart, checkOut: d.villaBlockEnd },
        ],
      };
    }
    return room;
  });
}

function buildSeedBookings(): Booking[] {
  const d = demoDates();
  return [
    buildSeedBooking({
      roomId: 'deluxe-azure-suite',
      checkIn: d.upcomingCheckIn,
      checkOut: d.upcomingCheckOut,
      adults: 2,
      ratePlanId: 'flexible',
      status: 'confirmed',
      paymentMethod: 'KBZPAY',
      paymentStatus: 'paid',
      guestName: 'Thant Zin',
      email: 'thant.zin@example.com',
      phone: '9 798 123 456',
      createdAt: subtractISO(d.upcomingCheckIn, 7),
      reference: 'SF-89241-K7',
      transactionId: 'KBZ-892401',
      folioYear: '2026',
    }),
    buildSeedBooking({
      roomId: 'executive-ocean-suite',
      checkIn: d.activeCheckIn,
      checkOut: d.activeCheckOut,
      adults: 2,
      ratePlanId: 'flexible',
      status: 'checked_in',
      paymentMethod: 'KBZPAY',
      paymentStatus: 'settled',
      guestName: 'Thant Zin',
      email: 'thant.zin@example.com',
      phone: '9 798 123 456',
      createdAt: subtractISO(d.activeCheckIn, 30),
      roomNumber: '402',
      reference: 'SF-2026-8812',
      transactionId: 'KBZ-771205',
      folioYear: '2026',
    }),
    buildSeedBooking({
      roomId: 'deluxe-azure-suite',
      checkIn: d.pastCheckIn,
      checkOut: d.pastCheckOut,
      adults: 2,
      ratePlanId: 'saver',
      status: 'checked_out',
      paymentMethod: 'WAVEPAY',
      paymentStatus: 'settled',
      guestName: 'Thant Zin',
      email: 'thant.zin@example.com',
      phone: '9 798 123 456',
      createdAt: subtractISO(d.pastCheckIn, 20),
      reference: 'SF-71092-P4',
      transactionId: 'WV-1209-3X',
      folioYear: '2026',
    }),
    buildSeedBooking({
      roomId: 'heritage-junior-suite',
      checkIn: subtractISO(todayPlus(0), 14),
      checkOut: addDaysISO(subtractISO(todayPlus(0), 14), 2),
      adults: 2,
      ratePlanId: 'flexible',
      status: 'cancelled',
      paymentMethod: 'WAVEPAY',
      paymentStatus: 'refunded',
      guestName: 'Thant Zin',
      email: 'thant.zin@example.com',
      phone: '9 798 123 456',
      createdAt: subtractISO(todayPlus(0), 18),
      reference: 'SF-2026-7104',
      cancelledAt: subtractISO(todayPlus(0), 16),
      cancelRefundAmount: 450000,
      transactionId: 'WV-0902-OK',
      folioYear: '2026',
    }),
  ];
}

/** Single cached seed computation so booking refs match across bookings + requests. */
export const SEED_BOOKINGS: Booking[] = buildSeedBookings();
const seededActive = SEED_BOOKINGS[1];

export function buildSeedServiceRequests(): ServiceRequest[] {
  const now = new Date();
  const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
  const active = seededActive;

  return [
    {
      id: 'SR-1049',
      reservationReference: active.reference,
      category: 'extra_towels',
      categoryLabel: 'Extra Towels & Amenities',
      details:
        'Please provide 2 additional bath towels and 1 set of extra bathroom amenities. Thank you!',
      deliveryTime: 'Immediate',
      status: 'in_transit',
      createdAt: minsAgo(8),
      updatedAt: minsAgo(1),
      staffName: 'Daw May Thu (Housekeeping Team)',
      expectedArrival: '14:45',
    },
    {
      id: 'SR-1045',
      reservationReference: active.reference,
      category: 'minibar',
      categoryLabel: 'Fresh Drinking Water',
      details: '4 glass bottles of still water',
      deliveryTime: 'Next 10–15 mins',
      status: 'in_transit',
      createdAt: minsAgo(25),
      updatedAt: minsAgo(5),
      staffName: 'Housekeeping Runner',
    },
    {
      id: 'SR-1012',
      reservationReference: active.reference,
      category: 'maintenance',
      categoryLabel: 'AC Temperature Calibration',
      details: 'Thermostat checked; recalibrated to 24°C.',
      deliveryTime: 'Immediate',
      status: 'completed',
      createdAt: new Date(now.getTime() - 3 * 3600_000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 3600_000).toISOString(),
      staffName: 'Engineering Tech Ko Aung',
    },
    {
      id: 'SR-1008',
      reservationReference: active.reference,
      category: 'other',
      categoryLabel: 'Luggage Assistance',
      details: 'Porter reserved for checkout morning.',
      deliveryTime: 'Tomorrow Morning',
      status: 'pending',
      createdAt: minsAgo(90),
      updatedAt: minsAgo(90),
      staffName: 'Front Desk',
    },
  ];
}