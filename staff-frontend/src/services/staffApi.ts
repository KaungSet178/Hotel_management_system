import { supabase } from '@/lib/supabase';
import type {
  AuditLogRecord,
  Booking,
  BookingChannel,
  BookingPayment,
  BookingRequest,
  BookingStatus,
  ChannelRecord,
  RequestState,
  Room,
  RoomStatus,
  ServiceRequest,
  ServiceState,
  StaffUser,
} from '@/types';
import { initialRooms, initialBookings, initialRequests, initialServiceRequests } from '@/data/seed';
import { initialAuditLogs, initialChannelRecords } from '@/data/adminSeed';

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
    const raw = localStorage.getItem('stayflow.staff.active_profile');
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

export function mapSupabaseRoomToUi(
  r: any,
  checkedInBookingsMap?: Map<string, { guest_name: string; check_out_date: string; booking_reference: string }>,
): Room {
  const checkedIn = checkedInBookingsMap?.get(r.id);
  const rawStatus = (r.status || 'AVAILABLE').toUpperCase() as RoomStatus;

  return {
    id: r.id,
    number: String(r.room_number || ''),
    floor: Number(r.floor) || 1,
    category: r.category || r.room_type || 'Deluxe',
    beds: r.bed_configuration || '1 King Bed',
    maxGuests: Number(r.capacity) || 2,
    size: Number(r.area_sqm) || 35,
    wing: r.wing || `Floor ${r.floor || 1}`,
    pricePerNight: Number(r.price_per_night) || 200000,
    amenities: Array.isArray(r.amenities) ? r.amenities : [],
    status: rawStatus,
    image: r.image_url || undefined,
    workOrder: rawStatus === 'MAINTENANCE' ? (r.description || 'Under Routine Maintenance') : undefined,
    guestName: checkedIn?.guest_name || undefined,
    departsAt: checkedIn?.check_out_date ? `Departs: ${checkedIn.check_out_date}` : undefined,
    bookingRef: checkedIn?.booking_reference ? `#${checkedIn.booking_reference}` : undefined,
  };
}

