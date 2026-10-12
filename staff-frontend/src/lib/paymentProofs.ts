/**
 * Payment-proof API client.
 *
 * The guest app POSTs a screenshot here when a booking is submitted; the staff
 * console reads it back to verify the transfer. In this environment the requests
 * are answered by the shared dev store (`shared/vite-payment-proofs.mjs`), but
 * the shape is exactly what the real backend will serve, so pointing
 * `VITE_API_BASE_URL` at the backend later is the only change required.
 */

export interface PaymentProofRecord {
  bookingRef: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  uploadedAt: string;
  guestName?: string | null;
  phone?: string | null;
  amount?: number | null;
  payer?: string | null;
  txnRef?: string | null;
  room?: string | null;
  roomCategory?: string | null;
  stay?: string | null;
  nights?: number | null;
}

export interface SubmitPaymentProofInput {
  bookingRef: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  uploadedAt?: string;
  guestName?: string;
  phone?: string;
  amount?: number;
  payer?: string;
  txnRef?: string;
  room?: string;
  roomCategory?: string;
  stay?: string;
  nights?: number;
}

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/+$/, '');

/** Booking references are compared case-insensitively and without a leading `#`. */
export function normalizeBookingRef(ref: string): string {
  return ref.replace(/^#/, '').trim().toUpperCase();
}

export async function submitPaymentProof(input: SubmitPaymentProofInput): Promise<void> {
  const response = await fetch(`${API_BASE}/api/payment-proofs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, bookingRef: normalizeBookingRef(input.bookingRef) }),
  });
  if (!response.ok) {
    throw new Error(`Payment proof upload failed (${response.status})`);
  }
}

export async function fetchPaymentProof(bookingRef: string): Promise<PaymentProofRecord | null> {
  const response = await fetch(
    `${API_BASE}/api/payment-proofs/${encodeURIComponent(normalizeBookingRef(bookingRef))}`,
  );
  if (!response.ok) return null;
  return (await response.json()) as PaymentProofRecord;
}

export async function fetchPaymentProofs(): Promise<PaymentProofRecord[]> {
  const response = await fetch(`${API_BASE}/api/payment-proofs`);
  if (!response.ok) return [];
  const data = (await response.json()) as { proofs?: PaymentProofRecord[] };
  return data.proofs ?? [];
}
