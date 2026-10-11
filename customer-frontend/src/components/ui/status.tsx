import type { BookingStatus, PaymentStatus, ServiceRequestStatus } from '@/types';
import { Badge, type BadgeTone } from './badge';

const BOOKING_TONES: Record<BookingStatus, BadgeTone> = {
  pending: 'amber',
  confirmed: 'brand',
  checked_in: 'green',
  checked_out: 'slate',
  cancelled: 'red',
  no_show: 'slate',
};

const BOOKING_LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
  no_show: 'No-show',
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={BOOKING_TONES[status]}>{BOOKING_LABELS[status]}</Badge>;
}

const PAYMENT_TONES: Record<PaymentStatus, BadgeTone> = {
  pending: 'amber',
  awaiting_review: 'amber',
  paid: 'brand',
  settled: 'green',
  refunded: 'slate',
  pay_at_hotel: 'lavender',
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending: 'Payment pending',
  awaiting_review: 'Awaiting review',
  paid: 'Paid',
  settled: 'Settled',
  refunded: 'Refunded',
  pay_at_hotel: 'Pay at hotel',
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={PAYMENT_TONES[status]}>{PAYMENT_LABELS[status]}</Badge>;
}

const SERVICE_TONES: Record<ServiceRequestStatus, BadgeTone> = {
  pending: 'amber',
  assigned: 'lavender',
  in_progress: 'brand',
  in_transit: 'brand',
  completed: 'green',
};

const SERVICE_LABELS: Record<ServiceRequestStatus, string> = {
  pending: 'Pending',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  in_transit: 'In Transit',
  completed: 'Completed',
};

export function ServiceStatusBadge({ status }: { status: ServiceRequestStatus }) {
  return <Badge tone={SERVICE_TONES[status]}>{SERVICE_LABELS[status]}</Badge>;
}

export const serviceStatusLabel = (status: ServiceRequestStatus): string => SERVICE_LABELS[status];
export const bookingStatusLabel = (status: BookingStatus): string => BOOKING_LABELS[status];