import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
import { staffApi } from '@/services/staffApi';
import { useAuth } from '@/auth';

interface AppStore {
  bookings: Booking[];
  requests: BookingRequest[];
  serviceRequests: ServiceRequest[];
  rooms: Room[];
  folio: Folio;
  folioSettled: boolean;
  walkIn: WalkInRecord;
  loading: boolean;
  refresh: () => Promise<void>;
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
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [requests, setRequests] = useState<BookingRequest[]>(initialRequests);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>(initialServiceRequests);
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [folio] = useState<Folio>(initialFolio);
  const [folioSettled, setFolioSettled] = useState(false);
  const [walkIn, setWalkIn] = useState<WalkInRecord>(initialWalkIn);
  const [folioCounter, setFolioCounter] = useState(9502);
  const [loading, setLoading] = useState(true);
  const serviceSeqRef = useRef(1054);

  // Initial fetch and live refresh function
  const refresh = useCallback(async () => {
    try {
      const [r, b, reqs, s] = await Promise.all([
        staffApi.fetchRooms(),
        staffApi.fetchBookings(),
        staffApi.fetchBookingRequests(),
        staffApi.fetchServiceRequests(),
      ]);
      setRooms(r);
      setBookings(b);
      setRequests(reqs);
      setServiceRequests(s);
    } catch (err) {
      console.warn('Staff portal data sync error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync with live Supabase on mount and listen to realtime table changes
  useEffect(() => {
    let mounted = true;

    refresh();

    const unsubscribe = staffApi.subscribeToChanges((table) => {
      if (!mounted) return;
      if (table === 'rooms') {
        staffApi.fetchRooms().then((r) => mounted && setRooms(r));
      } else if (table === 'bookings') {
        staffApi.fetchBookings().then((b) => mounted && setBookings(b));
        staffApi.fetchBookingRequests().then((reqs) => mounted && setRequests(reqs));
        staffApi.fetchRooms().then((r) => mounted && setRooms(r));
      } else if (table === 'room_service_requests') {
        staffApi.fetchServiceRequests().then((s) => mounted && setServiceRequests(s));
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [refresh]);

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
          checkIn: '2026-10-18',
          checkOut: '2026-10-21',
          nights: req.nights,
          status: 'CONFIRMED',
          payment: 'PREPAID',
          amount: req.amount,
          phone: req.phone,
          request: req.note,
        };
        setBookings((prev) => [booking, ...prev]);
      }

      // Persist verification to Supabase and Express backend gateway
      staffApi.verifyPaymentProof(ref, true, 'Approved by Front Desk Staff', user).then(() => {
        Promise.all([
          staffApi.fetchBookings(),
          staffApi.fetchBookingRequests(),
          staffApi.fetchRooms(),
        ]).then(([b, reqs, r]) => {
          setBookings(b);
          setRequests(reqs);
          setRooms(r);
        });
      }).catch((err) => console.error('confirmRequest backend error:', err));
    },
    [requests, user],
  );

  const rejectRequest = useCallback((ref: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.ref === ref ? { ...r, state: 'REJECTED' as const } : r)),
    );

    staffApi.verifyPaymentProof(ref, false, 'Rejected by Front Desk Staff', user).then(() => {
      Promise.all([
        staffApi.fetchBookingRequests(),
        staffApi.fetchRooms(),
      ]).then(([reqs, r]) => {
        setRequests(reqs);
        setRooms(r);
      });
    }).catch((err) => console.error('rejectRequest backend error:', err));
  }, [user]);

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

      // Persist direct check-in to Supabase backend
      staffApi.checkInDirect(ref, user).then(() => {
        Promise.all([staffApi.fetchBookings(), staffApi.fetchRooms()]).then(([b, r]) => {
          setBookings(b);
          setRooms(r);
        });
      }).catch((err) => console.error('checkInBooking backend error:', err));

      return true;
    },
    [bookings, user],
  );

  const addWalkInBooking = useCallback(
    (guestName: string, roomNumber?: string): boolean => {
      const available = rooms.filter((r) => r.status === 'AVAILABLE');
      const chosen = available.find((r) => r.number === roomNumber) ?? available[0];
      if (!chosen) return false;
      const next = folioCounter + 1;
      const folioNo = `#WI-2026-${next}`;
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
          r.id === chosen.id ? { ...r, status: 'OCCUPIED' as const, guestName } : r,
        ),
      );
      setWalkIn({ folio: folioNo, guestName, room: `Room ${chosen.number}` });
      setFolioCounter(next);

      // Persist walk-in to Supabase and backend API gateway
      staffApi.createWalkInBooking({
        guestName,
        roomNumber: chosen.number,
        roomId: chosen.id,
        nights: 2,
        amount: chosen.pricePerNight * 2,
        paymentMethod: 'PAY_AT_HOTEL',
        clerkName: user?.name,
      }, user).then(() => {
        Promise.all([staffApi.fetchBookings(), staffApi.fetchRooms()]).then(([b, r]) => {
          setBookings(b);
          setRooms(r);
        });
      }).catch((err) => console.error('createWalkInBooking error:', err));

      return true;
    },
    [rooms, folioCounter, user],
  );

  const updateServiceState = useCallback((id: string, state: ServiceState) => {
    setServiceRequests((prev) => prev.map((s) => (s.id === id ? { ...s, state } : s)));
    staffApi.updateServiceState(id, state, user?.name).catch((err) => {
      console.warn('updateServiceState backend error:', err);
    });
  }, [user]);

  const addServiceRequest = useCallback((input: Omit<ServiceRequest, 'id' | 'state' | 'ago'>) => {
    serviceSeqRef.current += 1;
    const request: ServiceRequest = {
      ...input,
      id: `SR-${serviceSeqRef.current}`,
      state: 'PENDING',
      ago: 'Just now',
    };
    setServiceRequests((prev) => [request, ...prev]);

    staffApi.addServiceRequest({
      room: input.room,
      category: input.category,
      title: input.title,
      guest: input.guest,
      urgency: input.urgency,
    }).then(() => {
      staffApi.fetchServiceRequests().then(setServiceRequests);
    }).catch((err) => console.error('addServiceRequest error:', err));
  }, []);

  const settleFolio = useCallback(() => {
    setFolioSettled(true);
    // Find room 304 and set to CLEANING turnover
    const room304 = rooms.find((r) => r.number === '304');
    if (room304) {
      staffApi.updateRoomStatus(room304.id, 'CLEANING').then(() => {
        staffApi.fetchRooms().then(setRooms);
      }).catch((err) => console.warn('settleFolio updateRoomStatus error:', err));
    }
  }, [rooms]);

  const value = useMemo<AppStore>(
    () => ({
      bookings,
      requests,
      serviceRequests,
      rooms,
      folio,
      folioSettled,
      walkIn,
      loading,
      refresh,
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
      loading,
      refresh,
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