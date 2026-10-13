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
import { useToast } from '@/components/ui/toast';
import { listGrantedReferences } from '@/lib/access';
import { subscribeLiveEvents } from '@/lib/broadcast';

export type CustomerNotificationType =
  | 'BOOKING_APPROVED'
  | 'BOOKING_REJECTED'
  | 'SERVICE_REQUEST_UPDATE'
  | 'GENERAL';

export interface CustomerNotification {
  id: string;
  type: CustomerNotificationType;
  title: string;
  desc: string;
  timestamp: number;
  read: boolean;
  to: string;
  reference?: string;
  roomNumber?: string;
}

interface CustomerNotificationContextValue {
  notifications: CustomerNotification[];
  unreadCount: number;
  addNotification: (
    item: Omit<CustomerNotification, 'id' | 'timestamp' | 'read'>,
    triggerAlert?: boolean,
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const STORAGE_KEY = 'stayflow.customer.notifications.v1';

const defaultSeedNotifications: CustomerNotification[] = [
  {
    id: 'cust-notif-welcome',
    type: 'GENERAL',
    title: 'Welcome to Grand Azure Resort & Spa',
    desc: 'Enjoy your luxury retreat. 24/7 concierge, in-room dining, and spa amenities are ready for you.',
    timestamp: Date.now() - 1000 * 60 * 60,
    read: false,
    to: '/guest-services',
  },
];

const CustomerNotificationContext = createContext<CustomerNotificationContextValue | null>(null);

export function CustomerNotificationProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [notifications, setNotifications] = useState<CustomerNotification[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return defaultSeedNotifications;
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
      item: Omit<CustomerNotification, 'id' | 'timestamp' | 'read'>,
      triggerAlert = true,
    ) => {
      const newNotif: CustomerNotification = {
        ...item,
        id: `cust-notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
        read: false,
      };

      setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]);

      if (triggerAlert) {
        playNotificationChime();
        if (item.type === 'BOOKING_APPROVED') {
          toast.success(newNotif.title, newNotif.desc);
        } else if (item.type === 'BOOKING_REJECTED') {
          toast.error(newNotif.title, newNotif.desc);
        } else {
          toast.info(newNotif.title, newNotif.desc);
        }
      }
    },
    [toast],
  );

  // Setup Realtime & Broadcast Channel listeners
  useEffect(() => {
    // Helper to verify if customer owns or is tracking this booking
    const isRelevantBooking = (ref?: string): boolean => {
      if (!ref) return true;
      const cleanRef = String(ref).replace(/^#/, '');
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      if (currentPath.includes(cleanRef)) return true;
      const granted = listGrantedReferences().map((r) => r.replace(/^#/, ''));
      if (granted.length === 0) return true; // If guest hasn't stored a specific list, broadcast applies
      return granted.includes(cleanRef);
    };

    const handleApproval = (rawRef: string, roomNumber?: string) => {
      const cleanRef = String(rawRef || '').replace(/^#/, '');
      if (!cleanRef || !isRelevantBooking(cleanRef)) return;
      addNotification({
        type: 'BOOKING_APPROVED',
        title: '🎉 Reservation Approved!',
        desc: `Your reservation #${cleanRef} has been confirmed. Room: ${roomNumber || 'Assigned Suite'}.`,
        to: `/reservations/${cleanRef}`,
        reference: cleanRef,
        roomNumber: roomNumber || 'Assigned Suite',
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('stayflow:booking-updated', {
            detail: { reference: cleanRef, status: 'CONFIRMED', roomNumber },
          }),
        );
      }
    };

