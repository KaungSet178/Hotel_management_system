import type {
  Booking,
  BookingRequest,
  CheckoutEntry,
  Folio,
  Room,
  ServiceRequest,
} from '@/types';
import { addDays, shortDate, todayIso } from '@/lib/format';

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
    status: 'RESERVED', guestName: 'Dr. Kenneth Holmes', bookingRef: '#SF-9512',
  },
  {
    id: 'r412', number: '412', floor: 4, category: 'Executive Ocean Panorama',
    beds: '1 Super King', maxGuests: 2, size: 56, wing: 'Penthouse Level',
    pricePerNight: 340000, amenities: ['Ocean Panorama', 'Free High-Speed Wi-Fi', 'Breakfast Inc.'],
    status: 'OCCUPIED', guestName: 'Khin Myat Noe', departsAt: shortDate(todayIso(), true), bookingRef: '#SF-9482',
  },
  {
    id: 'r102', number: '102', floor: 1, category: 'Deluxe Courtyard',
    beds: '1 Queen Bed', maxGuests: 2, size: 32, wing: 'Garden Wing',
    pricePerNight: 170000, amenities: ['Courtyard View', 'Free High-Speed Wi-Fi'],
    status: 'RESERVED', guestName: 'Kaung Sat', bookingRef: '#SF-73685-DC',
  },
  {
    id: 'r402', number: '402', floor: 4, category: 'Deluxe Azure Suite',
    beds: '1 King Bed', maxGuests: 2, size: 41, wing: 'Sea Breeze Wing',
    pricePerNight: 220000, amenities: ['Harbor View', 'Free High-Speed Wi-Fi', 'Breakfast Inc.'],
    status: 'AVAILABLE',
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
    status: 'AVAILABLE',
  },
  {
    id: 'r308', number: '308', floor: 3, category: 'Deluxe Azure Suite',
    beds: '1 King Bed', maxGuests: 2, size: 40, wing: 'Sea Breeze Wing',
    pricePerNight: 210000, amenities: ['Harbor View', 'Free High-Speed Wi-Fi'],
    status: 'AVAILABLE',
  },
  {
    id: 'r512', number: '512', floor: 5, category: 'Presidential Villa',
    beds: '1 Super King', maxGuests: 3, size: 82, wing: 'Penthouse Level',
    pricePerNight: 520000, amenities: ['Private Pool', 'Ocean Panorama', 'Butler Service'],
    status: 'OCCUPIED', guestName: 'Elena Rostova', departsAt: '16 Oct 2026', bookingRef: '#SF-9512-EL',
  },
  {
    id: 'r501', number: '501', floor: 5, category: 'Governor Suite',
    beds: '1 Super King', maxGuests: 3, size: 68, wing: 'Penthouse Level',
    pricePerNight: 460000, amenities: ['Ocean Panorama', 'Free High-Speed Wi-Fi', 'Breakfast Inc.'],
    status: 'OCCUPIED', guestName: 'Jean-Luc Meyer', departsAt: '16 Oct 2026', bookingRef: '#SF-9501',
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
    ref: '#SF-9501', guestName: 'Jean-Luc Meyer', adults: 2,
    room: 'Room 501', roomCategory: 'Governor Suite',
    checkIn: todayIso(), checkOut: addDays(todayIso(), 3), nights: 3,
    status: 'CHECKED_IN', payment: 'PREPAID', amount: 1850000,
  },
  {
    ref: '#SF-9482', guestName: 'Khin Myat Noe', adults: 1,
    room: 'Room 412', roomCategory: 'Executive Ocean Panorama',
    checkIn: addDays(todayIso(), -3), checkOut: todayIso(), nights: 3,
    status: 'CHECKED_IN', payment: 'PREPAID', amount: 1020000,
  },
  {
    ref: '#SF-9512-EL', guestName: 'Elena Rostova', adults: 2,
    room: 'Room 512', roomCategory: 'Presidential Villa',
    checkIn: todayIso(), checkOut: addDays(todayIso(), 3), nights: 3,
    status: 'CHECKED_IN', payment: 'PREPAID', amount: 1560000,
  },
  {
    ref: '#SF-9510', guestName: 'Thant Zin Oo', adults: 2,
    room: 'Room 304', roomCategory: 'Deluxe Azure',
    checkIn: todayIso(), checkOut: addDays(todayIso(), 3), nights: 3,
    status: 'CONFIRMED', payment: 'PREPAID', amount: 759000,
    phone: '+95 9 798 123 456',
    request: 'Quiet upper floor requested for wedding anniversary. Complimentary fruit basket ordered.',
  },
  {
    ref: '#SF-9470', guestName: 'Ei Ei Chaw', adults: 1,
    room: 'Room 208', roomCategory: 'Garden Balcony',
    checkIn: addDays(todayIso(), -2), checkOut: todayIso(), nights: 2,
    status: 'CHECKED_OUT', payment: 'PREPAID', amount: 520000,
  },
  {
    ref: '#SF-9462', guestName: 'Dr. Kenneth Holmes', adults: 1,
    room: 'Released', roomCategory: 'Heritage Superior',
    checkIn: todayIso(), checkOut: addDays(todayIso(), 4), nights: 4,
    status: 'CANCELLED', payment: 'FEE_SETTLED', amount: 120000,
  },
];

