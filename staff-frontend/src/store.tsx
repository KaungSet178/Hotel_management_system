import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { fetchPaymentProofs, normalizeBookingRef } from '@/lib/paymentProofs';
import type { PaymentProofRecord } from '@/lib/paymentProofs';
import type {
  Booking,
  BookingRequest,
  CheckoutEntry,
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
  buildCheckoutEntries,
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
import { broadcastLiveEvent } from '@/lib/broadcast';

const PROOF_POLL_MS = 4000;

function proofToBookingRequest(proof: PaymentProofRecord): BookingRequest {
  const shortRef = normalizeBookingRef(proof.bookingRef);
  const uploaded = proof.uploadedAt ? new Date(proof.uploadedAt) : new Date();
  const minutes = Math.max(0, Math.round((Date.now() - uploaded.getTime()) / 60_000));
  const ago =
    minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes}m ago` : `${Math.round(minutes / 60)}h ago`;
  return {
    ref: `#${shortRef}`,
    shortRef,
    guestName: proof.guestName ?? 'Guest',
    phone: proof.phone ?? '—',
    room: proof.room ?? 'Unassigned',
    roomCategory: proof.roomCategory ?? undefined,
    stay: proof.stay ?? 'To be confirmed',
    nights: proof.nights ?? 0,
    amount: proof.amount ?? 0,
    channel: 'Online · Guest App',
    state: 'PROOF_UPLOADED',
    ago,
    note: 'Payment screenshot uploaded from the guest app and awaiting verification.',
    slip: {
      txnRef: proof.txnRef ?? `UPL-${shortRef}`,
      amount: proof.amount ?? 0,
      payer: proof.payer ?? proof.guestName ?? 'Guest',
      recipient: 'StayFlow Hospitality Co., Ltd',
      timestamp: uploaded.toLocaleString(),
      receiptUrl: proof.dataUrl,
      dataUrl: proof.dataUrl,
      image: proof.dataUrl,
      fileName: proof.fileName,
    },
  };
}

