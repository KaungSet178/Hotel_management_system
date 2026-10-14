import { supabase } from '@/lib/supabase';
import { subscribeLiveEvents } from '@/lib/broadcast';
import type {
  AuditLogRecord,
  Booking,
  BookingChannel,
  BookingPayment,
  BookingRequest,
  BookingStatus,
  ChannelRecord,
  PaymentSlip,
  RequestState,
  Room,
  RoomStatus,
  ServiceRequest,
  ServiceState,
  StaffUser,
} from '@/types';
import { initialRooms, initialBookings, initialRequests, initialServiceRequests } from '@/data/seed';
import { initialAuditLogs, initialChannelRecords } from '@/data/adminSeed';
import { todayIso } from '@/lib/format';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Retrieve auth bearer token for backend API gateway requests
 */
async function getAuthHeader(): Promise<Record<string, string>> {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      return { Authorization: `Bearer ${data.session.access_token}` };
    }
  }
  // Fallback to active demo token if stored
  try {
    const raw = localStorage.getItem('stayease.staff.active_profile');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.role === 'ADMIN') return { Authorization: 'Bearer demo-token-admin' };
      if (u.role === 'HOUSEKEEPING') return { Authorization: 'Bearer demo-token-housekeeping' };
      return { Authorization: 'Bearer demo-token-receptionist' };
    }
  } catch {
    // ignore
  }
  return { Authorization: 'Bearer demo-token-receptionist' };
}

// ----------------------------------------------------------------------------
// Entity Mapping Helpers
// ----------------------------------------------------------------------------

function formatTimeAgo(isoString?: string): string {
  if (!isoString) return 'Just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export function formatGuestPreferences(prefs: any): string | undefined {
  if (!prefs) return undefined;

  let obj = prefs;
  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj);
    } catch {
      return obj.trim() || undefined;
    }
  }

  if (typeof obj !== 'object' || obj === null) {
    return undefined;
  }

  const PREFERENCE_LABELS: Record<string, string> = {
    highFloor: 'High Floor',
    quietRoom: 'Quiet Room',
    lateCheckIn: 'Late Check-In',
    featherFreePillows: 'Feather-Free Pillows',
    celebrationNote: 'Celebration / Anniversary',
  };

  const active: string[] = [];
  for (const [key, label] of Object.entries(PREFERENCE_LABELS)) {
    if (obj[key] === true || obj[key] === 'true') {
      active.push(label);
    }
  }

  const customNote = obj.conNotes || obj.notes || obj.specialNotes || obj.comment;
  if (typeof customNote === 'string' && customNote.trim()) {
    active.push(customNote.trim());
  }

  if (active.length === 0) {
    return undefined;
  }

  return active.join(' • ');
}

export function mapSupabaseRoomToUi(
  r: any,
  checkedInBookingsMap?: Map<string, { guest_name: string; check_out_date: string; booking_reference: string }>,
  todayReservedMap?: Map<string, { guest_name: string; check_in_date: string; check_out_date: string; booking_reference: string }>,
  upcomingBookingsMap?: Map<string, { guest_name: string; check_in_date: string; check_out_date: string; booking_reference: string }>,
): Room {
  const checkedIn = checkedInBookingsMap?.get(r.id);
  const confirmed = todayReservedMap?.get(r.id);
  const upcoming = upcomingBookingsMap?.get(r.id);

  // Status determination:
  // 1. If active checked-in booking exists -> strictly OCCUPIED
  // 2. If active confirmed reservation exists FOR TODAY -> strictly RESERVED
  // 3. If room is under maintenance or cleaning -> preserve status
  // 4. Otherwise -> AVAILABLE (even if there is a future reservation on a later date!)
  let status: RoomStatus = 'AVAILABLE';
  if (checkedIn) {
    status = 'OCCUPIED';
  } else if (confirmed) {
    status = 'RESERVED';
  } else if (r.status === 'MAINTENANCE' || r.status === 'CLEANING') {
    status = r.status;
  } else {
    status = 'AVAILABLE';
  }

  let guestName = checkedIn?.guest_name || confirmed?.guest_name || undefined;
  let departsAt = checkedIn?.check_out_date
    ? `Departs: ${checkedIn.check_out_date}`
    : confirmed?.check_in_date
    ? `Arrival: Today (${confirmed.check_in_date})`
    : undefined;
  let bookingRef = checkedIn?.booking_reference
    ? `#${checkedIn.booking_reference}`
    : confirmed?.booking_reference
    ? `#${confirmed.booking_reference}`
    : undefined;

  // If room is AVAILABLE today but has an upcoming future reservation:
  if (status === 'AVAILABLE' && upcoming) {
    departsAt = `Available until ${upcoming.check_in_date}`;
    guestName = `Upcoming: ${upcoming.guest_name}`;
    bookingRef = `#${upcoming.booking_reference}`;
  }

  return {
    id: r.id,
    number: String(r.room_number || ''),
    floor: Number(r.floor) || 1,
    category: r.room_type || r.category || 'Deluxe',
    beds: r.bed_configuration || '1 King Bed',
    maxGuests: Number(r.capacity) || 2,
    size: Number(r.area_sqm) || 35,
    wing: r.wing || `Floor ${r.floor || 1}`,
    pricePerNight: Number(r.price_per_night) || 200000,
    amenities: Array.isArray(r.amenities) ? r.amenities : [],
    status,
    image: r.image_url || undefined,
    guestName,
    departsAt,
    bookingRef,
    upcomingBooking: upcoming ? {
      guestName: upcoming.guest_name,
      checkIn: upcoming.check_in_date,
      checkOut: upcoming.check_out_date,
      bookingRef: upcoming.booking_reference,
    } : undefined,
  };
}

