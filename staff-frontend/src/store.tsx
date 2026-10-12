import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  Booking,
  BookingRequest,
  Folio,
  RequestState,
  Room,
  ServiceRequest,
  ServiceState,
} from '@/types';
import {
  addDays,
  todayIso,
} from '@/lib/format';
import {
  initialBookings,
  initialFolio,
  initialRequests,
  initialRooms,
  initialServiceRequests,
  initialWalkIn,
  type WalkInRecord,
} from '@/data/seed';

interface AppStore {
  bookings: Booking[];
  requests: BookingRequest[];
  serviceRequests: ServiceRequest[];
  rooms: Room[];
  folio: Folio;
  folioSettled: boolean;
  walkIn: WalkInRecord;
  confirmRequest: (ref: string) => void;
  rejectRequest: (ref: string) => void;
  setRequestState: (ref: string, state: RequestState) => void;
  checkInBooking: (ref: string) => boolean;
  addWalkInBooking: (guestName: string, roomNumber?: string) => boolean;
  updateServiceState: (id: string, state: ServiceState) => void;
  addServiceRequest: (input: Omit<ServiceRequest, 'id' | 'state' | 'ago'>) => void;
  settleFolio: () => void;
}

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [requests, setRequests] = useState<BookingRequest[]>(initialRequests);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>(initialServiceRequests);
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [folio] = useState<Folio>(initialFolio);
  const [folioSettled, setFolioSettled] = useState(false);
  const [walkIn, setWalkIn] = useState<WalkInRecord>(initialWalkIn);
  const [folioCounter, setFolioCounter] = useState(9502);
  const serviceSeqRef = useRef(1054);

  const confirmRequest = useCallback(
    (ref: string) => {
      const req = requests.find((r) => r.ref === ref);
      setRequests((prev) =>
        prev.map((r) => (r.ref === ref ? { ...r, state: 'CONFIRMED' as const } : r)),
      );
      if (req) {
        const roomNum = req.room.match(/\d+/)?.[0];
        const booking: Booking = {
          ref: `#SF-${req.shortRef}`,
          guestName: req.guestName,
          adults: 2,
          room: roomNum ? `Room ${roomNum}` : 'Unassigned',
          roomCategory: req.roomCategory ?? '—',
          checkIn: '2025-10-18',
          checkOut: '2025-10-21',
          nights: req.nights,
          status: 'CONFIRMED',
          payment: 'PREPAID',
          amount: req.amount,
          phone: req.phone,
          request: req.note,
        };
        setBookings((prev) => [booking, ...prev]);
      }
    },
    [requests],
  );

  const rejectRequest = useCallback((ref: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.ref === ref ? { ...r, state: 'REJECTED' as const } : r)),
    );
  }, []);

  const setRequestState = useCallback((ref: string, state: RequestState) => {
    setRequests((prev) => prev.map((r) => (r.ref === ref ? { ...r, state } : r)));
  }, []);

  const checkInBooking = useCallback(
    (ref: string): boolean => {
      const target = bookings.find((b) => b.ref === ref);
      if (!target || (target.status !== 'CONFIRMED' && target.status !== 'PENDING')) {
        return false;
      }
      setBookings((prev) =>
        prev.map((b) => (b.ref === ref ? { ...b, status: 'CHECKED_IN' as const } : b)),
      );
      return true;
    },
    [bookings],
  );

  const addWalkInBooking = useCallback(
    (guestName: string, roomNumber?: string): boolean => {
      const available = rooms.filter((r) => r.status === 'AVAILABLE');
      const chosen = available.find((r) => r.number === roomNumber) ?? available[0];
      if (!chosen) return false;
      const next = folioCounter + 1;
      const folioNo = `#SF-2025-${next}`;
      const out = addDays(todayIso(), 2);
      const booking: Booking = {
        ref: folioNo,
        guestName,
        adults: 2,
        room: `Room ${chosen.number}`,
        roomCategory: chosen.category,
        checkIn: todayIso(),
        checkOut: out,
        nights: 2,
        status: 'CONFIRMED',
        payment: 'PREPAID',
        amount: chosen.pricePerNight * 2,
      };
      setBookings((prev) => [booking, ...prev]);
      setRooms((prev) =>
        prev.map((r) =>
          r.id === chosen.id ? { ...r, status: 'RESERVED' as const, guestName } : r,
        ),
      );
      setWalkIn({ folio: folioNo, guestName, room: `Room ${chosen.number}` });
      setFolioCounter(next);
      return true;
    },
    [rooms, folioCounter],
  );

  const updateServiceState = useCallback((id: string, state: ServiceState) => {
    setServiceRequests((prev) => prev.map((s) => (s.id === id ? { ...s, state } : s)));
  }, []);

  const addServiceRequest = useCallback((input: Omit<ServiceRequest, 'id' | 'state' | 'ago'>) => {
    serviceSeqRef.current += 1;
    const request: ServiceRequest = {
      ...input,
      id: `SR-${serviceSeqRef.current}`,
      state: 'PENDING',
      ago: 'Just now',
    };
    setServiceRequests((prev) => [request, ...prev]);
  }, []);

  const settleFolio = useCallback(() => {
    setFolioSettled(true);
  }, []);

  const value = useMemo<AppStore>(
    () => ({
      bookings,
      requests,
      serviceRequests,
      rooms,
      folio,
      folioSettled,
      walkIn,
      confirmRequest,
      rejectRequest,
      setRequestState,
      checkInBooking,
      addWalkInBooking,
      updateServiceState,
      addServiceRequest,
      settleFolio,
    }),
    [
      bookings,
      requests,
      serviceRequests,
      rooms,
      folio,
      folioSettled,
      walkIn,
      confirmRequest,
      rejectRequest,
      setRequestState,
      checkInBooking,
      addWalkInBooking,
      updateServiceState,
      addServiceRequest,
      settleFolio,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStore {
  const store = useContext(AppStoreContext);
  if (!store) {
    throw new Error('useAppStore must be used inside <AppStoreProvider>');
  }
  return store;
}