interface AppStore {
  bookings: Booking[];
  requests: BookingRequest[];
  serviceRequests: ServiceRequest[];
  rooms: Room[];
  folio: Folio;
  folioSettled: boolean;
  checkoutQueue: CheckoutEntry[];
  activeRoomId: string;
  walkIn: WalkInRecord;
  loading: boolean;
  refresh: () => Promise<void>;
  confirmRequest: (ref: string) => void;
  rejectRequest: (ref: string, reason?: string) => void;
  setRequestState: (ref: string, state: RequestState) => void;
  checkInBooking: (ref: string) => boolean;
  addWalkInBooking: (
    guestName: string,
    roomNumber?: string,
    options?: {
      nights?: number;
      adults?: number;
      notes?: string;
      paymentMethod?: string;
    },
  ) => boolean;
  updateServiceState: (id: string, state: ServiceState) => void;
  addServiceRequest: (input: Omit<ServiceRequest, 'id' | 'state' | 'ago'>) => void;
  selectCheckoutRoom: (roomId: string) => void;
  removeCheckoutEntry: (roomId: string) => void;
  settleFolio: () => void;
}

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [requests, setRequests] = useState<BookingRequest[]>(initialRequests);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>(initialServiceRequests);
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [baseQueue, setBaseQueue] = useState<CheckoutEntry[]>(buildCheckoutEntries);
  const [selectedRoomId, setSelectedRoomId] = useState('');
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
      setBaseQueue(buildCheckoutEntries(r, b));
    } catch (err) {
      console.warn('Staff portal data sync error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync with live Supabase on mount and listen to realtime table changes
  useEffect(() => {
    let mounted = true;
    let refreshTimer: any = null;

    const debouncedRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (!mounted) return;
        Promise.all([
          staffApi.fetchRooms(),
          staffApi.fetchBookings(),
          staffApi.fetchBookingRequests(),
          staffApi.fetchServiceRequests(),
        ]).then(([r, b, reqs, s]) => {
          if (!mounted) return;
          setRooms(r);
          setBookings(b);
          setRequests(reqs);
          setServiceRequests(s);
          setBaseQueue(buildCheckoutEntries(r, b));
        });
      }, 150);
    };

    refresh();

    const unsubscribe = staffApi.subscribeToChanges((table) => {
      if (!mounted) return;
      if (table === 'rooms') {
        staffApi.fetchRooms().then((r) => {
          if (!mounted) return;
          setRooms(r);
          staffApi.fetchBookings().then((b) => {
            if (!mounted) return;
            setBookings(b);
            setBaseQueue(buildCheckoutEntries(r, b));
          });
        });
      } else if (table === 'bookings') {
        staffApi.fetchBookings().then((b) => {
          if (!mounted) return;
          setBookings(b);
          staffApi.fetchRooms().then((r) => {
            if (!mounted) return;
            setRooms(r);
            setBaseQueue(buildCheckoutEntries(r, b));
          });
        });
        staffApi.fetchBookingRequests().then((reqs) => mounted && setRequests(reqs));
      } else if (table === 'room_service_requests') {
        staffApi.fetchServiceRequests().then((s) => mounted && setServiceRequests(s));
      } else {
        debouncedRefresh();
      }
    });

    return () => {
      mounted = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      unsubscribe();
    };
  }, [refresh]);

  // Pull payment screenshots the guest app shared and surface any that are not
  // already in the queue as new PROOF_UPLOADED requests (matched by reference).
  useEffect(() => {
    let active = true;
    const sync = async () => {
      try {
        const proofs = await fetchPaymentProofs();
        if (!active || proofs.length === 0) return;
        setRequests((prev) => {
          const known = new Set(prev.map((r) => normalizeBookingRef(r.shortRef)));
          const additions = proofs
            .filter((proof) => !known.has(normalizeBookingRef(proof.bookingRef)))
            .map(proofToBookingRequest);
          return additions.length ? [...additions, ...prev] : prev;
        });
      } catch {
        // Desk keeps its local queue when the shared store is unreachable.
      }
    };
    void sync();
    const timer = window.setInterval(sync, PROOF_POLL_MS);
    const onFocus = () => void sync();
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const serviceChargeByRoom = useMemo(() => {
    const map: Record<string, number> = {};
    for (const service of serviceRequests) {
      map[service.room] = (map[service.room] ?? 0) + (service.charge ?? 0);
    }
    return map;
  }, [serviceRequests]);

  const checkoutQueue = useMemo(
    () =>
      baseQueue.map((entry) => {
        const roomNumber = entry.folio.room.replace(/[^0-9]/g, '');
        const extra = serviceChargeByRoom[roomNumber] ?? 0;
        return extra > 0
          ? { ...entry, folio: { ...entry.folio, incidentals: entry.folio.incidentals + extra } }
          : entry;
      }),
    [baseQueue, serviceChargeByRoom],
  );

  const activeEntry =
    checkoutQueue.find((entry) => entry.roomId === selectedRoomId) ?? checkoutQueue[0];
  const activeRoomId = activeEntry?.roomId ?? '';
  const folio = activeEntry?.folio ?? initialFolio;
  const folioSettled = activeEntry?.settled ?? false;


  const confirmRequest = useCallback(
    (ref: string) => {
      const req = requests.find((r) => r.ref === ref);
      setRequests((prev) =>
        prev.map((r) => (r.ref === ref ? { ...r, state: 'CONFIRMED' as const } : r)),
      );
      const cleanRef = normalizeBookingRef(ref);
      setBookings((prev) => {
        const foundIndex = prev.findIndex((b) => normalizeBookingRef(b.ref) === cleanRef);
        if (foundIndex >= 0) {
          const updated = [...prev];
          updated[foundIndex] = {
            ...updated[foundIndex],
            status: 'CONFIRMED',
            payment: 'PREPAID',
          };
          return updated;
        }
        if (req) {
          const roomNum = req.room.match(/\d+/)?.[0];
          const booking: Booking = {
            ref: `#SF-${req.shortRef}`,
            guestName: req.guestName,
            adults: 2,
            room: roomNum ? `Room ${roomNum}` : 'Unassigned',
            roomCategory: req.roomCategory ?? '—',
            checkIn: todayIso(),
            checkOut: addDays(todayIso(), req.nights || 2),
            nights: req.nights,
            status: 'CONFIRMED',
            payment: 'PREPAID',
            amount: req.amount,
            phone: req.phone,
            request: req.note,
          };
          return [booking, ...prev];
        }
        return prev;
      });

      const assignedRoom = req?.room?.match(/\d+/)?.[0];

      // Broadcast instant approval notification to customer portal & tabs
      broadcastLiveEvent('BOOKING_APPROVED', {
        reference: ref,
        guestName: req?.guestName,
        roomNumber: assignedRoom ? `Room ${assignedRoom}` : 'Assigned Suite',
      });

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

  const rejectRequest = useCallback(
    (ref: string, reason = 'Declined during payment review') => {
      const target = requests.find((r) => r.ref === ref);
      setRequests((prev) =>
        prev.map((r) =>
          r.ref === ref ? { ...r, state: 'REJECTED' as const, note: reason } : r,
        ),
      );

      // Also cancel any corresponding booking entry
      const cleanRef = normalizeBookingRef(ref);
      setBookings((prev) =>
        prev.map((b) =>
          normalizeBookingRef(b.ref) === cleanRef
            ? { ...b, status: 'CANCELLED' as const }
            : b,
        ),
      );

      // Broadcast instant cancellation notification to customer portal & tabs
      broadcastLiveEvent('BOOKING_REJECTED', {
        reference: ref,
        guestName: target?.guestName,
        reason,
      });

      staffApi
        .verifyPaymentProof(ref, false, reason, user)
        .then(() => {
          Promise.all([
            staffApi.fetchBookings(),
            staffApi.fetchBookingRequests(),
            staffApi.fetchRooms(),
          ]).then(([b, reqs, r]) => {
            setBookings(b);
            setRequests(reqs);
            setRooms(r);
          });
        })
        .catch((err) => console.error('rejectRequest backend error:', err));
    },
    [requests, user],
  );

  const setRequestState = useCallback((ref: string, state: RequestState) => {
    setRequests((prev) => prev.map((r) => (r.ref === ref ? { ...r, state } : r)));
  }, []);

  const checkInBooking = useCallback(
    (ref: string): boolean => {
      const target = bookings.find((b) => b.ref === ref);
      if (!target || target.status !== 'CONFIRMED') {
        return false;
      }
      setBookings((prev) =>
        prev.map((b) => (b.ref === ref ? { ...b, status: 'CHECKED_IN' as const } : b)),
      );

      broadcastLiveEvent('BOOKING_CHECKED_IN', { reference: ref });
      broadcastLiveEvent('ROOM_UPDATED', { reference: ref, status: 'OCCUPIED' });

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
    (
      guestName: string,
      roomNumber?: string,
      options?: {
        nights?: number;
        adults?: number;
        notes?: string;
        paymentMethod?: string;
      },
    ): boolean => {
      const available = rooms.filter((r) => r.status === 'AVAILABLE');
      const chosen = available.find((r) => r.number === roomNumber) ?? available[0];
      if (!chosen) return false;
      const next = folioCounter + 1;
      const folioNo = `#WI-2026-${next}`;
      const nightsCount = Math.max(1, options?.nights || 2);
      const numAdults = options?.adults || 2;
      const out = addDays(todayIso(), nightsCount);
      const totalAmount = chosen.pricePerNight * nightsCount;
      const chosenPaymentMethod = options?.paymentMethod === 'CARD' ? 'CARD' : 'KBZPAY';

      const booking: Booking = {
        ref: folioNo,
        guestName,
        adults: numAdults,
        room: `Room ${chosen.number}`,
        roomCategory: chosen.category,
        checkIn: todayIso(),
        checkOut: out,
        nights: nightsCount,
        status: 'CHECKED_IN',
        payment: 'PAID',
        amount: totalAmount,
        note: options?.notes,
      };
      setBookings((prev) => [booking, ...prev]);
      setRooms((prev) =>
        prev.map((r) =>
          r.id === chosen.id ? { ...r, status: 'OCCUPIED' as const, guestName } : r,
        ),
      );
      setWalkIn({ folio: folioNo, guestName, room: `Room ${chosen.number}` });
      setFolioCounter(next);

      broadcastLiveEvent('NEW_BOOKING', {
        reference: folioNo,
        channel: 'WALK_IN',
        roomNumber: chosen.number,
      });
      broadcastLiveEvent('ROOM_UPDATED', { roomId: chosen.id, status: 'OCCUPIED' });

      // Persist walk-in to Supabase and backend API gateway
      staffApi
        .createWalkInBooking(
          {
            guestName,
            roomNumber: chosen.number,
            roomId: chosen.id,
            nights: nightsCount,
            amount: totalAmount,
            paymentMethod: chosenPaymentMethod,
            clerkName: user?.name,
            notes: options?.notes,
          },
          user,
        )
        .then(() => {
          broadcastLiveEvent('BOOKING_CREATED', { reference: folioNo, channel: 'WALK_IN' });
          broadcastLiveEvent('ROOM_UPDATED', { roomId: chosen.id, status: 'OCCUPIED' });
          Promise.all([staffApi.fetchBookings(), staffApi.fetchRooms()]).then(([b, r]) => {
            setBookings(b);
            setRooms(r);
          });
        })
        .catch((err) => console.error('createWalkInBooking error:', err));

      return true;
    },
    [rooms, folioCounter, user],
  );

  const updateServiceState = useCallback((id: string, state: ServiceState) => {
    const staffName = user?.name || 'Daw Nu Nu (Front Desk)';
    setServiceRequests((prev) =>
      prev.map((s) => (s.id === id ? { ...s, state, assignee: s.assignee || staffName } : s))
    );
    broadcastLiveEvent('SERVICE_REQUEST_UPDATED', {
      requestId: id,
      status: state,
      assignee: staffName,
    });
    staffApi.updateServiceState(id, state, user?.id || user?.email).catch((err) => {
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
      broadcastLiveEvent('SERVICE_REQUEST_CREATED', {
        roomNumber: input.room,
        category: input.category,
        title: input.title,
      });
      staffApi.fetchServiceRequests().then(setServiceRequests);
    }).catch((err) => console.error('addServiceRequest error:', err));
  }, []);

  const selectCheckoutRoom = useCallback((roomId: string) => {
    setSelectedRoomId(roomId);
  }, []);

  const removeCheckoutEntry = useCallback((roomId: string) => {
    setBaseQueue((prev) => prev.filter((entry) => entry.roomId !== roomId));
    setSelectedRoomId((prev) => (prev === roomId ? '' : prev));
  }, []);

  const settleFolio = useCallback(() => {
    setBaseQueue((prev) =>
      prev.map((entry) =>
        entry.roomId === activeRoomId ? { ...entry, settled: true } : entry,
      ),
    );
    // Find room and return directly to AVAILABLE inventory
    const entry = baseQueue.find((e) => e.roomId === activeRoomId);
    const roomNum = entry?.folio.room.match(/\d+/)?.[0] || '304';
    const roomTarget = rooms.find((r) => r.number === roomNum);

    if (entry?.bookingRef) {
      staffApi.checkOutBooking(entry.bookingRef).then(() => {
        Promise.all([staffApi.fetchRooms(), staffApi.fetchBookings()]).then(([r, b]) => {
          setRooms(r);
          setBookings(b);
        });
      }).catch((err) => console.warn('settleFolio checkOutBooking error:', err));
    }

    if (roomTarget) {
      staffApi.updateRoomStatus(roomTarget.id, 'AVAILABLE').then(() => {
        broadcastLiveEvent('BOOKING_CHECKED_OUT', { roomNumber: roomNum });
        broadcastLiveEvent('ROOM_UPDATED', { roomNumber: roomNum, status: 'AVAILABLE' });
        staffApi.fetchRooms().then(setRooms);
      }).catch((err) => console.warn('settleFolio updateRoomStatus error:', err));
    }
  }, [activeRoomId, baseQueue, rooms]);


  const value = useMemo<AppStore>(
    () => ({
      bookings,
      requests,
      serviceRequests,
      rooms,
      folio,
      folioSettled,
      checkoutQueue,
      activeRoomId,
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
      selectCheckoutRoom,
      removeCheckoutEntry,
      settleFolio,
    }),
    [
      bookings,
      requests,
      serviceRequests,
      rooms,
      folio,
      folioSettled,
      checkoutQueue,
      activeRoomId,
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
      selectCheckoutRoom,
      removeCheckoutEntry,
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