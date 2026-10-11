import type { AvailabilityInfo, Booking, Room, StayRange } from '@/types';
import { nightsBetween } from '@/lib/dates';

export function rangesOverlap(a: StayRange, b: StayRange): boolean {
  return a.checkIn < b.checkOut && b.checkIn < a.checkOut;
}

const ACTIVE_STATUSES: Booking['status'][] = ['confirmed', 'checked_in'];

/**
 * Frontend availability estimate. The backend remains the source of truth —
 * this only powers the UI and is re-verified by the booking service.
 */
export function computeAvailability(
  room: Room,
  stay: StayRange,
  bookings: Booking[],
): AvailabilityInfo {
  if (nightsBetween(stay.checkIn, stay.checkOut) <= 0) {
    return { available: false, roomsLeft: 0, reason: 'no_dates' };
  }

  const blocked = room.blockoutRanges.some((range) => rangesOverlap(range, stay));
  if (blocked) {
    return { available: false, roomsLeft: 0, reason: 'sold_out' };
  }

  const heldUnits = new Set<string>();
  for (const booking of bookings) {
    if (booking.room.id !== room.id) continue;
    if (!ACTIVE_STATUSES.includes(booking.status)) continue;
    if (!rangesOverlap(booking.stay, stay)) continue;
    heldUnits.add(booking.reference);
  }

  const roomsLeft = Math.max(0, room.inventory - heldUnits.size);
  return {
    available: roomsLeft > 0,
    roomsLeft,
    reason: roomsLeft > 0 ? undefined : 'sold_out',
  };
}

/** Aggregated availability across a room type for the given range. */
export function aggregateAvailability(
  rooms: Room[],
  stay: StayRange,
  bookings: Booking[],
): Map<string, AvailabilityInfo> {
  const map = new Map<string, AvailabilityInfo>();
  for (const room of rooms) {
    map.set(room.id, computeAvailability(room, stay, bookings));
  }
  return map;
}