/**
 * Domain models for the StayFlow customer frontend.
 *
 * These types describe the entities the UI works with. They are intentionally
 * backend-agnostic: the same shapes are used by the mock service layer and the
 * real HTTP service layer. See `API_CONTRACTS.md` in the repo root for the
 * expected backend wire format.
 */

export type CurrencyCode = 'MMK' | 'USD';

export interface StayRange {
  /** Inclusive check-in date, ISO `YYYY-MM-DD`. */
  checkIn: string;
  /** Exclusive check-out date, ISO `YYYY-MM-DD`. */
  checkOut: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  region: string;
  country: string;
}

export interface HotelImage {
  src: string;
  alt: string;
}

export interface Hotel {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  address: Address;
  rating: number;
  reviewCount: number;
  heroImage: string;
  gallery: HotelImage[];
  facilities: string[];
  checkInTime: string;
  checkOutTime: string;
  hotline: string;
  featured?: boolean;
}

export type RoomCategory = 'Deluxe' | 'Executive' | 'Junior' | 'Villa' | 'Studio';

export interface Room {
  id: string;
  hotelId: string;
  name: string;
  category: RoomCategory;
  wing: string;
  floorRange: string;
  roomNumbers: string;
  description: string;
  longDescription?: string;
  maxGuests: number;
  bedConfiguration: string;
  areaSqm: number;
  amenities: string[];
  images: HotelImage[];
  rating: number;
  reviewCount: number;
  /** Number of bookable units of this room type at the property. */
  inventory: number;
  tags: string[];
  /** Date ranges (priority ISO dates) during which the room is fully blocked. */
  blockoutRanges: StayRange[];
}

export type RatePlanId = 'flexible' | 'saver' | 'wellness';

export interface RatePlan {
  id: RatePlanId;
  label: string;
  /** Nightly rate in MMK. */
  nightlyRate: number;
  features: string[];
  refundable: boolean;
  payAtHotel: boolean;
  recommended?: boolean;
  promoNote?: string;
  savePercent?: number;
}

export interface AddOn {
  id: string;
  label: string;
  category: 'transport' | 'indulgence' | 'privilege' | 'concierge';
  price: number;
  description: string;
  icon: string;
}

export interface StayItinerary {
  room: Room;
  hotel: Hotel;
  stay: StayRange;
  nights: number;
  adults: number;
  rooms: number;
}

export interface GuestPreferences {
  highFloor: boolean;
  quietRoom: boolean;
  lateCheckIn: boolean;
  featherFreePillows: boolean;
  celebrationNote: boolean;
}

export interface GuestDetails {
  fullName: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  estimatedArrival: string;
  preferences: GuestPreferences;
  conNotes: string;
  agreeToTerms: boolean;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show';

export type PaymentMethod = 'KBZPAY' | 'WAVEPAY' | 'CB_PAY' | 'CARD' | 'PAY_AT_HOTEL';

export type PaymentStatus =
  | 'pending'
  | 'awaiting_review'
  | 'paid'
  | 'settled'
  | 'refunded'
  | 'pay_at_hotel';

/**
 * Screenshot/receipt a guest uploads as proof of a manual transfer. Downscaled
 * and stored as a data URL so it survives on the device between sessions.
 */
export interface PaymentProof {
  fileName: string;
  mimeType: string;
  /** Compressed `data:image/...;base64,...` preview. */
  dataUrl: string;
  uploadedAt: string;
}

export interface PriceLine {
  label: string;
  amount: number;
  note?: string;
}

export interface PriceBreakdown {
  lines: PriceLine[];
  subtotal: number;
  serviceCharge: number;
  tax: number;
  total: number;
  currency: CurrencyCode;
}

export interface Booking {
  /** Public booking reference, e.g. `SF-89241-K7`. */
  reference: string;
  /** Folio id used on statements, e.g. `SF-2026-9481`. */
  folioId: string;
  /** 4-digit PIN required to access the folio (mock access mechanism). */
  pin: string;
  /** Client-generated idempotency key so retries never duplicate. */
  draftKey: string;
  hotel: Hotel;
  room: Room;
  stay: StayRange;
  nights: number;
  adults: number;
  rooms: number;
  ratePlan: RatePlan;
  addOns: AddOn[];
  guest: GuestDetails;
  price: PriceBreakdown;
  status: BookingStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  /** Uploaded proof of a manual transfer, awaiting staff verification. */
  paymentProof?: PaymentProof;
  transactionId?: string;
  roomNumber?: string;
  cancelRefundAmount?: number;
  cancelledAt?: string;
  createdAt: string;
}

export type ServiceRequestCategory =
  | 'extra_towels'
  | 'housekeeping'
  | 'minibar'
  | 'maintenance'
  | 'airport'
  | 'dining'
  | 'other';

export type ServiceRequestStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'in_transit'
  | 'completed';

export interface ServiceRequest {
  id: string;
  reservationReference: string;
  category: ServiceRequestCategory;
  categoryLabel: string;
  details: string;
  deliveryTime: string;
  status: ServiceRequestStatus;
  createdAt: string;
  updatedAt: string;
  staffName?: string;
  expectedArrival?: string;
}

export interface AvailabilityInfo {
  available: boolean;
  roomsLeft: number;
  reason?: 'sold_out' | 'no_dates';
}

export interface SearchCriteria extends StayRange {
  destination: string;
  adults: number;
  rooms: number;
}

export interface Destination {
  id: string;
  label: string;
  hotelIds: string[];
}

/** How a guest signed in. */
export type AuthProvider = 'google' | 'phone' | 'email';

/**
 * The signed-in guest's profile.
 *
 * Identity is keyed on email and/or phone so reservations can be matched to a
 * person across devices once a real backend is connected.
 */
export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  avatarUrl?: string;
  provider: AuthProvider;
  createdAt: string;
  isEmailVerified?: boolean;
}

export interface ServiceResultMeta {
  source: 'mock' | 'http';
  simulated: boolean;
}

export interface ServiceResult<T> {
  data: T;
  meta: ServiceResultMeta;
}