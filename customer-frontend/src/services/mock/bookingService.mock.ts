import { AppError, ErrorCodes } from '../errors';
import { mockDb } from '@/mock/store';
import { ADD_ONS, HOTELS, ratePlansForRoom } from '@/mock/seed';
import { computeBreakdown, refundPercent } from '@/lib/pricing';
import { nightsBetween, todayISO } from '@/lib/dates';
import { generateFolioId, generatePin, generateReference } from '@/lib/refs';
import { submitPaymentProof } from '@/lib/paymentProofs';
import { grantAccess, getAccess } from '@/lib/access';
import { getSession, matchesProfile } from '@/lib/auth';
import { computeAvailability } from './availability';
import type { BookingService } from '../types';
import type { Booking, Room, ServiceResult } from '@/types';
import type { CreateBookingInput } from '../contracts';

const SIMULATED = { source: 'mock' as const, simulated: true };

function delay<T>(value: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function result<T>(data: T): ServiceResult<T> {
  return { data, meta: SIMULATED };
}

/**
 * Recompute price + build a booking from raw selections. The client never
 * supplies the trusted total; this mirrors what the backend will do.
 */
function materialize(input: CreateBookingInput): Booking {
  const hotel = HOTELS.find((h) => h.id === input.hotelId);
  if (!hotel) throw new AppError('Hotel not found', ErrorCodes.NOT_FOUND, 404);
  const room = mockDb.rooms().find((r) => r.id === input.roomId);
  if (!room) throw new AppError('Room not found', ErrorCodes.NOT_FOUND, 404);

  const nights = nightsBetween(input.checkIn, input.checkOut);
  if (nights <= 0) throw new AppError('Check-out must be after check-in', ErrorCodes.INVALID_INPUT);

  const availability = computeAvailability(room, { checkIn: input.checkIn, checkOut: input.checkOut }, mockDb.get().bookings);
  if (!availability.available) {
    throw new AppError('This room is no longer available for the selected dates.', ErrorCodes.SOLD_OUT, 409);
  }

  const ratePlans = ratePlansForRoom(room);
  const ratePlan = ratePlans[input.ratePlanId];
  if (!ratePlan) throw new AppError('Rate plan not found', ErrorCodes.INVALID_INPUT, 400);

  const addOns = input.addOnIds
    .map((id) => ADD_ONS.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const price = computeBreakdown({ ratePlan, nights, rooms: input.rooms, addOns });
  const reference = generateReference();
  const pin = generatePin();

  return {
    reference,
    folioId: generateFolioId(String(new Date().getFullYear())),
    pin,
    draftKey: input.draftKey,
    hotel,
    room,
    stay: { checkIn: input.checkIn, checkOut: input.checkOut },
    nights,
    adults: input.adults,
    rooms: input.rooms,
    ratePlan,
    addOns,
    guest: input.guest,
    price,
    // New bookings await staff review before they are confirmed.
    status: 'pending',
    paymentMethod: input.paymentMethod,
    paymentStatus: input.paymentStatus,
    paymentProof: input.paymentProof,
    transactionId: input.transactionId,
    createdAt: new Date().toISOString(),
  };
}

function find(reference: string): Booking | undefined {
  return mockDb.get().bookings.find((b) => b.reference === reference);
}

export const mockBookingService: BookingService = {
  async createBooking(input: CreateBookingInput): Promise<ServiceResult<Booking>> {
    // Idempotency: a retry with the same draft key returns the existing booking.
    const existing = mockDb.get().bookings.find((b) => b.draftKey === input.draftKey);
    if (existing) return delay(result(existing), 200);

    const booking = materialize(input);
    mockDb.update((db) => ({ ...db, bookings: [booking, ...db.bookings] }));

    // Share the uploaded payment screenshot with the front desk. Mirrors the
    // future backend call; best-effort so the booking still succeeds offline.
    if (booking.paymentProof) {
      try {
        await submitPaymentProof({
          bookingRef: booking.reference,
          fileName: booking.paymentProof.fileName,
          mimeType: booking.paymentProof.mimeType,
          dataUrl: booking.paymentProof.dataUrl,
          uploadedAt: booking.paymentProof.uploadedAt,
          guestName: booking.guest.fullName,
          phone: `${booking.guest.phoneCountryCode} ${booking.guest.phone}`.trim(),
          amount: booking.price.total,
          payer: booking.guest.fullName,
          txnRef: booking.transactionId,
          room: booking.room.name,
          roomCategory: booking.room.category,
          stay: `${booking.stay.checkIn} → ${booking.stay.checkOut}`,
          nights: booking.nights,
        });
      } catch {
        // The guest app works fully offline; the desk simply won't see the image.
      }
    }

    return delay(result(booking), 420);
  },

  async listMyBookings(): Promise<ServiceResult<Booking[]>> {
    const bookings = mockDb.get().bookings;
    const user = getSession();
    const mine = bookings.filter(
      (b) => (user ? matchesProfile(b.guest, user) : false) || Boolean(getAccess(b.reference)),
    );
    return delay(result(mine), 260);
  },

  async getBooking(reference: string): Promise<ServiceResult<Booking>> {
    const booking = find(reference);
    if (!booking) throw new AppError('We could not find a reservation with that reference.', ErrorCodes.NOT_FOUND, 404);
    return delay(result(booking), 200);
  },

  async lookupBooking(reference: string, pin: string): Promise<ServiceResult<Booking>> {
    const booking = find(reference);
    if (!booking) {
      throw new AppError('We could not find a reservation with that reference.', ErrorCodes.NOT_FOUND, 404);
    }
    if (booking.pin !== pin) {
      throw new AppError('That PIN does not match this reservation.', ErrorCodes.INVALID_PIN, 403);
    }
    grantAccess(booking.reference, booking.pin);
    return delay(result(booking), 260);
  },

  async cancelBooking(reference: string, pin: string): Promise<ServiceResult<Booking>> {
    const booking = find(reference);
    if (!booking) {
      throw new AppError('We could not find a reservation with that reference.', ErrorCodes.NOT_FOUND, 404);
    }
    if (booking.pin !== pin) {
      throw new AppError('That PIN does not match this reservation.', ErrorCodes.INVALID_PIN, 403);
    }
    if (booking.status === 'cancelled') {
      throw new AppError('This reservation is already cancelled.', ErrorCodes.INVALID_INPUT, 409);
    }
    if (booking.status === 'checked_out') {
      throw new AppError('Completed stays cannot be cancelled.', ErrorCodes.INVALID_INPUT, 409);
    }

    const percent = refundPercent(booking.stay.checkIn, todayISO());
    const refundAmount = Math.round((booking.price.total * percent) / 100);
    const wasPaid = booking.paymentStatus === 'paid' || booking.paymentStatus === 'settled';
    const cancelled: Booking = {
      ...booking,
      status: 'cancelled',
      paymentStatus: wasPaid ? 'refunded' : booking.paymentStatus,
      cancelledAt: new Date().toISOString(),
      cancelRefundAmount: refundAmount,
    };
    mockDb.update((db) => ({
      ...db,
      bookings: db.bookings.map((b) => (b.reference === reference ? cancelled : b)),
    }));
    return delay(result(cancelled), 380);
  },
};

/** Helper used by pages that need a synchronous room lookup during the flow. */
export function findRoom(roomId: string): Room | undefined {
  return mockDb.rooms().find((room) => room.id === roomId);
}