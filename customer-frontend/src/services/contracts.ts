import type {
  AddOn,
  AvailabilityInfo,
  Booking,
  Destination,
  Hotel,
  PaymentProof,
  RatePlan,
  ServiceRequest,
} from '@/types';

/**
 * Expected backend API contracts (documentation for the backend team).
 *
 * The frontend does NOT assume these already exist — they describe the
 * endpoints the HTTP service layer will call once the backend is ready.
 *
 * Response convention: each endpoint returns the resource/list directly as a
 * JSON body (HTTP 200) or 204 No Content for empty results. The frontend
 * service layer wraps the payload as `{ data, meta }` internally — the backend
 * does NOT need to send that envelope. Errors should use a non-2xx status and
 * a JSON body `{ "message": string }`; the UI maps 404 → NOT_FOUND and 5xx →
 * SERVER automatically.
 */

export interface EndpointDoc {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  request?: string;
  response: string;
}

export const API_CONTRACTS: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/destinations',
    summary: 'List bookable destinations and their hotel ids.',
    response: 'Destination[]',
  },
  {
    method: 'GET',
    path: '/hotels',
    summary: 'List hotels, optionally filtered by `destination`.',
    request: 'query: { destination?: string; featured?: boolean }',
    response: 'Hotel[]',
  },
  {
    method: 'GET',
    path: '/hotels/:hotelId',
    summary: 'Hotel detail with facilities, gallery and check-in policy.',
    response: 'Hotel',
  },
  {
    method: 'GET',
    path: '/hotels/:hotelId/rooms',
    summary: 'Rooms for one hotel with availability and `from` price for the given stay.',
    request: 'query: { checkIn, checkOut, adults, rooms }',
    response: 'RoomListing[]',
  },
  {
    method: 'GET',
    path: '/rooms',
    summary: 'Search room listings. Availability + `from` price are computed server-side.',
    request: 'query: { destination?, checkIn, checkOut, adults, rooms }',
    response: 'RoomListing[] (room + hotel + fromNightly + availability)',
  },
  {
    method: 'GET',
    path: '/rooms/:roomId',
    summary: 'Room detail including hotel, rate plans and availability.',
    response: 'RoomListing (room + hotel + ratePlans + fromNightly + availability)',
  },
  {
    method: 'GET',
    path: '/rooms/:roomId/availability',
    summary: 'Availability for a date range. Authoritative check before booking.',
    request: 'query: { checkIn, checkOut }',
    response: 'AvailabilityInfo',
  },
  {
    method: 'GET',
    path: '/add-ons',
    summary: 'List selectable enhancements / add-ons.',
    response: 'AddOn[]',
  },
  {
    method: 'POST',
    path: '/bookings',
    summary:
      'Create a booking. Must be idempotent on `draftKey`. Server recomputes the price and re-checks availability.',
    request: 'CreateBookingInput',
    response: 'Booking',
  },
  {
    method: 'POST',
    path: '/payments',
    summary:
      'Authorize/process payment. Must be idempotent on `idempotencyKey`. Returns a transaction id on success.',
    request: 'PaymentRequest',
    response: 'PaymentResult',
  },
  {
    method: 'GET',
    path: '/reservations',
    summary: 'Reservations for the authenticated guest.',
    response: 'Booking[]',
  },
  {
    method: 'GET',
    path: '/reservations/:reference',
    summary: 'Single reservation. Requires authentication or a valid lookup token/PIN.',
    request: 'query: { pin? }',
    response: 'Booking',
  },
  {
    method: 'POST',
    path: '/reservations/:reference/cancel',
    summary: 'Cancel a reservation. Server computes the refund per the cancellation matrix.',
    request: '{ pin?: string }',
    response: 'Booking',
  },
  {
    method: 'GET',
    path: '/reservations/:reference/service-requests',
    summary: 'In-stay service requests for a reservation.',
    response: 'ServiceRequest[]',
  },
  {
    method: 'POST',
    path: '/reservations/:reference/service-requests',
    summary: 'Create an in-stay service request (only for checked-in / eligible stays).',
    request: 'CreateServiceRequestInput',
    response: 'ServiceRequest',
  },
];

export interface CreateBookingInput {
  draftKey: string;
  hotelId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
  ratePlanId: RatePlan['id'];
  addOnIds: string[];
  guest: Booking['guest'];
  paymentMethod: Booking['paymentMethod'];
  paymentStatus: Booking['paymentStatus'];
  /** Screenshot/receipt uploaded as proof of a manual transfer. */
  paymentProof?: PaymentProof;
  transactionId?: string;
}

export interface PaymentRequest {
  amount: number;
  currency: 'MMK';
  method: Booking['paymentMethod'];
  idempotencyKey: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  message?: string;
}

export interface CreateServiceRequestInput {
  category: ServiceRequest['category'];
  categoryLabel: string;
  details: string;
  deliveryTime: string;
}

export type { AddOn, AvailabilityInfo, Booking, Destination, Hotel, PaymentProof, RatePlan, ServiceRequest };