export function mapSupabaseBookingToUi(b: any, roomsMap?: Map<string, any>): Booking {
  const room = roomsMap?.get(b.room_id);
  const checkIn = String(b.check_in_date || '').split('T')[0];
  const checkOut = String(b.check_out_date || '').split('T')[0];
  const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)) || 1;

  let paymentState: BookingPayment = 'PENDING';
  if (b.payment_status === 'PAID') paymentState = 'PAID';
  else if (b.payment_status === 'SETTLED') paymentState = 'FEE_SETTLED';
  else if (b.payment_method === 'ONLINE' || b.payment_method === 'KBZPAY' || b.payment_method === 'CARD' || b.payment_method === 'WAVEPAY') {
    paymentState = 'PREPAID';
  }

  let slip: PaymentSlip | undefined = undefined;
  if (b.payment_proof) {
    let proof = b.payment_proof;
    if (typeof proof === 'string') {
      try {
        proof = JSON.parse(proof);
      } catch {
        proof = { dataUrl: proof, receiptUrl: proof, image: proof };
      }
    }
    const imageUri =
      proof?.dataUrl ||
      proof?.image ||
      proof?.receiptUrl ||
      proof?.base64DataUrl ||
      undefined;

    slip = {
      txnRef: proof?.txnRef || b.transaction_id || `TXN-${b.booking_reference}`,
      amount: Number(proof?.amount || b.total_amount || 0),
      payer: proof?.payer || b.guest_name || 'Guest',
      recipient: proof?.recipient || 'StayEase Hospitality Co., Ltd',
      timestamp: proof?.timestamp || proof?.uploadedAt || b.created_at || 'Recently',
      receiptUrl: imageUri,
      dataUrl: imageUri,
      image: imageUri,
      fileName: proof?.fileName || undefined,
    };
  }

  return {
    ref: `#${b.booking_reference}`,
    guestName: b.guest_name || 'Guest',
    adults: Number(b.adults) || 2,
    phone: b.guest_phone || undefined,
    room: room?.room_number ? `Room ${room.room_number}` : (b.room_number ? `Room ${b.room_number}` : 'Unassigned'),
    roomCategory: room?.category || room?.room_type || 'Deluxe',
    checkIn,
    checkOut,
    nights,
    status: (b.booking_status || 'CONFIRMED').toUpperCase() as BookingStatus,
    payment: paymentState,
    amount: Number(b.total_amount) || 0,
    note: b.special_notes || undefined,
    request: formatGuestPreferences(b.guest_preferences),
    slip,
    paymentProof: b.payment_proof || undefined,
  };
}

export function mapSupabaseRequestToUi(b: any, roomsMap?: Map<string, any>): BookingRequest {
  const room = roomsMap?.get(b.room_id);
  const checkIn = String(b.check_in_date || '').split('T')[0];
  const checkOut = String(b.check_out_date || '').split('T')[0];
  const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)) || 1;

  let state: RequestState = 'AWAITING_GATEWAY';
  if (b.booking_status === 'CANCELLED') {
    state = 'REJECTED';
  } else if (b.booking_status === 'CONFIRMED' && b.payment_status === 'PAID') {
    state = 'CONFIRMED';
  } else if (b.payment_proof) {
    state = 'PROOF_UPLOADED';
  }

  let slip: PaymentSlip | undefined = undefined;
  if (b.payment_proof) {
    let proof = b.payment_proof;
    if (typeof proof === 'string') {
      try {
        proof = JSON.parse(proof);
      } catch {
        proof = { dataUrl: proof, receiptUrl: proof, image: proof };
      }
    }
    const imageUri =
      proof?.dataUrl ||
      proof?.image ||
      proof?.receiptUrl ||
      proof?.base64DataUrl ||
      undefined;

    slip = {
      txnRef: proof?.txnRef || b.transaction_id || `TXN-${b.booking_reference}`,
      amount: Number(proof?.amount || b.total_amount || 0),
      payer: proof?.payer || b.guest_name || 'Guest',
      recipient: proof?.recipient || 'StayEase Hospitality Co., Ltd',
      timestamp: proof?.timestamp || proof?.uploadedAt || b.created_at || 'Recently',
      receiptUrl: imageUri,
      dataUrl: imageUri,
      image: imageUri,
      fileName: proof?.fileName || undefined,
    };
  }

  return {
    ref: `#${b.booking_reference}`,
    shortRef: b.booking_reference.replace(/^SF-/, '').replace(/^LUX-/, ''),
    guestName: b.guest_name,
    phone: b.guest_phone || '—',
    tier: (Number(b.total_amount) > 1500000 ? 'Elite VIP' : Number(b.total_amount) > 500000 ? 'VIP' : 'Standard'),
    room: room?.room_number ? `Suite ${room.room_number}` : (b.room_number ? `Suite ${b.room_number}` : 'Suite'),
    roomCategory: room?.category || room?.room_type || 'Deluxe',
    stay: `${checkIn} – ${checkOut} (${nights}N)`,
    nights,
    amount: Number(b.total_amount) || 0,
    channel: b.payment_method || 'KBZPay',
    state,
    ago: formatTimeAgo(b.created_at),
    note: b.special_notes || 'Deposit verification required.',
    slip,
  };
}

