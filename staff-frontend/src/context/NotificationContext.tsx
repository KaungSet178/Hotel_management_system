import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import { playNotificationChime } from '@/lib/sound';
import { useToast } from '@/components/toast';

export type NotificationType =
  | 'NEW_BOOKING'
  | 'PAYMENT_PROOF'
  | 'SERVICE_REQUEST'
  | 'CHECK_IN'
  | 'PAYMENT_SETTLED'
  | 'GENERAL';

export interface StaffNotification {
  id: string;
  type: NotificationType;
  title: string;
  desc: string;
  timestamp: number;
  read: boolean;
  to: string;
  adminTo?: string;
  bookingRef?: string;
  roomNumber?: string;
}

interface NotificationContextValue {
  notifications: StaffNotification[];
  unreadCount: number;
  addNotification: (
    item: Omit<StaffNotification, 'id' | 'timestamp' | 'read'>,
    triggerAlert?: boolean,
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  broadcastEvent: (event: string, payload: Record<string, unknown>) => void;
}

const STORAGE_KEY = 'stayease.staff.notifications.v2';
const CROSS_TAB_CHANNEL_NAME = 'stayease_live_cross_tab_channel';
const BROADCAST_REALTIME_TOPIC = 'stayease-live-broadcast';

const initialDefaultNotifications: StaffNotification[] = [
  {
    id: 'seed-notif-1',
    type: 'PAYMENT_PROOF',
    title: 'Deposit proof awaiting approval',
    desc: 'SF-9510 · Thant Zin Oo · 759,000 MMK (KBZPay)',
    timestamp: Date.now() - 1000 * 60 * 15,
    read: false,
    to: '/requests',
    adminTo: '/admin/finances',
    bookingRef: 'SF-9510',
  },
  {
    id: 'seed-notif-2',
    type: 'SERVICE_REQUEST',
    title: 'Room 308 — Urgent thermostat check',
    desc: 'AC thermostat calibration requested by U Kyaw Zayar',
    timestamp: Date.now() - 1000 * 60 * 45,
    read: false,
    to: '/services',
    adminTo: '/admin/rooms',
    roomNumber: '308',
  },
  {
    id: 'seed-notif-3',
    type: 'PAYMENT_SETTLED',
    title: 'Card settlement confirmed',
    desc: 'SF-9501 · Jean-Luc Meyer · Governor Suite 501',
    timestamp: Date.now() - 1000 * 60 * 120,
    read: true,
    to: '/reservations',
    adminTo: '/admin/finances',
    bookingRef: 'SF-9501',
  },
];

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [notifications, setNotifications] = useState<StaffNotification[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return initialDefaultNotifications;
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  const addNotification = useCallback(
    (
      item: Omit<StaffNotification, 'id' | 'timestamp' | 'read'>,
      triggerAlert = true,
    ) => {
      const newNotif: StaffNotification = {
        ...item,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        read: false,
      };

      setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]); // keep latest 50

      if (triggerAlert) {
        playNotificationChime();
        toast.info(`${newNotif.title} — ${newNotif.desc}`);
      }
    },
    [toast],
  );

  // Broadcast function to notify customer frontends / other tabs
  const broadcastEvent = useCallback((event: string, payload: Record<string, unknown>) => {
    // 1. Cross-tab channel (local machine)
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel(CROSS_TAB_CHANNEL_NAME);
        bc.postMessage({ event, payload, timestamp: Date.now() });
        setTimeout(() => bc.close(), 100);
      }
    } catch {
      // ignore
    }

    // 2. Supabase Realtime broadcast channel
    if (supabase) {
      const liveChannel = supabase.channel(BROADCAST_REALTIME_TOPIC);
      liveChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          liveChannel.send({
            type: 'broadcast',
            event,
            payload,
          }).catch(() => {});
        }
      });
    }

    // 3. Storage event fallback
    try {
      localStorage.setItem('stayease.live_event_bus', JSON.stringify({ event, payload, ts: Date.now() }));
    } catch {
      // ignore
    }
  }, []);

  // Listen to Supabase Realtime Postgres Changes & Broadcasts
  useEffect(() => {
    // 1. Cross-tab local channel listener
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel(CROSS_TAB_CHANNEL_NAME);
        bc.onmessage = (msgEvent) => {
          const { event, payload } = msgEvent.data || {};
          if (event === 'NEW_BOOKING') {
            addNotification({
              type: 'NEW_BOOKING',
              title: 'New Online Reservation',
              desc: `${payload.guestName || 'Guest'} · Room ${payload.roomNumber || 'Assigned'} · #${payload.reference || ''}`,
              to: '/reservations',
              adminTo: '/admin/rooms',
              bookingRef: payload.reference,
            });
          } else if (event === 'PAYMENT_PROOF_UPLOADED') {
            addNotification({
              type: 'PAYMENT_PROOF',
              title: 'New Payment Slip Uploaded',
              desc: `${payload.guestName || 'Guest'} uploaded slip for #${payload.reference || ''}`,
              to: '/requests',
              adminTo: '/admin/finances',
              bookingRef: payload.reference,
            });
          } else if (event === 'SERVICE_REQUEST_CREATED') {
            addNotification({
              type: 'SERVICE_REQUEST',
              title: 'Guest Service Request',
              desc: `Room ${payload.roomNumber || 'Room'} · ${payload.category || 'Service'}: ${payload.details || payload.title || ''}`,
              to: '/services',
              adminTo: '/admin/rooms',
              roomNumber: payload.roomNumber,
            });
          }
        };
      }
    } catch {
      // ignore
    }

    // 2. Window storage listener fallback
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'stayease.live_event_bus' && e.newValue) {
        try {
          const { event, payload } = JSON.parse(e.newValue);
          if (event === 'NEW_BOOKING') {
            addNotification({
              type: 'NEW_BOOKING',
              title: 'New Online Reservation',
              desc: `${payload.guestName || 'Guest'} · #${payload.reference || ''}`,
              to: '/reservations',
              adminTo: '/admin/rooms',
              bookingRef: payload.reference,
            });
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);

    // 3. Supabase Realtime Postgres Changes
    const client = supabase;
    let sbChannel: any = null;
    if (client) {
      const channelId = `staff-realtime-notif-${Math.random().toString(36).substring(2, 9)}`;
      sbChannel = client
        .channel(channelId)
        // Listen to new bookings inserted
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'bookings' },
          (payload) => {
            const row = payload.new as any;
            if (!row || row.booking_reference?.startsWith('EXP-')) return;
            addNotification({
              type: 'NEW_BOOKING',
              title: 'New Reservation Created',
              desc: `${row.guest_name || 'Guest'} · #${row.booking_reference} (${row.total_amount ? Number(row.total_amount).toLocaleString() + ' MMK' : 'Reserved'})`,
              to: '/reservations',
              adminTo: '/admin/rooms',
              bookingRef: row.booking_reference,
            });
          },
        )
        // Listen to updates on bookings (payment slip upload, approval, etc.)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'bookings' },
          (payload) => {
            const newRow = payload.new as any;
            const oldRow = (payload.old || {}) as any;
            if (!newRow || newRow.booking_reference?.startsWith('EXP-')) return;

            // If payment proof was uploaded
            if (newRow.payment_proof && !oldRow.payment_proof) {
              addNotification({
                type: 'PAYMENT_PROOF',
                title: 'Deposit Slip Uploaded',
                desc: `${newRow.guest_name || 'Guest'} uploaded payment screenshot for #${newRow.booking_reference}`,
                to: '/requests',
                adminTo: '/admin/finances',
                bookingRef: newRow.booking_reference,
              });
            }
            // If self-checked in via QR
            else if (newRow.booking_status === 'CHECKED_IN' && oldRow.booking_status !== 'CHECKED_IN') {
              addNotification({
                type: 'CHECK_IN',
                title: 'Express Check-In Completed',
                desc: `${newRow.guest_name || 'Guest'} checked into Room ${newRow.room_number || ''}`,
                to: '/reservations',
                adminTo: '/admin/rooms',
                bookingRef: newRow.booking_reference,
              });
            }
          },
        )
        // Listen to new room service requests
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'room_service_requests' },
          (payload) => {
            const row = payload.new as any;
            if (!row) return;
            addNotification({
              type: 'SERVICE_REQUEST',
              title: `Service Request · Room ${row.room_number || 'Room'}`,
              desc: `${row.category || 'Concierge'}: ${row.description || row.details || 'Guest request'}`,
              to: '/services',
              adminTo: '/admin/rooms',
              roomNumber: row.room_number,
            });
          },
        )
        .subscribe();
    }

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', onStorage);
      if (sbChannel && client) {
        client.removeChannel(sbChannel);
      }
    };
  }, [addNotification]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        broadcastEvent,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
