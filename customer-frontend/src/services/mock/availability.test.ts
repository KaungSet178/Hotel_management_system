import { describe, expect, it } from 'vitest';
import { computeAvailability, rangesOverlap } from '@/services/mock/availability';
import type { Booking, Room, StayRange } from '@/types';

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'deluxe-azure-suite',
    hotelId: 'yangon-riverside',
    name: 'Deluxe Azure Suite',
    category: 'Deluxe',
    wing: 'Heritage Garden Level',
    floorRange: 'Rooms #304–308',
    roomNumbers: '#304–308',
    description: '',
    maxGuests: 2,
    bedConfiguration: '1 King Bed',
    areaSqm: 42,
    amenities: [],
    images: [],
    rating: 4.9,
    reviewCount: 10,
    inventory: 3,
    tags: [],
    blockoutRanges: [],
    ...overrides,
  };
}

function makeBooking(reference: string, stay: StayRange, status: Booking['status']): Booking {
  return {
    reference,
    stay,
    status,
    room: { id: 'deluxe-azure-suite' },
  } as unknown as Booking;
}

describe('rangesOverlap', () => {
  it('detects overlapping and touching-exclusive ranges', () => {
    const a: StayRange = { checkIn: '2026-10-16', checkOut: '2026-10-19' };
    expect(rangesOverlap(a, { checkIn: '2026-10-18', checkOut: '2026-10-21' })).toBe(true);
    expect(rangesOverlap(a, { checkIn: '2026-10-19', checkOut: '2026-10-22' })).toBe(false);
    expect(rangesOverlap(a, { checkIn: '2026-10-13', checkOut: '2026-10-16' })).toBe(false);
  });
});

describe('computeAvailability', () => {
  const stay: StayRange = { checkIn: '2026-10-16', checkOut: '2026-10-19' };

  it('reports sold out when a blockout range overlaps', () => {
    const room = makeRoom({ blockoutRanges: [{ checkIn: '2026-10-15', checkOut: '2026-10-17' }] });
    const info = computeAvailability(room, stay, []);
    expect(info.available).toBe(false);
    expect(info.reason).toBe('sold_out');
    expect(info.roomsLeft).toBe(0);
  });

  it('reduces rooms left by active overlapping bookings', () => {
    const room = makeRoom({ inventory: 3 });
    const bookings = [
      makeBooking('SF-1', { checkIn: '2026-10-16', checkOut: '2026-10-18' }, 'confirmed'),
      makeBooking('SF-2', { checkIn: '2026-10-17', checkOut: '2026-10-20' }, 'checked_in'),
    ];
    const info = computeAvailability(room, stay, bookings);
    expect(info.roomsLeft).toBe(1);
    expect(info.available).toBe(true);
  });

  it('ignores cancelled bookings and non-overlapping bookings', () => {
    const room = makeRoom({ inventory: 1 });
    const bookings = [
      makeBooking('SF-1', { checkIn: '2026-10-16', checkOut: '2026-10-18' }, 'cancelled'),
      makeBooking('SF-2', { checkIn: '2026-11-01', checkOut: '2026-11-03' }, 'confirmed'),
    ];
    const info = computeAvailability(room, stay, bookings);
    expect(info.available).toBe(true);
    expect(info.roomsLeft).toBe(1);
  });

  it('marks invalid date ranges as unavailable', () => {
    const room = makeRoom();
    const info = computeAvailability(room, { checkIn: '2026-10-16', checkOut: '2026-10-16' }, []);
    expect(info.available).toBe(false);
    expect(info.reason).toBe('no_dates');
  });

  it('reports sold out once active bookings exhaust inventory', () => {
    const room = makeRoom({ inventory: 1 });
    const bookings = [
      makeBooking('SF-1', { checkIn: '2026-10-16', checkOut: '2026-10-18' }, 'confirmed'),
    ];
    const info = computeAvailability(room, stay, bookings);
    expect(info.available).toBe(false);
    expect(info.roomsLeft).toBe(0);
  });
});