export function mapSupabaseServiceRequestToUi(
  s: any,
  roomsMap?: Map<string, any>,
  profilesMap?: Map<string, string>,
): ServiceRequest {
  const room = roomsMap?.get(s.room_id);
  const roomLabel = s.room_number ? `Room ${s.room_number}` : (room?.room_number ? `Room ${room.room_number}` : 'Room 101');
  const status = (s.status || 'PENDING').toUpperCase();
  const state: ServiceState = status === 'COMPLETED' ? 'COMPLETED' : (status === 'IN_PROGRESS' || status === 'ASSIGNED' ? 'IN_PROGRESS' : 'PENDING');
  const staffName = s.assigned_to ? (profilesMap?.get(s.assigned_to) || 'Staff Assigned') : undefined;

  return {
    id: s.id,
    room: roomLabel,
    category: s.category_label || s.category || 'Housekeeping',
    title: s.description || 'Guest Service Request',
    guest: s.guest_name || 'In-House Guest',
    ago: formatTimeAgo(s.created_at),
    quote: s.delivery_time ? `Scheduled: ${s.delivery_time}` : 'Standard Service',
    urgency: s.priority === 'URGENT' ? 'URGENT' : 'NORMAL',
    charge: Number(s.charge || s.cost || 0),
    assignee: staffName,
    state,
  };
}

export function mapSupabaseAuditLogToUi(a: any): AuditLogRecord {
  let detailsText = '';
  if (typeof a.details === 'string') {
    detailsText = a.details;
  } else if (a.details && typeof a.details === 'object') {
    detailsText = Object.entries(a.details)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  } else {
    detailsText = a.action || 'System Action';
  }

  return {
    id: a.id,
    timestamp: a.created_at || new Date().toISOString(),
    actor: a.actor_name || a.actor_role || 'Staff Member',
    actorRole: (a.actor_role || 'ADMIN') as any,
    action: a.action,
    entityType: a.entity_type,
    entityId: a.entity_id || '',
    details: detailsText,
    ipAddress: a.ip_address || 'Management Console',
  };
}

export function mapSupabaseBookingToChannelRecord(b: any, roomsMap?: Map<string, any>): ChannelRecord {
  const room = roomsMap?.get(b.room_id);
  const checkIn = String(b.check_in_date || '').split('T')[0];
  const checkOut = String(b.check_out_date || '').split('T')[0];
  const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)) || 1;
  const isWalkIn = b.channel === 'WALK_IN' || b.payment_method === 'PAY_AT_HOTEL' || (b.booking_reference || '').startsWith('WI-');

  return {
    id: b.id,
    ref: b.booking_reference,
    guestName: b.guest_name,
    nrcOrPassport: b.guest_nrc_passport || undefined,
    phone: b.guest_phone || '—',
    roomNumber: room?.room_number || b.room_number || '306',
    roomCategory: room?.category || room?.room_type || 'Deluxe Azure Suite',
    channel: (isWalkIn ? 'WALK_IN' : 'ONLINE') as BookingChannel,
    checkIn,
    checkOut,
    nights,
    adults: Number(b.adults) || 2,
    ratePlan: b.rate_plan_id || (isWalkIn ? 'Walk-In Direct Rate' : 'Online Standard Rate'),
    totalAmount: Number(b.total_amount) || 0,
    paymentMethod: b.payment_method || 'KBZPay',
    paymentStatus: b.payment_status || 'PAID',
    bookingStatus: (b.booking_status || 'CONFIRMED').toUpperCase(),
    clerkOrSource: b.clerk_name || (isWalkIn ? 'Front Desk Walk-In' : 'Direct Web Booking'),
    specialNotes: b.special_notes || undefined,
    createdAt: b.created_at || new Date().toISOString(),
  };
}

// ----------------------------------------------------------------------------
// API Service Methods (Live Supabase & Express API Gateway)
// ----------------------------------------------------------------------------

