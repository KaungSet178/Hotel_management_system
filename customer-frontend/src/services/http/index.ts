import { apiClient } from '../apiClient';
import type { BookingService, HotelService, PaymentService, ServiceRequestService } from '../types';
import type { AvailabilityInfo, Booking, Destination, Hotel, AddOn, ServiceRequest } from '@/types';
import type {
  CreateBookingInput,
  CreateServiceRequestInput,
  PaymentRequest,
  PaymentResult,
} from '../contracts';
import type { RoomListing } from '../types';

const META = { source: 'http' as const, simulated: false };

// Locations accessed in the file are documented in `contracts.ts`. These thin
// adapters map backend responses to the shared domain types.

export const httpHotelService: HotelService = {
  async getDestinations() {
    const data = await apiClient.request<Destination[]>('/destinations');
    return { data, meta: META };
  },
  async getFeaturedRooms(limit = 3) {
    const data = await apiClient.request<RoomListing[]>('/hotels', {
      query: { featured: 'true' },
    });
    return { data: data.slice(0, limit), meta: META };
  },
  async searchRooms({ destination, stay, adults, rooms }) {
    const data = await apiClient.request<RoomListing[]>('/rooms', {
      query: {
        destination,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        adults,
        rooms,
      },
    });
    return { data, meta: META };
  },
  async getHotel(hotelId) {
    const data = await apiClient.request<Hotel>(`/hotels/${hotelId}`);
    return { data, meta: META };
  },
  async listHotelRooms({ hotelId, stay, adults, rooms }) {
    const data = await apiClient.request<RoomListing[]>(`/hotels/${hotelId}/rooms`, {
      query: { checkIn: stay.checkIn, checkOut: stay.checkOut, adults, rooms },
    });
    return { data, meta: META };
  },
  async getRoom(roomId) {
    const data = await apiClient.request<RoomListing>(`/rooms/${roomId}`);
    return { data, meta: META };
  },
  async getAddOns() {
    const data = await apiClient.request<AddOn[]>('/add-ons');
    return { data, meta: META };
  },
  async checkAvailability(roomId, stay) {
    const data = await apiClient.request<AvailabilityInfo>(`/rooms/${roomId}/availability`, {
      query: { checkIn: stay.checkIn, checkOut: stay.checkOut },
    });
    return { data, meta: META };
  },
};

export const httpBookingService: BookingService = {
  async createBooking(input: CreateBookingInput) {
    const data = await apiClient.request<Booking>('/bookings', { method: 'POST', body: input });
    return { data, meta: META };
  },
  async listMyBookings() {
    const data = await apiClient.request<Booking[]>('/reservations');
    return { data, meta: META };
  },
  async getBooking(reference) {
    const data = await apiClient.request<Booking>(`/reservations/${reference}`);
    return { data, meta: META };
  },
  async lookupBooking(reference, pin) {
    const data = await apiClient.request<Booking>(`/reservations/${reference}`, {
      query: { pin },
    });
    return { data, meta: META };
  },
  async cancelBooking(reference, pin) {
    const data = await apiClient.request<Booking>(`/reservations/${reference}/cancel`, {
      method: 'POST',
      body: { pin },
    });
    return { data, meta: META };
  },
};

export const httpPaymentService: PaymentService = {
  async processPayment(request: PaymentRequest) {
    const data = await apiClient.request<PaymentResult>('/payments', {
      method: 'POST',
      body: request,
    });
    return { data, meta: META };
  },
  getSimulationMode() {
    return 'random' as const;
  },
  setSimulationMode() {
    // No-op against a real gateway.
  },
};

export const httpServiceRequestService: ServiceRequestService = {
  async listForReservation(reference) {
    const data = await apiClient.request<ServiceRequest[]>(
      `/reservations/${reference}/service-requests`,
    );
    return { data, meta: META };
  },
  async create(reference, input: CreateServiceRequestInput) {
    const data = await apiClient.request<ServiceRequest>(
      `/reservations/${reference}/service-requests`,
      { method: 'POST', body: input },
    );
    return { data, meta: META };
  },
};