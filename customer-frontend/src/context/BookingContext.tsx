import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { GuestDetails, PaymentMethod, PaymentProof, RatePlanId } from '@/types';

export interface BookingDraft {
  draftKey: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
  ratePlanId: RatePlanId;
  addOnIds: string[];
  guest: GuestDetails | null;
  paymentMethod: PaymentMethod | null;
  paymentProof: PaymentProof | null;
}

export interface DraftInit {
  roomId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
}

interface BookingContextValue {
  draft: BookingDraft | null;
  /** Create a new draft (or reuse the current one if it matches the stay). */
  ensureDraft: (init: DraftInit) => BookingDraft;
  updateDraft: (patch: Partial<BookingDraft>) => void;
  resetDraft: () => void;
}

const STORAGE_KEY = 'stayflow.booking-draft.v1';

const BookingContext = createContext<BookingContextValue | null>(null);

function newKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function load(): BookingDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BookingDraft) : null;
  } catch {
    return null;
  }
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft | null>(() => load());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (draft) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [draft]);

  const ensureDraft = useCallback(
    (init: DraftInit): BookingDraft => {
      const matches =
        draft &&
        draft.roomId === init.roomId &&
        draft.checkIn === init.checkIn &&
        draft.checkOut === init.checkOut;

      const next: BookingDraft = matches
        ? { ...draft, adults: init.adults, rooms: init.rooms }
        : {
            draftKey: newKey(),
            roomId: init.roomId,
            checkIn: init.checkIn,
            checkOut: init.checkOut,
            adults: init.adults,
            rooms: init.rooms,
            ratePlanId: 'flexible',
            addOnIds: [],
            guest: null,
            paymentMethod: null,
            paymentProof: null,
          };

      setDraft(next);
      return next;
    },
    [draft],
  );

  const updateDraft = useCallback((patch: Partial<BookingDraft>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const resetDraft = useCallback(() => setDraft(null), []);

  const value = useMemo<BookingContextValue>(
    () => ({ draft, ensureDraft, updateDraft, resetDraft }),
    [draft, ensureDraft, updateDraft, resetDraft],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) throw new Error('useBooking must be used within a BookingProvider');
  return context;
}