export const staffApi = {
  /**
   * Fetch all rooms with active occupancy details from Supabase
   */
  async fetchRooms(): Promise<Room[]> {
    if (!supabase) return initialRooms;

    try {
      const { data: rawRooms, error: rErr } = await supabase.from('rooms').select('*').order('room_number');
      if (rErr || !rawRooms) {
        console.warn('Could not fetch rooms from Supabase, using fallback:', rErr?.message);
        return initialRooms;
      }

      // Query active in-house bookings to attach guest details to occupied rooms
      const { data: checkedInBookings } = await supabase
        .from('bookings')
        .select('id, room_id, guest_name, check_in_date, check_out_date, booking_reference')
        .eq('booking_status', 'CHECKED_IN');

      const checkedInMap = new Map<string, { guest_name: string; check_out_date: string; booking_reference: string }>();
      if (checkedInBookings) {
        for (const b of checkedInBookings) {
          if (b.room_id) checkedInMap.set(b.room_id, b);
        }
      }

      const today = todayIso();

      // Query confirmed bookings to detect reserved rooms
      const { data: confirmedBookings } = await supabase
        .from('bookings')
        .select('id, room_id, guest_name, check_in_date, check_out_date, booking_reference')
        .eq('booking_status', 'CONFIRMED');

      // 1) todayReservedMap: ONLY for reservations that are active TODAY (cIn <= today && cOut > today)
      // 2) upcomingMap: for future reservations (cIn > today)
      const todayReservedMap = new Map<string, { guest_name: string; check_in_date: string; check_out_date: string; booking_reference: string }>();
      const upcomingMap = new Map<string, { guest_name: string; check_in_date: string; check_out_date: string; booking_reference: string }>();

      if (confirmedBookings) {
        for (const b of confirmedBookings) {
          if (!b.room_id) continue;
          const cIn = String(b.check_in_date || '').split('T')[0];
          const cOut = String(b.check_out_date || '').split('T')[0];

          // Overdue arrival rule: If scheduled check-out has passed without arrival, auto-cancel no-show
          if (cOut && cOut <= today) {
            supabase
              .from('bookings')
              .update({
                booking_status: 'CANCELLED',
                special_notes: 'Auto-cancelled: Reservation dates passed without arrival (No-show).',
                updated_at: new Date().toISOString(),
              })
              .eq('id', b.id)
              .then();
            continue;
          }

          if (cIn <= today && cOut > today) {
            // Reserved for TODAY (Guest arrives today or stay is active today awaiting check-in)
            todayReservedMap.set(b.room_id, b);
          } else if (cIn > today) {
            // Future reservation (e.g. 29 Oct when today is 14 Oct).
            // Room is NOT reserved today! It is AVAILABLE until cIn!
            const existing = upcomingMap.get(b.room_id);
            if (!existing || cIn < String(existing.check_in_date).split('T')[0]) {
              upcomingMap.set(b.room_id, b);
            }
          }
        }
      }

      // Autonomous database reconciliation: automatically sync and heal any room
      // where the rooms table status drifted from active booking reality.
      for (const r of rawRooms) {
        const expectedStatus: RoomStatus = checkedInMap.has(r.id)
          ? 'OCCUPIED'
          : todayReservedMap.has(r.id)
          ? 'RESERVED'
          : (r.status === 'MAINTENANCE' || r.status === 'CLEANING' ? r.status : 'AVAILABLE');

        if (r.status !== expectedStatus) {
          supabase
            .from('rooms')
            .update({ status: expectedStatus, updated_at: new Date().toISOString() })
            .eq('id', r.id)
            .then();
          r.status = expectedStatus;
        }
      }

      return rawRooms.map((r) => mapSupabaseRoomToUi(r, checkedInMap, todayReservedMap, upcomingMap));
    } catch (err) {
      console.error('fetchRooms error:', err);
      return initialRooms;
    }
  },

  /**
   * Fetch all bookings from Supabase
   */
  async fetchBookings(): Promise<Booking[]> {
    if (!supabase) return initialBookings;

    try {
      const { data: rawBookings, error: bErr } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (bErr || !rawBookings) {
        console.warn('Could not fetch bookings from Supabase:', bErr?.message);
        return initialBookings;
      }

      // Filter out test simulated bookings
      const cleanBookings = rawBookings.filter(
        (b) => !b.booking_reference?.startsWith('EXP-'),
      );

      const today = todayIso();

      // Auto-cancel overdue un-checked-in arrivals (check_in_date < today)
      for (const b of cleanBookings) {
        const cIn = String(b.check_in_date || '').split('T')[0];
        if (
          (b.booking_status === 'CONFIRMED' || b.booking_status === 'PENDING') &&
          cIn &&
          cIn < today
        ) {
          b.booking_status = 'CANCELLED';
          b.special_notes = b.special_notes || 'Auto-cancelled: Check-in date passed without arrival (No-show).';

          supabase
            .from('bookings')
            .update({
              booking_status: 'CANCELLED',
              special_notes: b.special_notes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', b.id)
            .then();

          if (b.room_id) {
            supabase
              .from('rooms')
              .update({
                status: 'AVAILABLE',
                updated_at: new Date().toISOString(),
              })
              .eq('id', b.room_id)
              .then();
          }
        }
      }

      const { data: rawRooms } = await supabase.from('rooms').select('id, room_number, category, room_type');
      const roomsMap = new Map((rawRooms || []).map((r) => [r.id, r]));

      return cleanBookings.map((b) => mapSupabaseBookingToUi(b, roomsMap));
    } catch (err) {
      console.error('fetchBookings error:', err);
      return initialBookings;
    }
  },

  /**
   * Fetch pending booking requests (deposit slips and pay-at-hotel holds)
   */
  async fetchBookingRequests(): Promise<BookingRequest[]> {
    if (!supabase) return initialRequests;

    try {
      const { data: rawBookings, error: bErr } = await supabase
        .from('bookings')
        .select('*')
        .or('payment_status.eq.AWAITING_REVIEW,booking_status.eq.PENDING,booking_status.eq.CANCELLED,payment_proof.not.is.null')
        .order('created_at', { ascending: false });

      if (bErr || !rawBookings) {
        console.warn('Could not fetch requests from Supabase:', bErr?.message);
        return initialRequests;
      }

      const { data: rawRooms } = await supabase.from('rooms').select('id, room_number, category, room_type');
      const roomsMap = new Map((rawRooms || []).map((r) => [r.id, r]));

      return rawBookings.map((b) => mapSupabaseRequestToUi(b, roomsMap));
    } catch (err) {
      console.error('fetchBookingRequests error:', err);
      return initialRequests;
    }
  },

  /**
   * Fetch in-room service requests from Supabase
   */
  async fetchServiceRequests(): Promise<ServiceRequest[]> {
    if (!supabase) return initialServiceRequests;

    try {
      const { data: rawServices, error: sErr } = await supabase
        .from('room_service_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (sErr || !rawServices) {
        console.warn('Could not fetch service requests from Supabase:', sErr?.message);
        return initialServiceRequests;
      }

      const [roomsRes, profilesRes] = await Promise.all([
        supabase.from('rooms').select('id, room_number, category, room_type'),
        supabase.from('profiles').select('id, full_name, email, role'),
      ]);

      const roomsMap = new Map((roomsRes.data || []).map((r) => [r.id, r]));
      const profilesMap = new Map((profilesRes.data || []).map((p) => [p.id, p.full_name || p.email]));

      return rawServices.map((s) => mapSupabaseServiceRequestToUi(s, roomsMap, profilesMap));
    } catch (err) {
      console.error('fetchServiceRequests error:', err);
      return initialServiceRequests;
    }
  },

  /**
   * Fetch immutable audit logs from Supabase
   */
  async fetchAuditLogs(): Promise<AuditLogRecord[]> {
    if (!supabase) return initialAuditLogs;

    try {
      const { data: rawLogs, error: lErr } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (lErr || !rawLogs) {
        console.warn('Could not fetch audit logs from Supabase:', lErr?.message);
        return initialAuditLogs;
      }

      return rawLogs.map(mapSupabaseAuditLogToUi);
    } catch (err) {
      console.error('fetchAuditLogs error:', err);
      return initialAuditLogs;
    }
  },

  /**
   * Fetch channel records mapped from bookings in Supabase
   */
  async fetchChannelRecords(): Promise<ChannelRecord[]> {
    if (!supabase) return initialChannelRecords;

    try {
      const { data: rawBookings, error: bErr } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (bErr || !rawBookings) {
        console.warn('Could not fetch channel records from Supabase:', bErr?.message);
        return initialChannelRecords;
      }

      const { data: rawRooms } = await supabase.from('rooms').select('id, room_number, category, room_type');
      const roomsMap = new Map((rawRooms || []).map((r) => [r.id, r]));

      const validBookings = rawBookings.filter(
        (b) => !b.booking_reference?.startsWith('EXP-') && !b.guest_name?.includes('Simulated')
      );

      return validBookings.map((b) => mapSupabaseBookingToChannelRecord(b, roomsMap));
    } catch (err) {
      console.error('fetchChannelRecords error:', err);
      return initialChannelRecords;
    }
  },

  // --------------------------------------------------------------------------
  // Mutations
  // --------------------------------------------------------------------------

  /**
   * Update room status (AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE)
   */
  async updateRoomStatus(roomId: string, status: RoomStatus): Promise<void> {
    if (supabase) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomId);
      let q = supabase.from('rooms').update({ status, updated_at: new Date().toISOString() });
      if (isUuid) q = q.eq('id', roomId);
      else q = q.or(`id.eq.${roomId},room_number.eq.${roomId}`);
      const { error } = await q;
      if (error) console.warn('Supabase updateRoomStatus error:', error.message);
    }

    // Also call backend API gateway if available
    try {
      const headers = await getAuthHeader();
      await fetch(`${API_BASE_URL}/rooms/${roomId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ status }),
      });
    } catch {
      // ignore
    }
  },

  /**
   * Update room specifications / dynamic rates
   */
  async updateRoomPricing(roomId: string, updates: Partial<Room>): Promise<void> {
    if (!supabase) return;

    const payload: any = { updated_at: new Date().toISOString() };
    if (updates.pricePerNight !== undefined) payload.price_per_night = updates.pricePerNight;
    if (updates.category) {
      payload.category = updates.category;
      payload.room_type = updates.category;
    }
    if (updates.beds) payload.bed_configuration = updates.beds;
    if (updates.maxGuests !== undefined) payload.capacity = updates.maxGuests;
    if (updates.size !== undefined) payload.area_sqm = updates.size;
    if (updates.wing) payload.wing = updates.wing;
    if (updates.amenities) payload.amenities = updates.amenities;
    if (updates.status) payload.status = updates.status;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomId);
    let q = supabase.from('rooms').update(payload);
    if (isUuid) q = q.eq('id', roomId);
    else q = q.or(`id.eq.${roomId},room_number.eq.${roomId}`);

    const { error } = await q;
    if (error) throw new Error(error.message);
  },

  /**
   * Create new room in Supabase
   */
  async addRoom(newRoom: Omit<Room, 'id'>): Promise<string> {
    if (!supabase) return `room-${newRoom.number}`;

    const newId = crypto.randomUUID();
    const payload = {
      id: newId,
      room_number: newRoom.number,
      room_type: newRoom.category,
      category: newRoom.category,
      floor: newRoom.floor,
      price_per_night: newRoom.pricePerNight,
      capacity: newRoom.maxGuests,
      area_sqm: newRoom.size,
      wing: newRoom.wing,
      bed_configuration: newRoom.beds,
      status: newRoom.status,
      amenities: newRoom.amenities,
      hotel_id: 'yangon-riverside',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('rooms').insert(payload);
    if (error) throw new Error(error.message);
    return newId;
  },

  /**
   * Delete room from Supabase
   */
  async deleteRoom(roomId: string): Promise<void> {
    if (!supabase) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomId);
    let q = supabase.from('rooms').delete();
    if (isUuid) q = q.eq('id', roomId);
    else q = q.or(`id.eq.${roomId},room_number.eq.${roomId}`);
    const { error } = await q;
    if (error) throw new Error(error.message);
  },

  /**
   * Verify deposit slip / payment proof
   */
  async verifyPaymentProof(bookingRefOrId: string, approved: boolean, notes = '', user?: StaffUser | null): Promise<void> {
    const cleanRef = bookingRefOrId.replace(/^#/, '');

    // Try backend API first
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/bookings/${cleanRef}/payment-proof/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ approved, notes }),
      });
      if (res.ok) return;
    } catch {
      // Fallback to Supabase direct update
    }

    if (supabase) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanRef);
      const updates = approved
        ? {
            payment_status: 'PAID',
            booking_status: 'CONFIRMED',
            auto_cancel_at: null,
            updated_at: new Date().toISOString(),
          }
        : {
            booking_status: 'CANCELLED',
            updated_at: new Date().toISOString(),
          };

      let q = supabase.from('bookings').update(updates);
      if (isUuid) q = q.eq('id', cleanRef);
      else q = q.eq('booking_reference', cleanRef);
      await q;

      if (!approved) {
        // Release room back to AVAILABLE immediately
        let bQuery = supabase.from('bookings').select('room_id');
        if (isUuid) bQuery = bQuery.eq('id', cleanRef);
        else bQuery = bQuery.eq('booking_reference', cleanRef);
        const { data: bRec } = await bQuery.maybeSingle();
        if (bRec?.room_id) {
          await supabase.from('rooms').update({
            status: 'AVAILABLE',
            updated_at: new Date().toISOString(),
          }).eq('id', bRec.room_id);
        }
      }

      // Log audit
      await supabase.from('audit_logs').insert({
        actor_role: user?.role || 'RECEPTIONIST',
        action: approved ? 'PAYMENT_PROOF_APPROVED' : 'PAYMENT_PROOF_REJECTED',
        entity_type: 'bookings',
        details: { reference: cleanRef, approved, verified_by: user?.name || 'Staff' },
      });
    }
  },

  /**
   * Register walk-in booking from counter
   */
  async createWalkInBooking(walkInData: {
    guestName: string;
    roomNumber?: string;
    roomId?: string;
    phone?: string;
    nrc?: string;
    nights?: number;
    amount?: number;
    paymentMethod?: string;
    clerkName?: string;
    notes?: string;
  }, user?: StaffUser | null): Promise<void> {
    // Call backend API gateway
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/walk-in/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          guest_name: walkInData.guestName,
          room_number: walkInData.roomNumber,
          room_id: walkInData.roomId,
          guest_phone: walkInData.phone || '',
          guest_nrc_passport: walkInData.nrc || '',
          check_in_date: new Date().toISOString().split('T')[0],
          check_out_date: new Date(Date.now() + (walkInData.nights || 2) * 86400000).toISOString().split('T')[0],
          total_amount: walkInData.amount || 340000,
          payment_method: walkInData.paymentMethod === 'CARD' ? 'CARD' : 'KBZPAY',
          payment_status: 'PAID',
          special_notes: walkInData.notes
            ? `${walkInData.notes} [Counter walk-in registered by ${walkInData.clerkName || user?.name || 'Front Desk'}]`
            : `Counter walk-in registered by ${walkInData.clerkName || user?.name || 'Front Desk'}`,
        }),
      });
      if (res.ok) return;
    } catch {
      // Fallback
    }

    if (supabase) {
      const ref = `WI-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();

      // Find room by room_number
      let roomId = walkInData.roomId;
      if (!roomId && walkInData.roomNumber) {
        const { data: r } = await supabase.from('rooms').select('id').eq('room_number', walkInData.roomNumber).maybeSingle();
        if (r) roomId = r.id;
      }

      const { error: insErr } = await supabase.from('bookings').insert({
        booking_reference: ref,
        guest_name: walkInData.guestName,
        guest_email: `walkin.${ref.toLowerCase()}@hotel.internal`,
        guest_phone: walkInData.phone || '',
        room_id: roomId,
        check_in_date: now.split('T')[0],
        check_out_date: new Date(Date.now() + (walkInData.nights || 2) * 86400000).toISOString().split('T')[0],
        total_amount: walkInData.amount || 340000,
        payment_method: walkInData.paymentMethod === 'CARD' ? 'CARD' : 'KBZPAY',
        payment_status: 'PAID',
        booking_status: 'CHECKED_IN',
        checked_in_at: now,
        folio_id: `SF-${ref.replace(/^WI-/, '')}`,
        pin: `${Math.floor(1000 + Math.random() * 9000)}`,
        qr_token: `LUX-QR-${ref}-${Math.random().toString(36).substring(2, 10)}`,
        special_notes: walkInData.notes
          ? `${walkInData.notes} [Counter walk-in registered by ${walkInData.clerkName || user?.name || 'Front Desk'}]`
          : `[Counter walk-in registered by ${walkInData.clerkName || user?.name || 'Front Desk'}]`,
        created_at: now,
        updated_at: now,
      });

      if (insErr) {
        console.error('Supabase walk-in direct insert error:', insErr);
        throw new Error(insErr.message);
      }

      if (roomId) {
        await supabase.from('rooms').update({ status: 'OCCUPIED', updated_at: now }).eq('id', roomId);
      }
    }
  },

  /**
   * Express Check-In using QR Token
   */
  async checkInWithQrToken(qrToken: string): Promise<{ success: boolean; message: string; roomNumber?: string }> {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/check-in/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ qr_token: qrToken }),
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || json.message || 'QR Check-in failed');
    }

    return {
      success: true,
      message: json.message || 'Check-in successful!',
      roomNumber: json.data?.room_number,
    };
  },

  /**
   * Direct front-desk check-in by booking reference
   */
  async checkInDirect(bookingRef: string, user?: StaffUser | null): Promise<void> {
    const cleanRef = bookingRef.replace(/^#/, '');
    if (!supabase) return;

    const now = new Date().toISOString();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanRef);

    let query = supabase.from('bookings').select('id, room_id, guest_name');
    if (isUuid) query = query.eq('id', cleanRef);
    else query = query.eq('booking_reference', cleanRef);

    const { data: b, error } = await query.maybeSingle();
    if (error || !b) {
      console.warn('checkInDirect could not find booking:', cleanRef, error?.message);
      return;
    }

    await supabase.from('bookings').update({
      booking_status: 'CHECKED_IN',
      checked_in_at: now,
      updated_at: now,
    }).eq('id', b.id);

    if (b.room_id) {
      await supabase.from('rooms').update({
        status: 'OCCUPIED',
        updated_at: now,
      }).eq('id', b.room_id);
    }

    try {
      await supabase.from('audit_logs').insert({
        actor_role: user?.role || 'RECEPTIONIST',
        action: 'DIRECT_CHECK_IN',
        entity_type: 'bookings',
        entity_id: b.id,
        details: { guest: b.guest_name, reference: cleanRef },
      });
    } catch {
      // ignore
    }
  },

  /**
   * Guest departure settlement & check-out
   */
  async checkOutBooking(bookingRefOrId: string): Promise<void> {
    const cleanRef = bookingRefOrId.replace(/^#/, '');

    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/check-out/${cleanRef}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
      });
      if (res.ok) return;
    } catch {
      // Fallback to Supabase direct
    }

    if (supabase) {
      const now = new Date().toISOString();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanRef);
      let query = supabase.from('bookings').select('id, room_id');
      if (isUuid) query = query.eq('id', cleanRef);
      else query = query.eq('booking_reference', cleanRef);

      const { data: b } = await query.maybeSingle();
      if (b) {
        await supabase.from('bookings').update({
          booking_status: 'CHECKED_OUT',
          checked_out_at: now,
          updated_at: now,
        }).eq('id', b.id);

        if (b.room_id) {
          await supabase.from('rooms').update({
            status: 'AVAILABLE',
            updated_at: now,
          }).eq('id', b.room_id);
        }
      }
    }
  },

  /**
   * Update service request state (PENDING -> IN_PROGRESS -> COMPLETED)
   */
  async updateServiceState(id: string, state: ServiceState, assignedTo?: string): Promise<void> {
    const dbStatus = state === 'COMPLETED' ? 'COMPLETED' : state === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING';
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const knownStaffUuids: Record<string, string> = {
      'admin@hotel.com': 'd7ac82d1-9c43-4525-906c-fa383406daba',
      'reception@hotel.com': '21f75765-2d96-40c0-9d9e-b63efead3945',
      'housekeeping@hotel.com': '00000000-0000-0000-0000-000000000003',
    };
    let validUuid: string | null = null;
    if (assignedTo && isUuid.test(assignedTo)) {
      validUuid = assignedTo;
    } else if (assignedTo && knownStaffUuids[assignedTo]) {
      validUuid = knownStaffUuids[assignedTo];
    } else {
      validUuid = '21f75765-2d96-40c0-9d9e-b63efead3945';
    }

    // 1. Send update to Backend API gateway
    try {
      const headers = await getAuthHeader();
      await fetch(`${API_BASE_URL}/api/service-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          status: dbStatus,
          assigned_to: validUuid,
        }),
      });
    } catch (apiErr) {
      console.warn('Backend updateServiceState error:', apiErr);
    }

    // 2. Direct Supabase update for resilience and instant table sync
    if (supabase) {
      const updateData: Record<string, any> = {
        status: dbStatus,
        updated_at: new Date().toISOString(),
      };
      if (validUuid) {
        updateData.assigned_to = validUuid;
      }
      const { error } = await supabase.from('room_service_requests').update(updateData).eq('id', id);
      if (error) {
        console.warn('Direct Supabase updateServiceState error:', error.message);
        // Fallback without assigned_to if foreign key constraint triggered
        if (error.code === '23503' || error.message.includes('foreign key')) {
          await supabase.from('room_service_requests').update({
            status: dbStatus,
            updated_at: new Date().toISOString(),
          }).eq('id', id);
        }
      }
    }
  },

  /**
   * Add new in-room service request
   */
  async addServiceRequest(input: {
    room: string;
    category: string;
    title: string;
    guest: string;
    urgency?: string;
  }): Promise<void> {
    if (!supabase) return;

    // Resolve room
    const roomNum = input.room.match(/\d+/)?.[0] || '101';
    const { data: room } = await supabase.from('rooms').select('id, room_number').eq('room_number', roomNum).maybeSingle();

    await supabase.from('room_service_requests').insert({
      room_id: room?.id || 'a1111111-1111-1111-1111-111111111101',
      room_number: roomNum,
      guest_name: input.guest || 'In-House Guest',
      category: 'OTHER',
      category_label: input.category,
      description: input.title,
      priority: input.urgency === 'URGENT' ? 'URGENT' : 'NORMAL',
      status: 'PENDING',
      created_at: new Date().toISOString(),
    });
  },

  /**
   * Run 24-hr hold cancellation sweep
   */
  async runCancellationSweep(): Promise<{ cancelledCount: number; message: string }> {
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_BASE_URL}/jobs/trigger-cancellation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
      });
      if (res.ok) {
        const json = await res.json();
        const count = json.data?.cancelled_count || 0;
        return {
          cancelledCount: count,
          message: `24-Hour Hold Policy Sweep completed. Released ${count} unpaid reservations back to available inventory.`,
        };
      }
    } catch {
      // Fallback to Supabase RPC
    }

    if (supabase) {
      const { data } = await supabase.rpc('auto_cancel_unpaid_bookings');
      const count = data?.cancelled_count || 0;
      return {
        cancelledCount: count,
        message: `24-Hour Hold Policy Sweep completed. Released ${count} unpaid reservations back to available inventory.`,
      };
    }

    return { cancelledCount: 0, message: 'Policy sweep executed.' };
  },

  /**
   * Log entry to immutable audit_logs table
   */
  async logAudit(entry: {
    actor?: string;
    actorRole?: string;
    action: string;
    entityType: string;
    entityId?: string;
    details: string;
    ipAddress?: string;
  }): Promise<void> {
    if (!supabase) return;
    try {
      await supabase.from('audit_logs').insert({
        actor_role: entry.actorRole || 'ADMIN',
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.entityId) ? entry.entityId : null,
        details: { text: entry.details, actor: entry.actor },
        ip_address: entry.ipAddress || 'Management Console',
      });
    } catch (err) {
      console.warn('logAudit error:', err);
    }
  },

  /**
   * Unified Multi-Transport Realtime Subscription Channel
   * Listens to:
   * 1. Supabase Postgres Realtime (`rooms`, `bookings`, `room_service_requests`, `audit_logs`)
   * 2. Backend Server-Sent Events (`/api/live-events`)
   * 3. Cross-Tab BroadcastChannel & LocalStorage (`subscribeLiveEvents`)
   * 4. Window focus / visibility change triggers
   * 5. Periodic safety heartbeat (auto-poll every 6 seconds)
   */
  subscribeToChanges(onUpdate: (table: string, event?: string, data?: any) => void): () => void {
    let active = true;

    // 1. Cross-tab & Supabase Broadcast events
    const unsubBroadcast = subscribeLiveEvents((msg) => {
      if (!active) return;
      const evt = msg.event.toUpperCase();
      if (evt.includes('ROOM')) {
        onUpdate('rooms', msg.event, msg.payload);
      } else if (evt.includes('BOOKING') || evt.includes('PAYMENT')) {
        onUpdate('bookings', msg.event, msg.payload);
      } else if (evt.includes('SERVICE')) {
        onUpdate('room_service_requests', msg.event, msg.payload);
      } else {
        onUpdate('all', msg.event, msg.payload);
      }
    });

    // 2. Supabase Postgres Changes
    let sbChannel: any = null;
    if (supabase) {
      try {
        const channelId = `staff-sync-${Math.random().toString(36).substring(2, 9)}`;
        sbChannel = supabase
          .channel(channelId)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (p) => active && onUpdate('rooms', p.eventType, p.new))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (p) => active && onUpdate('bookings', p.eventType, p.new))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'room_service_requests' }, (p) => active && onUpdate('room_service_requests', p.eventType, p.new))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, (p) => active && onUpdate('audit_logs', p.eventType, p.new))
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn('Supabase Realtime disconnected, fallback transports remain active.');
            }
          });
      } catch (err) {
        console.warn('Supabase subscribe error:', err);
      }
    }

    // 3. Backend Express SSE Stream
    let evtSource: EventSource | null = null;
    if (typeof window !== 'undefined' && 'EventSource' in window) {
      try {
        const sseUrl = `${API_BASE_URL}/live-events`;
        evtSource = new EventSource(sseUrl);

        evtSource.addEventListener('room_updated', (e) => {
          if (!active) return;
          try { onUpdate('rooms', 'UPDATE', JSON.parse(e.data)); } catch { onUpdate('rooms'); }
        });

        const bookingEvents = [
          'booking_created',
          'booking_checked_in',
          'booking_checked_out',
          'booking_cancelled',
          'booking_paid',
          'booking_updated',
        ];
        bookingEvents.forEach((evName) => {
          evtSource?.addEventListener(evName, (e) => {
            if (!active) return;
            try { onUpdate('bookings', evName, JSON.parse(e.data)); } catch { onUpdate('bookings'); }
          });
        });

        const serviceEvents = ['service_request_created', 'service_request_updated'];
        serviceEvents.forEach((evName) => {
          evtSource?.addEventListener(evName, (e) => {
            if (!active) return;
            try { onUpdate('room_service_requests', evName, JSON.parse(e.data)); } catch { onUpdate('room_service_requests'); }
          });
        });

        evtSource.onerror = () => {
          // EventSource automatically attempts reconnection
        };
      } catch (err) {
        console.warn('SSE connection error:', err);
      }
    }

    // 4. Window focus & visibility change trigger
    const onVisibilityOrFocus = () => {
      if (!active) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        onUpdate('all', 'WINDOW_FOCUS');
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', onVisibilityOrFocus);
      document.addEventListener('visibilitychange', onVisibilityOrFocus);
    }

    // 5. Periodic Safety Heartbeat (every 6 seconds silent sync)
    const heartbeatTimer = setInterval(() => {
      if (!active) return;
      onUpdate('all', 'HEARTBEAT');
    }, 6000);

    return () => {
      active = false;
      unsubBroadcast();
      clearInterval(heartbeatTimer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onVisibilityOrFocus);
        document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      }
      if (evtSource) {
        evtSource.close();
      }
      if (sbChannel && supabase) {
        supabase.removeChannel(sbChannel);
      }
    };
  },
};
