import type { BookingService, HotelService, PaymentService, ServiceRequestService } from './types';
import {
  mockBookingService,
  mockHotelService,
  mockPaymentService,
  mockServiceRequestService,
} from './mock';
import {
  httpBookingService,
  httpHotelService,
  httpPaymentService,
  httpServiceRequestService,
} from './http';

export type ServiceMode = 'mock' | 'http';

/**
 * Central service registry.
 *
 * `VITE_SERVICE_MODE` decides whether the UI talks to the mock layer (default)
 * or the real HTTP layer. Swapping backends is a one-line environment change —
 * no component imports a concrete implementation directly.
 */
export const serviceMode: ServiceMode =
  import.meta.env.VITE_SERVICE_MODE === 'http' ? 'http' : 'mock';

export const usingMockServices = serviceMode === 'mock';

export const services: {
  hotels: HotelService;
  bookings: BookingService;
  payments: PaymentService;
  serviceRequests: ServiceRequestService;
} =
  serviceMode === 'http'
    ? {
        hotels: httpHotelService,
        bookings: httpBookingService,
        payments: httpPaymentService,
        serviceRequests: httpServiceRequestService,
      }
    : {
        hotels: mockHotelService,
        bookings: mockBookingService,
        payments: mockPaymentService,
        serviceRequests: mockServiceRequestService,
      };

export const hotels = services.hotels;
export const bookings = services.bookings;
export const payments = services.payments;
export const serviceRequests = services.serviceRequests;

export * from './errors';
export * from './contracts';