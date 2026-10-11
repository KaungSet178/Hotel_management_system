import type {
  AddOn,
  AvailabilityInfo,
  Booking,
  Destination,
  Hotel,
  PriceBreakdown,
  RatePlan,
  Room,
  ServiceRequest,
  StayRange,
} from '@/types';
import type { CreateBookingInput, CreateServiceRequestInput, PaymentRequest, PaymentResult } from './contracts';
import type { ServiceResult } from '@/types';

export interface RoomListing {
  room: Room;
  hotel: Hotel;
  ratePlans: RatePlan[];
  fromNightly: number;
  availability: AvailabilityInfo;
}

export interface HotelService {
  getDestinations(): Promise<ServiceResult<Destination[]>>;
  getFeaturedRooms(limit?: number): Promise<ServiceResult<RoomListing[]>>;
  searchRooms(criteria: {
    destination: string;
    stay: StayRange;
    adults: number;
    rooms: number;
  }): Promise<ServiceResult<RoomListing[]>>;
  getHotel(hotelId: string): Promise<ServiceResult<Hotel>>;
  listHotelRooms(input: {
    hotelId: string;
    stay: StayRange;
    adults: number;
    rooms: number;
  }): Promise<ServiceResult<RoomListing[]>>;
  getRoom(roomId: string): Promise<ServiceResult<RoomListing>>;
  getAddOns(): Promise<ServiceResult<AddOn[]>>;
  checkAvailability(roomId: string, stay: StayRange): Promise<ServiceResult<AvailabilityInfo>>;
}

export interface BookingService {
  createBooking(input: CreateBookingInput): Promise<ServiceResult<Booking>>;
  listMyBookings(): Promise<ServiceResult<Booking[]>>;
  getBooking(reference: string): Promise<ServiceResult<Booking>>;
  lookupBooking(reference: string, pin: string): Promise<ServiceResult<Booking>>;
  cancelBooking(reference: string, pin: string): Promise<ServiceResult<Booking>>;
}

export interface PaymentOutcome {
  result: PaymentResult;
  breakdown: PriceBreakdown;
}

export interface PaymentService {
  processPayment(request: PaymentRequest): Promise<ServiceResult<PaymentResult>>;
  getSimulationMode(): SimulationMode;
  setSimulationMode(mode: SimulationMode): void;
}

export type SimulationMode = 'random' | 'force_success' | 'force_failure';

export interface ServiceRequestService {
  listForReservation(reference: string): Promise<ServiceResult<ServiceRequest[]>>;
  create(reference: string, input: CreateServiceRequestInput): Promise<ServiceResult<ServiceRequest>>;
}