export const initialRequests: BookingRequest[] = [
  {
    ref: '#SF-2026-9510', shortRef: 'SF-9510', guestName: 'Thant Zin Oo',
    phone: '+95 9 798 123 456', nrc: '12/LAMATA(N)089211', tier: 'Elite VIP',
    room: 'Suite 304', roomCategory: 'Deluxe Azure Suite',
    stay: 'Today – 3 Nights', nights: 3, amount: 759000,
    channel: 'KBZPay Quick Pay', state: 'CONFIRMED', ago: '12m ago',
    note: 'Celebrating wedding anniversary. Requesting quiet high floor with harbor view. Arriving via private transfer ~14:00.',
    slip: {
      txnRef: 'KBZ-PAY-2026-9481-QK9', amount: 759000, payer: 'Thant Zin Oo',
      recipient: 'StayEase Hospitality Co., Ltd', timestamp: '13 Oct 2026, 14:18 MMT',
    },
  },
  {
    ref: '#SF-2026-9508', shortRef: 'SF-9508', guestName: 'Jean-Luc Meyer',
    phone: '+95 9 880 411 90', tier: 'VIP',
    room: 'Governor Suite 501', roomCategory: 'Governor Suite',
    stay: '14–19 Oct (5N)', nights: 5, amount: 1850000,
    channel: 'KBZPay', state: 'CONFIRMED', ago: '2h ago',
    note: 'QR pass #QP-501-88 dispatched to guest mobile.',
    slip: {
      txnRef: 'KBZ-PAY-2026-9508-QP1', amount: 1850000, payer: 'Jean-Luc Meyer',
      recipient: 'StayEase Hospitality Co., Ltd', timestamp: '13 Oct 2026, 12:06 MMT',
    },
  },
  {
    ref: '#SF-2026-9506', shortRef: 'SF-9506', guestName: 'Daw Than Than Swe',
    phone: '+95 9 512 009 74', tier: 'VIP',
    room: 'Heritage 208', roomCategory: 'Heritage Junior Suite',
    stay: 'Today – 3 Nights', nights: 3, amount: 555000,
    channel: 'KBZPay Quick Pay', state: 'CONFIRMED', ago: '45m ago',
    note: 'QR pass #QP-208-56 dispatched to guest mobile.',
    slip: {
      txnRef: 'KBZ-PAY-2026-9506-QK6', amount: 555000, payer: 'Daw Than Than Swe',
      recipient: 'StayEase Hospitality Co., Ltd', timestamp: '13 Oct 2026, 13:50 MMT',
    },
  },
  {
    ref: '#SF-2026-9499', shortRef: 'SF-9499', guestName: 'Aung Kyaw Min',
    phone: '+95 9 622 880 31', tier: 'Standard',
    room: 'Standard Twin 102', roomCategory: 'Standard Twin',
    stay: 'Check-in: 20 Oct', nights: 2, amount: 300000,
    channel: 'KBZPay', state: 'REJECTED', ago: '3h ago',
    note: 'Slip unreadable and transfer amount does not match booking total.',
  },
];

export const initialServiceRequests: ServiceRequest[] = [
  {
    id: 'SR-1054', room: '308', category: 'Maintenance',
    title: 'AC Thermostat Calibration', guest: 'U Kyaw Zayar',
    ago: '12m ago', quote: 'Master bedroom unit freezing at 18°C, unable to adjust upward from the wall panel.',
    charge: 0, urgency: 'URGENT', state: 'PENDING',
  },
  {
    id: 'SR-1053', room: '512', category: 'In-Room Pantry',
    title: 'Sparkling Water & Ice Bucket', guest: 'Elena Rostova',
    ago: '7m ago', quote: 'San Pellegrino 750ml x 2 bottles, fresh bucket of ice, and 2 crystal glasses.',
    charge: 25000, state: 'PENDING',
  },
  {
    id: 'SR-1049', room: '402', category: 'Housekeeping',
    title: 'Extra Towels & Linens', guest: 'Thant Zin Oo',
    ago: '12 mins ago', quote: 'Please provide 2 additional bath towels and 1 set of extra bathroom botanical amenities.',
    charge: 0, assignee: 'Daw May Thu · En route Floor 4', state: 'IN_PROGRESS',
  },
  {
    id: 'SR-1048', room: '106', category: 'Concierge',
    title: 'Universal Power Adapter (UK)', guest: 'Michael Chang',
    ago: '18 mins ago', quote: 'Requested standard 3-pin UK laptop plug adapter from Concierge stock.',
    charge: 0, assignee: 'Ko Kyaw', state: 'IN_PROGRESS',
  },
  {
    id: 'SR-1041', room: '118', category: 'Bell Captain',
    title: 'Luggage Assistance / Downstairs', guest: 'Sophie Martin',
    ago: '25 mins ago', quote: '3 hard-shell bags for 11:30 airport transfer. Cart staged at elevator.',
    charge: 5000, assignee: 'Porter Desk', state: 'IN_PROGRESS',
  },
  {
    id: 'SR-1010', room: '501', category: 'Housekeeping',
    title: 'Welcome Fruit Platter Replenish', guest: 'Penthouse Loft',
    ago: 'Handled at 09:22', quote: 'Fresh seasonal rambutan and dragonfruit platter delivered with chef welcome note.',
    charge: 35000, assignee: 'Handled by Ma Hnin', state: 'COMPLETED',
  },
];

