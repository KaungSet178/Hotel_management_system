import type {
  Booking,
  BookingRequest,
  Folio,
  Room,
  ServiceRequest,
} from '@/types';

export const LOCALE = {
  property: 'Yangon Heritage',
  desk: 'Front Desk Ops',
  shift: 'Morning Shift',
  deskNumber: 'Desk 01',
  staffName: 'Daw Nu Nu',
  staffRole: 'Senior Receptionist',
  staffInitials: 'DN',
};

export const initialRooms: Room[] = [
  {
    id: 'r306', number: '306', floor: 3, category: 'Deluxe Azure Suite',
    beds: '1 King Bed', maxGuests: 2, size: 42, wing: 'Sea Breeze Wing',
    pricePerNight: 220000, amenities: ['Harbor View', 'Free High-Speed Wi-Fi', 'Breakfast Inc.'],
    status: 'AVAILABLE',
  },
  {
    id: 'r304', number: '304', floor: 3, category: 'Deluxe Azure Suite',
    beds: '1 King Bed', maxGuests: 2, size: 40, wing: 'Garden Wing',
    pricePerNight: 210000, amenities: ['Garden Terrace', 'Free High-Speed Wi-Fi', 'Espresso Machine'],
    status: 'AVAILABLE',
  },
  {
    id: 'r208', number: '208', floor: 2, category: 'Heritage Junior Suite',
    beds: '2 Twin Beds', maxGuests: 2, size: 38, wing: 'East Corridor',
    pricePerNight: 185000, amenities: ['Courtyard View', 'Free High-Speed Wi-Fi', 'Kettle & Drip Coffee'],
    status: 'OCCUPIED', guestName: 'Daw Thida', departsAt: 'Tomorrow, 19 Oct at 12:00 PM',
  },
  {
    id: 'r412', number: '412', floor: 4, category: 'Executive Ocean Panorama',
    beds: '1 Super King', maxGuests: 2, size: 56, wing: 'Penthouse Level',
    pricePerNight: 340000, amenities: ['Ocean Panorama', 'Free High-Speed Wi-Fi', 'Breakfast Inc.'],
    status: 'RESERVED', guestName: 'Arriving 19 Oct – 24 Oct', bookingRef: '#SF-8891',
  },
  {
    id: 'r102', number: '102', floor: 1, category: 'Deluxe Courtyard',
    beds: '1 Queen Bed', maxGuests: 2, size: 32, wing: 'Garden Wing',
    pricePerNight: 170000, amenities: ['Courtyard View', 'Free High-Speed Wi-Fi'],
    status: 'MAINTENANCE', workOrder: 'Work Order #WO-402: Central AC System Servicing (Until 20 Oct)',
  },
  {
    id: 'r402', number: '402', floor: 4, category: 'Deluxe Azure Suite',
    beds: '1 King Bed', maxGuests: 2, size: 41, wing: 'Sea Breeze Wing',
    pricePerNight: 220000, amenities: ['Harbor View', 'Free High-Speed Wi-Fi', 'Breakfast Inc.'],
    status: 'OCCUPIED', guestName: 'Thant Zin Oo',
  },
  {
    id: 'r106', number: '106', floor: 1, category: 'Heritage Superior',
    beds: '1 Queen Bed', maxGuests: 2, size: 34, wing: 'Garden Wing',
    pricePerNight: 175000, amenities: ['Garden Terrace', 'Free High-Speed Wi-Fi'],
    status: 'AVAILABLE',
  },
  {
    id: 'r118', number: '118', floor: 1, category: 'Deluxe Courtyard',
    beds: '2 Twin Beds', maxGuests: 2, size: 33, wing: 'East Corridor',
    pricePerNight: 165000, amenities: ['Courtyard View', 'Kettle & Drip Coffee'],
    status: 'OCCUPIED', guestName: 'Sophie Martin',
  },
  {
    id: 'r308', number: '308', floor: 3, category: 'Deluxe Azure Suite',
    beds: '1 King Bed', maxGuests: 2, size: 40, wing: 'Sea Breeze Wing',
    pricePerNight: 210000, amenities: ['Harbor View', 'Free High-Speed Wi-Fi'],
    status: 'OCCUPIED', guestName: 'U Kyaw Zayar',
  },
  {
    id: 'r512', number: '512', floor: 5, category: 'Presidential Villa',
    beds: '1 Super King', maxGuests: 3, size: 82, wing: 'Penthouse Level',
    pricePerNight: 520000, amenities: ['Private Pool', 'Ocean Panorama', 'Butler Service'],
    status: 'OCCUPIED', guestName: 'Elena Rostova',
  },
  {
    id: 'r501', number: '501', floor: 5, category: 'Governor Suite',
    beds: '1 Super King', maxGuests: 3, size: 68, wing: 'Penthouse Level',
    pricePerNight: 460000, amenities: ['Ocean Panorama', 'Free High-Speed Wi-Fi', 'Breakfast Inc.'],
    status: 'OCCUPIED', guestName: 'Jean-Luc Meyer',
  },
  {
    id: 'r215', number: '215', floor: 2, category: 'Garden Balcony',
    beds: '1 King Bed', maxGuests: 2, size: 36, wing: 'Garden Wing',
    pricePerNight: 190000, amenities: ['Private Balcony', 'Free High-Speed Wi-Fi'],
    status: 'AVAILABLE',
  },
  {
    id: 'r411', number: '411', floor: 4, category: 'Executive Ocean Panorama',
    beds: '1 Super King', maxGuests: 2, size: 54, wing: 'Penthouse Level',
    pricePerNight: 330000, amenities: ['Ocean Panorama', 'Free High-Speed Wi-Fi'],
    status: 'AVAILABLE',
  },
  {
    id: 'r101', number: '101', floor: 1, category: 'Deluxe Courtyard',
    beds: '1 Queen Bed', maxGuests: 2, size: 31, wing: 'Garden Wing',
    pricePerNight: 165000, amenities: ['Courtyard View', 'Free High-Speed Wi-Fi'],
    status: 'AVAILABLE',
  },
  {
    id: 'r110', number: '110', floor: 1, category: 'Standard Twin',
    beds: '2 Twin Beds', maxGuests: 2, size: 30, wing: 'East Corridor',
    pricePerNight: 150000, amenities: ['Free High-Speed Wi-Fi'],
    status: 'AVAILABLE',
  },
  {
    id: 'r414', number: '414', floor: 4, category: 'Executive Ocean Panorama',
    beds: '1 Super King', maxGuests: 2, size: 55, wing: 'Penthouse Level',
    pricePerNight: 335000, amenities: ['Ocean Panorama', 'Free High-Speed Wi-Fi'],
    status: 'AVAILABLE',
  },
];

