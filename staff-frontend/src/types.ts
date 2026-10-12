export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';

export interface Room {
  id: string;
  number: string;
  floor: number;
  category: string;
  beds: string;
  maxGuests: number;
  size: number;
  wing: string;
  pricePerNight: number;
  amenities: string[];
  status: RoomStatus;
  image?: string;
  workOrder?: string;
  guestName?: string;
  departsAt?: string;
  bookingRef?: string;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';

export type BookingPayment =
  | 'PREPAID'
  | 'PAY_AT_HOTEL'
  | 'PENDING'
  | 'PAID'
  | 'FEE_SETTLED';

export interface Booking {
  ref: string;
  guestName: string;
  adults: number;
  phone?: string;
  room?: string;
  roomCategory?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  status: BookingStatus;
  payment: BookingPayment;
  amount: number;
  note?: string;
  request?: string;
}

export type RequestState =
  | 'PROOF_UPLOADED'
  | 'PAY_AT_HOTEL'
  | 'ROOM_CONFLICT'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'AWAITING_GATEWAY';

export interface BookingRequest {
  ref: string;
  shortRef: string;
  guestName: string;
  phone: string;
  nrc?: string;
  tier?: 'Elite VIP' | 'VIP' | 'Standard';
  room: string;
  roomCategory?: string;
  stay: string;
  nights: number;
  amount: number;
  channel?: string;
  state: RequestState;
  ago: string;
  note: string;
  slip?: PaymentSlip;
}

export interface PaymentSlip {
  txnRef: string;
  amount: number;
  payer: string;
  recipient: string;
  timestamp: string;
}

export type ServiceState = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface ServiceRequest {
  id: string;
  room: string;
  category: string;
  title: string;
  guest: string;
  ago: string;
  quote: string;
  urgency?: 'URGENT' | 'NORMAL';
  assignee?: string;
  state: ServiceState;
}

export interface Folio {
  guestName: string;
  room: string;
  roomCategory: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  roomCharges: number;
  roomChargesPaid: boolean;
  incidentals: number;
  taxes: number;
}

export interface CheckInOutcome {
  expiringCount: number;
  arrivedCount: number;
}