export function mapSupabaseBookingToUi(b: any, roomsMap?: Map<string, any>): Booking {
  const room = roomsMap?.get(b.room_id);
  const checkIn = String(b.check_in_date || '').split('T')[0];
  const checkOut = String(b.check_out_date || '').split('T')[0];
  const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)) || 1;

  let paymentState: BookingPayment = 'PENDING';
  if (b.payment_status === 'PAID') paymentState = 'PAID';
  else if (b.payment_method === 'PAY_AT_HOTEL') paymentState = 'PAY_AT_HOTEL';
  else if (b.payment_status === 'SETTLED') paymentState = 'FEE_SETTLED';
  else if (b.payment_method === 'ONLINE' || b.payment_method === 'KBZPAY' || b.payment_method === 'CARD') {
    paymentState = 'PREPAID';
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
    request: b.guest_preferences ? JSON.stringify(b.guest_preferences) : undefined,
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
  } else if (b.payment_method === 'PAY_AT_HOTEL') {
    state = 'PAY_AT_HOTEL';
  }

  let slip = undefined;
  if (b.payment_proof) {
    slip = {
      txnRef: b.payment_proof.txnRef || b.transaction_id || `TXN-${b.booking_reference}`,
      amount: Number(b.payment_proof.amount || b.total_amount || 0),
      payer: b.payment_proof.payer || b.guest_name,
      recipient: b.payment_proof.recipient || 'StayFlow Hospitality Co., Ltd',
      timestamp: b.payment_proof.timestamp || b.payment_proof.uploadedAt || b.created_at || 'Recently',
      receiptUrl: b.payment_proof.receiptUrl || b.payment_proof.base64DataUrl || undefined,
      fileName: b.payment_proof.fileName || undefined,
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

export function mapSupabaseServiceRequestToUi(s: any, roomsMap?: Map<string, any>): ServiceRequest {
  const room = roomsMap?.get(s.room_id);
  const roomLabel = s.room_number ? `Room ${s.room_number}` : (room?.room_number ? `Room ${room.room_number}` : 'Room 101');
  const status = (s.status || 'PENDING').toUpperCase();
  const state: ServiceState = status === 'COMPLETED' ? 'COMPLETED' : (status === 'IN_PROGRESS' || status === 'ASSIGNED' ? 'IN_PROGRESS' : 'PENDING');

  return {
    id: s.id,
    room: roomLabel,
    category: s.category_label || s.category || 'Housekeeping',
    title: s.description || 'Guest Service Request',
    guest: s.guest_name || 'In-House Guest',
    ago: formatTimeAgo(s.created_at),
    quote: s.delivery_time ? `Scheduled: ${s.delivery_time}` : 'Standard Service',
    urgency: s.priority === 'URGENT' ? 'URGENT' : 'NORMAL',
    assignee: s.assigned_to ? 'Staff Assigned' : undefined,
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
    clerkOrSource: b.clerk_name || (isWalkIn ? 'Front Desk Walk-In' : 'Direct Web Booking'),
    specialNotes: b.special_notes || undefined,
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
        .select('id, room_id, guest_name, check_out_date, booking_reference')
        .eq('booking_status', 'CHECKED_IN');

      const checkedInMap = new Map<string, { guest_name: string; check_out_date: string; booking_reference: string }>();
      if (checkedInBookings) {
        for (const b of checkedInBookings) {
          if (b.room_id) checkedInMap.set(b.room_id, b);
        }
      }

      return rawRooms.map((r) => mapSupabaseRoomToUi(r, checkedInMap));
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

      const { data: rawRooms } = await supabase.from('rooms').select('id, room_number, category, room_type');
      const roomsMap = new Map((rawRooms || []).map((r) => [r.id, r]));

      return rawBookings.map((b) => mapSupabaseBookingToUi(b, roomsMap));
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
        .or('payment_status.eq.AWAITING_REVIEW,payment_method.eq.PAY_AT_HOTEL,booking_status.eq.PENDING')
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

      const { data: rawRooms } = await supabase.from('rooms').select('id, room_number, category, room_type');
      const roomsMap = new Map((rawRooms || []).map((r) => [r.id, r]));

      return rawServices.map((s) => mapSupabaseServiceRequestToUi(s, roomsMap));
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
        .order('check_in_date', { ascending: false });

      if (bErr || !rawBookings) {
        console.warn('Could not fetch channel records from Supabase:', bErr?.message);
        return initialChannelRecords;
      }

      const { data: rawRooms } = await supabase.from('rooms').select('id, room_number, category, room_type');
      const roomsMap = new Map((rawRooms || []).map((r) => [r.id, r]));

      return rawBookings.map((b) => mapSupabaseBookingToChannelRecord(b, roomsMap));
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
    if (updates.category) payload.category = updates.category;
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
          payment_method: walkInData.paymentMethod || 'PAY_AT_HOTEL',
          payment_status: 'PAID',
          special_notes: `Counter walk-in registered by ${walkInData.clerkName || user?.name || 'Front Desk'}`,
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

      await supabase.from('bookings').insert({
        booking_reference: ref,
        guest_name: walkInData.guestName,
        guest_email: `walkin.${ref}@hotel.internal`,
        guest_phone: walkInData.phone || '',
        room_id: roomId,
        check_in_date: now.split('T')[0],
        check_out_date: new Date(Date.now() + (walkInData.nights || 2) * 86400000).toISOString().split('T')[0],
        total_amount: walkInData.amount || 340000,
        payment_method: walkInData.paymentMethod || 'PAY_AT_HOTEL',
        payment_status: 'PAID',
        booking_status: 'CHECKED_IN',
        checked_in_at: now,
        channel: 'WALK_IN',
        clerk_name: walkInData.clerkName || user?.name || 'Front Desk',
        guest_nrc_passport: walkInData.nrc || '',
        created_at: now,
      });

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
    const headers = await getAuthHeader();

    const res = await fetch(`${API_BASE_URL}/check-out/${cleanRef}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error || json.message || 'Check-out failed');
    }
  },

  /**
   * Update service request state (PENDING -> IN_PROGRESS -> COMPLETED)
   */
  async updateServiceState(id: string, state: ServiceState, assignedTo?: string): Promise<void> {
    if (!supabase) return;
    const dbStatus = state === 'COMPLETED' ? 'COMPLETED' : state === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING';
    await supabase.from('room_service_requests').update({
      status: dbStatus,
      assigned_to: assignedTo,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
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
   * Realtime subscription channel for instant updates
   */
  subscribeToChanges(onUpdate: (table: string) => void): () => void {
    if (!supabase) return () => {};

    const channelId = `staff-portal-sync-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => onUpdate('rooms'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => onUpdate('bookings'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_service_requests' }, () => onUpdate('room_service_requests'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => onUpdate('audit_logs'))
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  },
};