export const initialBookings: Booking[] = [
  {
    ref: '#SF-9481', guestName: 'Thant Zin Oo', adults: 2,
    room: 'Room 304', roomCategory: 'Deluxe Azure',
    checkIn: '2025-10-18', checkOut: '2025-10-21', nights: 3,
    status: 'CONFIRMED', payment: 'PREPAID', amount: 759000,
    phone: '+95 9 798 123 456',
    request: 'Quiet upper floor requested for wedding anniversary. Complimentary fruit basket ordered.',
  },
  {
    ref: '#SF-9482', guestName: 'Khin Myat Noe', adults: 1,
    room: 'Room 412', roomCategory: 'Heritage Exec',
    checkIn: '2025-10-18', checkOut: '2025-10-19', nights: 1,
    status: 'CHECKED_IN', payment: 'PAY_AT_HOTEL', amount: 480000,
  },
  {
    ref: '#SF-9479', guestName: 'Jean-Luc Meyer', adults: 2,
    room: 'Room 501', roomCategory: 'Governor Suite',
    checkIn: '2025-10-18', checkOut: '2025-10-23', nights: 5,
    status: 'CONFIRMED', payment: 'PREPAID', amount: 1850000,
  },
  {
    ref: '#SF-9475', guestName: 'Aung Kyaw Min', adults: 2,
    room: 'Unassigned', roomCategory: 'Standard Twin',
    checkIn: '2025-10-18', checkOut: '2025-10-20', nights: 2,
    status: 'PENDING', payment: 'PAY_AT_HOTEL', amount: 380000,
  },
  {
    ref: '#SF-9470', guestName: 'Ei Ei Chaw', adults: 1,
    room: 'Room 208', roomCategory: 'Garden Balcony',
    checkIn: '2025-10-16', checkOut: '2025-10-18', nights: 2,
    status: 'CHECKED_OUT', payment: 'PREPAID', amount: 520000,
  },
  {
    ref: '#SF-9462', guestName: 'Dr. Kenneth Holmes', adults: 1,
    room: 'Released', roomCategory: 'Heritage Superior',
    checkIn: '2025-10-18', checkOut: '2025-10-22', nights: 4,
    status: 'CANCELLED', payment: 'FEE_SETTLED', amount: 120000,
  },
];