export const initialFolio: Folio = {
  guestName: 'Khin Myat Noe',
  room: 'Room 412',
  roomCategory: 'Executive Ocean Panorama',
  checkIn: addDays(todayIso(), -3),
  checkOut: todayIso(),
  nights: 3,
  roomCharges: 1020000,
  roomChargesPaid: true,
  incidentals: 45000,
  taxes: 15000,
};

/** Latest walk-in folio shown in the quick-confirmation strip. */
export interface WalkInRecord {
  folio: string;
  guestName: string;
  room: string;
}

export const initialWalkIn: WalkInRecord = {
  folio: '#SF-2026-9502',
  guestName: 'Aung San Lin',
  room: 'Room 306',
};

/**
 * Rooms currently in-house, each with a folio ready for check-out settlement.
 */
const CHECKOUT_REFS: Record<string, string> = {
  '412': '#SF-9482',
  '501': '#SF-9501',
  '512': '#SF-9512-EL',
};

export function buildCheckoutEntries(
  customRooms?: Room[],
  customBookings?: Booking[],
  today = todayIso(),
): CheckoutEntry[] {
  const roomsToUse = customRooms ?? initialRooms;
  const bookingsToUse = customBookings ?? initialBookings;
  const entries: CheckoutEntry[] = [];

  for (const room of roomsToUse) {
    if (room.status !== 'OCCUPIED') continue;

    const booking = bookingsToUse.find(
      (b) =>
        b.status === 'CHECKED_IN' &&
        Boolean(b.room && (b.room === `Room ${room.number}` || b.room === room.number || b.room.includes(room.number))),
    );

    // Check-out dashboard is meant for displaying today's check out list.
    // If a guest has an active booking whose check-out date is in the future (> today),
    // they are NOT due for check-out today!
    if (booking && booking.checkOut > today) {
      continue;
    }

    // If room has an explicit future departure date (e.g. "16 Oct 2026" or "Departs: 2026-10-16"), skip it
    if (room.departsAt) {
      const matchIso = room.departsAt.match(/\d{4}-\d{2}-\d{2}/)?.[0];
      if (matchIso && matchIso > today) {
        continue;
      }
      if (!booking && !room.departsAt.includes(today) && !room.departsAt.includes(shortDate(today, true).split(' ')[0])) {
        continue;
      }
    }

    // If no booking was found and room does not depart today, skip it
    if (!booking && !room.departsAt?.includes(today) && !room.departsAt?.includes(shortDate(today))) {
      continue;
    }

    const bookingRef = booking ? booking.ref : (CHECKOUT_REFS[room.number] ?? `#SF-94${room.number}`);
    const checkInDate = booking?.checkIn ?? addDays(today, -3);
    const checkOutDate = booking?.checkOut ?? today;
    const diffNights = Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000);
    const nights = Math.max(1, booking?.nights ?? (diffNights || 1));
    const roomCharges = room.pricePerNight * nights;
    const incidentals = Math.round(roomCharges * 0.1);
    const taxes = Math.round((roomCharges + incidentals) * 0.05);

    const folio: Folio = {
      guestName: booking?.guestName ?? room.guestName ?? 'In-house guest',
      room: `Room ${room.number}`,
      roomCategory: room.category,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
      roomCharges,
      roomChargesPaid: true,
      incidentals,
      taxes,
    };

    entries.push({ roomId: room.id, bookingRef, folio, settled: false });
  }

  // Also include any in-house booking scheduled for check-out today even if room status has slight delay
  for (const b of bookingsToUse) {
    if (b.status === 'CHECKED_IN' && b.checkOut <= today && b.room) {
      const roomNum = b.room.replace(/[^0-9]/g, '');
      const alreadyAdded = entries.some((e) => e.bookingRef === b.ref || (roomNum && e.folio.room.includes(roomNum)));
      if (!alreadyAdded) {
        const room = roomsToUse.find((r) => r.number === roomNum);
        const roomId = room?.id ?? `room-${roomNum || 'default'}`;
        const pricePerNight = room?.pricePerNight ?? Math.round(b.amount / (b.nights || 1));
        const roomCharges = pricePerNight * b.nights;
        const incidentals = Math.round(roomCharges * 0.1);
        const taxes = Math.round((roomCharges + incidentals) * 0.05);

        entries.push({
          roomId,
          bookingRef: b.ref,
          folio: {
            guestName: b.guestName,
            room: b.room,
            roomCategory: b.roomCategory ?? room?.category ?? 'Deluxe',
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            nights: b.nights,
            roomCharges,
            roomChargesPaid: true,
            incidentals,
            taxes,
          },
          settled: false,
        });
      }
    }
  }

  return entries;
}