    const handleRejection = (rawRef: string, reason?: string) => {
      const cleanRef = String(rawRef || '').replace(/^#/, '');
      if (!cleanRef || !isRelevantBooking(cleanRef)) return;
      addNotification({
        type: 'BOOKING_REJECTED',
        title: 'Reservation Update',
        desc: `Your reservation #${cleanRef} was not confirmed. Reason: ${reason || 'Payment review declined'}.`,
        to: `/reservations/${cleanRef}`,
        reference: cleanRef,
      });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('stayflow:booking-updated', {
            detail: { reference: cleanRef, status: 'CANCELLED', reason },
          }),
        );
      }
    };

    // 1. Unified Multi-Transport Live Event Listener (SSE, BroadcastChannel, Supabase Broadcast)
    const unsubLiveEvents = subscribeLiveEvents((msg) => {
      const { event, payload } = msg;
      const ref = (payload?.reference || payload?.booking_reference || '') as string;
      const roomNumber = (payload?.roomNumber || payload?.room_number || '') as string;

      if (event === 'BOOKING_APPROVED' || event === 'BOOKING_PAID') {
        handleApproval(ref, roomNumber);
      } else if (event === 'BOOKING_REJECTED' || event === 'BOOKING_CANCELLED') {
        handleRejection(ref, payload?.reason as string);
      } else if (event === 'BOOKING_UPDATED') {
        const bStatus = (payload?.booking_status || payload?.status || '') as string;
        if (bStatus === 'CONFIRMED' || bStatus === 'confirmed') {
          handleApproval(ref, roomNumber);
        } else if (bStatus === 'CANCELLED' || bStatus === 'cancelled') {
          handleRejection(ref, payload?.reason as string);
        } else if (ref && isRelevantBooking(ref)) {
          window.dispatchEvent(
            new CustomEvent('stayflow:booking-updated', {
              detail: { reference: ref.replace(/^#/, ''), status: bStatus, roomNumber },
            }),
          );
        }
      } else if (event === 'SERVICE_REQUEST_UPDATED' || event === 'SERVICE_REQUEST_UPDATE') {
        const sStatus = String((payload as any)?.status || 'UPDATED').toUpperCase();
        addNotification({
          type: 'SERVICE_REQUEST_UPDATE',
          title: `Concierge Service ${sStatus === 'COMPLETED' ? 'Completed' : 'Updated'}`,
          desc: `Service request #${(payload as any)?.requestId || (payload as any)?.id || ''} is now marked as ${sStatus.toLowerCase().replace('_', ' ')}.`,
          to: '/guest-services',
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('stayflow:service-request-updated', {
              detail: payload,
            }),
          );
        }
      }
    });

    // 2. Direct Supabase Postgres Changes Listener
    const client = supabase;
    let sbChannel: any = null;
    if (client) {
      const channelId = `customer-realtime-${Math.random().toString(36).substring(2, 9)}`;
      sbChannel = client
        .channel(channelId)
        // Listen to bookings update (approval or status change)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'bookings' },
          (payload) => {
            const newRow = payload.new as any;
            if (!newRow) return;

            const ref = newRow.booking_reference;
            if (newRow.booking_status === 'CONFIRMED') {
              handleApproval(ref, newRow.room_number);
            } else if (newRow.booking_status === 'CANCELLED') {
              handleRejection(ref, 'Reservation cancelled');
            }
          },
        )
        // Listen to service request updates
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'room_service_requests' },
          (payload) => {
            const newRow = payload.new as any;
            if (!newRow) return;
            const sStatus = (newRow.status || 'UPDATED').toUpperCase();
            addNotification({
              type: 'SERVICE_REQUEST_UPDATE',
              title: `Service Request ${sStatus === 'COMPLETED' ? 'Completed' : 'Updated'}`,
              desc: `Room ${newRow.room_number || 'Suite'}: ${newRow.category_label || newRow.category || 'Service'} is now ${sStatus.toLowerCase().replace('_', ' ')}.`,
              to: '/guest-services',
            });
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('stayflow:service-request-updated', {
                  detail: newRow,
                }),
              );
            }
          },
        )
        .subscribe();
    }

    return () => {
      unsubLiveEvents();
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
    <CustomerNotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
      }}
    >
      {children}
    </CustomerNotificationContext.Provider>
  );
}

export function useCustomerNotifications() {
  const context = useContext(CustomerNotificationContext);
  if (!context) {
    throw new Error('useCustomerNotifications must be used within a CustomerNotificationProvider');
  }
  return context;
}