export const initialRequests: BookingRequest[] = [
  {
    ref: '#SF-2025-9510', shortRef: 'SF-9510', guestName: 'Thant Zin Oo',
    phone: '+95 9 798 123 456', nrc: '12/LAMATA(N)089211', tier: 'Elite VIP',
    room: 'Suite 304', roomCategory: 'Deluxe Azure Suite',
    stay: '18–21 Oct (3N)', nights: 3, amount: 759000,
    channel: 'KBZPay Quick Pay', state: 'PROOF_UPLOADED', ago: '12m ago',
    note: 'Celebrating wedding anniversary. Requesting quiet high floor with harbor view. Arriving via private transfer ~14:00.',
    slip: {
      txnRef: 'KBZ-PAY-2025-9481-QK9', amount: 759000, payer: 'Thant Zin Oo',
      recipient: 'StayFlow Hospitality Co., Ltd', timestamp: '18 Oct 2025, 14:18 MMT',
    },
  },
  {
    ref: '#SF-2025-9512', shortRef: 'SF-9512', guestName: 'Dr. Kenneth Holmes',
    phone: '+95 9 745 200 118', tier: 'Standard',
    room: 'Heritage 208', roomCategory: 'Heritage Superior',
    stay: 'Today, 18 Oct', nights: 2, amount: 185000,
    channel: 'Pay at Hotel', state: 'PAY_AT_HOTEL', ago: 'Booked 28m ago',
    note: 'Valid ID on File. Room clean and ready for arrival.',
  },
  {
    ref: '#SF-2025-9515', shortRef: 'SF-9515', guestName: 'Daw May Thida',
    phone: '+95 9 400 221 45', tier: 'VIP',
    room: 'Suite 412 (Booked)', roomCategory: 'Executive Ocean Panorama',
    stay: '20–23 Oct (3N)', nights: 3, amount: 1020000,
    channel: 'WavePay', state: 'ROOM_CONFLICT', ago: '9m ago',
    note: 'Room 412 occupied for overlapping dates. Upgrade to Suite 414 confirmed option.',
  },
  {
    ref: '#SF-2025-9508', shortRef: 'SF-9508', guestName: 'Jean-Luc Meyer',
    phone: '+95 9 880 411 90', tier: 'VIP',
    room: 'Governor Suite 501', roomCategory: 'Governor Suite',
    stay: '19–24 Oct (5N)', nights: 5, amount: 1850000,
    channel: 'KBZPay', state: 'CONFIRMED', ago: '2h ago',
    note: 'QR pass #QP-501-88 dispatched to guest mobile.',
    slip: {
      txnRef: 'KBZ-PAY-2025-9508-QP1', amount: 1850000, payer: 'Jean-Luc Meyer',
      recipient: 'StayFlow Hospitality Co., Ltd', timestamp: '18 Oct 2025, 12:06 MMT',
    },
  },
  {
    ref: '#SF-2025-9506', shortRef: 'SF-9506', guestName: 'Daw Than Than Swe',
    phone: '+95 9 512 009 74', tier: 'VIP',
    room: 'Heritage 208', roomCategory: 'Heritage Junior Suite',
    stay: '18–21 Oct (3N)', nights: 3, amount: 555000,
    channel: 'KBZPay Quick Pay', state: 'CONFIRMED', ago: '45m ago',
    note: 'QR pass #QP-208-56 dispatched to guest mobile.',
    slip: {
      txnRef: 'KBZ-PAY-2025-9506-QK6', amount: 555000, payer: 'Daw Than Than Swe',
      recipient: 'StayFlow Hospitality Co., Ltd', timestamp: '18 Oct 2025, 13:50 MMT',
    },
  },
  {
    ref: '#SF-2025-9499', shortRef: 'SF-9499', guestName: 'Aung Kyaw Min',
    phone: '+95 9 622 880 31', tier: 'Standard',
    room: 'Standard Twin 102', roomCategory: 'Standard Twin',
    stay: 'Check-in: 25 Oct', nights: 2, amount: 300000,
    channel: 'KBZPay', state: 'REJECTED', ago: '3h ago',
    note: 'Policy breach — pay-at-hotel not eligible more than 24h before arrival.',
  },
];

