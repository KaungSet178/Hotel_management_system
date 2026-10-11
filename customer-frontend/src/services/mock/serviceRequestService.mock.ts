import { AppError, ErrorCodes } from '../errors';
import { mockDb } from '@/mock/store';
import { generateServiceRequestId } from '@/lib/refs';
import type { ServiceRequestService } from '../types';
import type { ServiceRequest, ServiceRequestStatus, ServiceResult } from '@/types';
import type { CreateServiceRequestInput } from '../contracts';

const SIMULATED = { source: 'mock' as const, simulated: true };

function delay<T>(value: T, ms = 260): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function result<T>(data: T): ServiceResult<T> {
  return { data, meta: SIMULATED };
}

const STAFF = [
  'Daw May Thu (Housekeeping Team)',
  'Ko Aung (Engineering)',
  'Front Desk Runner',
  'Guest Relations Officer',
  'Butler Desk',
];

function nextId(): string {
  const nums = mockDb
    .get()
    .serviceRequests.map((r) => Number.parseInt(r.id.replace('SR-', ''), 10))
    .filter((n) => Number.isFinite(n));
  const next = (nums.length ? Math.max(...nums) : 1000) + 1;
  return generateServiceRequestId(next);
}

function etaFromDelivery(delivery: string): string {
  const now = new Date();
  const minutesByDelivery: Record<string, number> = {
    Immediate: 12,
    'Next 10–15 mins': 15,
    'This Evening': 60 * 4,
    'Tomorrow Morning': 60 * 16,
  };
  const minutes = minutesByDelivery[delivery] ?? 15;
  const eta = new Date(now.getTime() + minutes * 60_000);
  return eta.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Simulated fulfilment lifecycle so the live status monitor visibly updates:
 * pending → assigned → in_transit → completed.
 */
function scheduleProgression(id: string): void {
  const patch = (status: ServiceRequestStatus, extra: Partial<ServiceRequest> = {}) => {
    mockDb.update((db) => ({
      ...db,
      serviceRequests: db.serviceRequests.map((request) =>
        request.id === id
          ? { ...request, status, updatedAt: new Date().toISOString(), ...extra }
          : request,
      ),
    }));
  };

  const staff = STAFF[Math.floor(Math.random() * STAFF.length)];

  setTimeout(() => patch('assigned', { staffName: staff }), 2500);
  setTimeout(() => patch('in_transit', { staffName: staff }), 7000);
  setTimeout(() => patch('completed', { staffName: staff }), 45000);
}

export const mockServiceRequestService: ServiceRequestService = {
  async listForReservation(reference: string): Promise<ServiceResult<ServiceRequest[]>> {
    const requests = mockDb
      .get()
      .serviceRequests.filter((request) => request.reservationReference === reference)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return delay(result(requests), 220);
  },

  async create(reference: string, input: CreateServiceRequestInput): Promise<ServiceResult<ServiceRequest>> {
    const booking = mockDb.get().bookings.find((b) => b.reference === reference);
    if (!booking) {
      throw new AppError('Reservation not found.', ErrorCodes.NOT_FOUND, 404);
    }
    if (booking.status !== 'checked_in') {
      throw new AppError(
        'In-stay services are available once you have checked in.',
        ErrorCodes.INVALID_INPUT,
        409,
      );
    }
    if (!input.details.trim()) {
      throw new AppError('Please describe your request.', ErrorCodes.INVALID_INPUT);
    }

    const request: ServiceRequest = {
      id: nextId(),
      reservationReference: reference,
      category: input.category,
      categoryLabel: input.categoryLabel,
      details: input.details.trim(),
      deliveryTime: input.deliveryTime,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expectedArrival: etaFromDelivery(input.deliveryTime),
    };

    mockDb.update((db) => ({ ...db, serviceRequests: [request, ...db.serviceRequests] }));
    scheduleProgression(request.id);

    return delay(result(request), 420);
  },
};