export const initialServiceRequests: ServiceRequest[] = [
  {
    id: 'SR-1054', room: '308', category: 'Maintenance',
    title: 'AC Thermostat Calibration', guest: 'U Kyaw Zayar',
    ago: '12m ago', quote: 'Master bedroom unit freezing at 18°C, unable to adjust upward from the wall panel.',
    urgency: 'URGENT', state: 'PENDING',
  },
  {
    id: 'SR-1053', room: '512', category: 'In-Room Pantry',
    title: 'Sparkling Water & Ice Bucket', guest: 'Elena Rostova',
    ago: '7m ago', quote: 'San Pellegrino 750ml x 2 bottles, fresh bucket of ice, and 2 crystal glasses.',
    state: 'PENDING',
  },
  {
    id: 'SR-1049', room: '402', category: 'Housekeeping',
    title: 'Extra Towels & Linens', guest: 'Thant Zin Oo',
    ago: '12 mins ago', quote: 'Please provide 2 additional bath towels and 1 set of extra bathroom botanical amenities.',
    assignee: 'Daw May Thu · En route Floor 4', state: 'IN_PROGRESS',
  },
  {
    id: 'SR-1048', room: '106', category: 'Concierge',
    title: 'Universal Power Adapter (UK)', guest: 'Michael Chang',
    ago: '18 mins ago', quote: 'Requested standard 3-pin UK laptop plug adapter from Concierge stock.',
    assignee: 'Ko Kyaw', state: 'IN_PROGRESS',
  },
  {
    id: 'SR-1041', room: '118', category: 'Bell Captain',
    title: 'Luggage Assistance / Downstairs', guest: 'Sophie Martin',
    ago: '25 mins ago', quote: '3 hard-shell bags for 11:30 airport transfer. Cart staged at elevator.',
    assignee: 'Porter Desk', state: 'IN_PROGRESS',
  },
  {
    id: 'SR-1010', room: '501', category: 'Housekeeping',
    title: 'Welcome Fruit Platter Replenish', guest: 'Penthouse Loft',
    ago: 'Handled at 09:22', quote: 'Fresh seasonal rambutan and dragonfruit platter delivered with chef welcome note.',
    assignee: 'Handled by Ma Hnin', state: 'COMPLETED',
  },
];

export const initialFolio: Folio = {
  guestName: 'Thant Zin Oo',
  room: 'Room 402',
  roomCategory: 'Deluxe Azure Suite',
  checkIn: '2025-10-15',
  checkOut: '2025-10-18',
  nights: 3,
  roomCharges: 660000,
  roomChargesPaid: true,
  incidentals: 89000,
  taxes: 11000,
};

/** Latest walk-in folio shown in the quick-confirmation strip. */
export interface WalkInRecord {
  folio: string;
  guestName: string;
  room: string;
}

export const initialWalkIn: WalkInRecord = {
  folio: '#SF-2025-9502',
  guestName: 'Aung San Lin',
  room: 'Room 306',
};