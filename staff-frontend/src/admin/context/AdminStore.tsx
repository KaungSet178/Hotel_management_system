import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  AuditLogRecord,
  ChannelRecord,
  ExecutiveMetrics,
  Room,
  RoomStatus,
} from '@/types';
import { initialRooms } from '@/data/seed';
import { initialAuditLogs, initialChannelRecords } from '@/data/adminSeed';
import { useAuth } from '@/auth';
import { staffApi } from '@/services/staffApi';
import { broadcastLiveEvent } from '@/lib/broadcast';

interface AdminStoreType {
  // Rooms
  rooms: Room[];
  loading: boolean;
  refresh: () => Promise<void>;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  addRoom: (newRoom: Omit<Room, 'id'>) => Room;
  toggleMaintenance: (id: string, workOrder?: string) => void;
  deleteRoom: (id: string) => void;

  // Channels
  channelRecords: ChannelRecord[];
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  addChannelRecord: (record: Omit<ChannelRecord, 'id' | 'ref'>) => ChannelRecord;

  // Audit Logs
  auditLogs: AuditLogRecord[];
  addAuditLog: (entry: Omit<AuditLogRecord, 'id' | 'timestamp'>) => void;
  runCancellationPolicySweep: () => { cancelledCount: number; message: string };

  // Financials & KPIs
  metrics: ExecutiveMetrics;
  selectedMonthRecords: ChannelRecord[];
}

const AdminStoreContext = createContext<AdminStoreType | null>(null);

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [channelRecords, setChannelRecords] = useState<ChannelRecord[]>(initialChannelRecords);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(initialAuditLogs);
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-10');
  const [loading, setLoading] = useState(true);

  // Initial fetch and live refresh function
  const refresh = useCallback(async () => {
    try {
      const [r, ch, al] = await Promise.all([
        staffApi.fetchRooms(),
        staffApi.fetchChannelRecords(),
        staffApi.fetchAuditLogs(),
      ]);
      setRooms(r);
      setChannelRecords(ch);
      setAuditLogs(al);
    } catch (err) {
      console.warn('Admin store data sync error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync with live Supabase on mount and listen to realtime multi-transport changes
  useEffect(() => {
    let mounted = true;
    let refreshTimer: any = null;

    const debouncedRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (!mounted) return;
        Promise.all([
          staffApi.fetchRooms(),
          staffApi.fetchChannelRecords(),
          staffApi.fetchAuditLogs(),
        ]).then(([r, ch, al]) => {
          if (!mounted) return;
          setRooms(r);
          setChannelRecords(ch);
          setAuditLogs(al);
        });
      }, 150);
    };

    refresh();

    const unsubscribe = staffApi.subscribeToChanges((table) => {
      if (!mounted) return;
      if (table === 'rooms') {
        staffApi.fetchRooms().then((r) => mounted && setRooms(r));
        staffApi.fetchChannelRecords().then((ch) => mounted && setChannelRecords(ch));
      } else if (table === 'bookings') {
        staffApi.fetchChannelRecords().then((ch) => mounted && setChannelRecords(ch));
        staffApi.fetchRooms().then((r) => mounted && setRooms(r));
      } else if (table === 'audit_logs') {
        staffApi.fetchAuditLogs().then((al) => mounted && setAuditLogs(al));
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

  // Helper to add audit log
  const addAuditLog = useCallback(
    (entry: Omit<AuditLogRecord, 'id' | 'timestamp'>) => {
      const newEntry: AuditLogRecord = {
        ...entry,
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
      setAuditLogs((prev) => [newEntry, ...prev]);

      staffApi.logAudit({
        actor: entry.actor,
        actorRole: entry.actorRole,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        details: entry.details,
        ipAddress: entry.ipAddress,
      }).catch((err) => console.warn('addAuditLog backend error:', err));
    },
    [],
  );

  // Room Management
  const updateRoom = useCallback(
    (id: string, updates: Partial<Room>) => {
      setRooms((prev) =>
        prev.map((r) => {
          if (r.id === id) {
            const updated = { ...r, ...updates };
            addAuditLog({
              actor: user?.name || 'Administrator',
              actorRole: user?.role || 'ADMIN',
              action: 'ROOM_UPDATED',
              entityType: 'rooms',
              entityId: r.id,
              details: `Room ${r.number} updated: ${Object.keys(updates).join(', ')}. Price: ${updated.pricePerNight.toLocaleString()} MMK`,
              ipAddress: '192.168.1.10 (Management Suite)',
            });
            return updated;
          }
          return r;
        }),
      );

      broadcastLiveEvent('ROOM_UPDATED', { roomId: id, updates });

      staffApi.updateRoomPricing(id, updates).then(() => {
        staffApi.fetchRooms().then(setRooms);
      }).catch((err) => console.error('updateRoom backend error:', err));
    },
    [addAuditLog, user],
  );

  const addRoom = useCallback(
    (newRoomData: Omit<Room, 'id'>): Room => {
      const tempId = `room-${newRoomData.number.toLowerCase()}-${Date.now().toString().slice(-4)}`;
      const newRoom: Room = {
        ...newRoomData,
        id: tempId,
      };
      setRooms((prev) => [...prev, newRoom]);

      addAuditLog({
        actor: user?.name || 'Administrator',
        actorRole: user?.role || 'ADMIN',
        action: 'ROOM_CREATED',
        entityType: 'rooms',
        entityId: tempId,
        details: `Created new Room ${newRoom.number} (${newRoom.category}) at ${newRoom.pricePerNight.toLocaleString()} MMK/night on floor ${newRoom.floor}.`,
        ipAddress: '192.168.1.10 (Management Suite)',
      });

      broadcastLiveEvent('ROOM_UPDATED', { roomId: tempId, action: 'CREATE' });

      staffApi.addRoom(newRoomData).then(() => {
        staffApi.fetchRooms().then(setRooms);
      }).catch((err) => console.error('addRoom backend error:', err));

      return newRoom;
    },
    [addAuditLog, user],
  );

  const toggleMaintenance = useCallback(
    (id: string, workOrder?: string) => {
      const target = rooms.find((r) => r.id === id);
      const isCurrentlyMaint = target?.status === 'MAINTENANCE';
      const nextStatus: RoomStatus = isCurrentlyMaint ? 'AVAILABLE' : 'MAINTENANCE';

      setRooms((prev) =>
        prev.map((r) => {
          if (r.id === id) {
            const updated: Room = {
              ...r,
              status: nextStatus,
              workOrder: isCurrentlyMaint ? undefined : (workOrder || 'General Maintenance Inspection'),
            };
            addAuditLog({
              actor: user?.name || 'Administrator',
              actorRole: user?.role || 'ADMIN',
              action: isCurrentlyMaint ? 'ROOM_MAINTENANCE_CLEARED' : 'ROOM_MAINTENANCE_LOCKED',
              entityType: 'rooms',
              entityId: r.id,
              details: isCurrentlyMaint
                ? `Room ${r.number} maintenance cleared; returned to AVAILABLE inventory.`
                : `Room ${r.number} locked for maintenance. Order: ${workOrder || 'Scheduled inspection'}.`,
              ipAddress: '192.168.1.10 (Management Suite)',
            });
            return updated;
          }
          return r;
        }),
      );

      broadcastLiveEvent('ROOM_UPDATED', { roomId: id, status: nextStatus });

      staffApi.updateRoomStatus(id, nextStatus).then(() => {
        staffApi.fetchRooms().then(setRooms);
      }).catch((err) => console.error('toggleMaintenance backend error:', err));
    },
    [rooms, addAuditLog, user],
  );

  const deleteRoom = useCallback(
    (id: string) => {
      const target = rooms.find((r) => r.id === id);
      setRooms((prev) => prev.filter((r) => r.id !== id));
      if (target) {
        addAuditLog({
          actor: user?.name || 'Administrator',
          actorRole: user?.role || 'ADMIN',
          action: 'ROOM_DELETED',
          entityType: 'rooms',
          entityId: id,
          details: `Room ${target.number} permanently decommissioned from inventory.`,
          ipAddress: '192.168.1.10 (Management Suite)',
        });
      }

      broadcastLiveEvent('ROOM_UPDATED', { roomId: id, action: 'DELETE' });

      staffApi.deleteRoom(id).then(() => {
        staffApi.fetchRooms().then(setRooms);
      }).catch((err) => console.error('deleteRoom backend error:', err));
    },
    [rooms, addAuditLog, user],
  );

  // Channel Records
  const addChannelRecord = useCallback(
    (recordData: Omit<ChannelRecord, 'id' | 'ref'>): ChannelRecord => {
      const prefix = recordData.channel === 'WALK_IN' ? 'WI' : 'SF';
      const seq = Math.floor(1000 + Math.random() * 9000);
      const newRecord: ChannelRecord = {
        ...recordData,
        id: `ch-${Date.now()}`,
        ref: `${prefix}-2026-${seq}`,
      };
      setChannelRecords((prev) => [newRecord, ...prev]);

      addAuditLog({
        actor: user?.name || 'Front Desk Staff',
        actorRole: user?.role || 'RECEPTIONIST',
        action: recordData.channel === 'WALK_IN' ? 'WALK_IN_REGISTERED' : 'ONLINE_BOOKING_LOGGED',
        entityType: 'channel_bookings',
        entityId: newRecord.ref,
        details: `${recordData.guestName} registered via ${recordData.channel} for Room ${recordData.roomNumber} (${recordData.totalAmount.toLocaleString()} MMK).`,
        ipAddress: '192.168.1.42 (Front Desk)',
      });

      broadcastLiveEvent('NEW_BOOKING', {
        reference: newRecord.ref,
        guestName: recordData.guestName,
        channel: recordData.channel,
        amount: recordData.totalAmount,
      });

      if (recordData.channel === 'WALK_IN') {
        staffApi.createWalkInBooking({
          guestName: recordData.guestName,
          roomNumber: recordData.roomNumber,
          phone: recordData.phone,
          nrc: recordData.nrcOrPassport,
          nights: recordData.nights,
          amount: recordData.totalAmount,
          paymentMethod: recordData.paymentMethod,
          clerkName: recordData.clerkOrSource || user?.name,
        }, user).then(() => {
          broadcastLiveEvent('BOOKING_CREATED', { reference: newRecord.ref, channel: 'WALK_IN' });
          broadcastLiveEvent('ROOM_UPDATED', { roomNumber: recordData.roomNumber, status: 'OCCUPIED' });
          Promise.all([staffApi.fetchChannelRecords(), staffApi.fetchRooms()]).then(([ch, r]) => {
            setChannelRecords(ch);
            setRooms(r);
          });
        }).catch((err) => console.error('createWalkInBooking error:', err));
      }

      return newRecord;
    },
    [addAuditLog, user],
  );

  // 24h Policy Sweep
  const runCancellationPolicySweep = useCallback(() => {
    // Optimistic cancellation
    let cancelled = 0;
    const now = new Date();

    setChannelRecords((prev) =>
      prev.map((rec) => {
        if (rec.paymentStatus === 'PENDING' && rec.paymentMethod === 'PAY_AT_HOTEL') {
          cancelled += 1;
          return {
            ...rec,
            paymentStatus: 'CANCELLED_24H_HOLD',
            specialNotes: `${rec.specialNotes || ''} [Auto-cancelled via 24h unverified hold policy sweep at ${now.toLocaleTimeString()}]`.trim(),
          };
        }
        return rec;
      }),
    );

    // Call backend API gateway sweep
    staffApi.runCancellationSweep().then(() => {
      Promise.all([
        staffApi.fetchChannelRecords(),
        staffApi.fetchRooms(),
        staffApi.fetchAuditLogs(),
      ]).then(([ch, r, al]) => {
        setChannelRecords(ch);
        setRooms(r);
        setAuditLogs(al);
      });
    }).catch((err) => console.error('runCancellationSweep error:', err));

    addAuditLog({
      actor: user?.name || 'SYSTEM_RUNNER',
      actorRole: user?.role || 'ADMIN',
      action: 'CANCELLATION_SWEEP_EXECUTED',
      entityType: 'jobs',
      entityId: `sweep-${Date.now()}`,
      details: `Manager-initiated 24-Hour Hold Policy Sweep executed. Checked reservation pool; ${cancelled} expired/unpaid reservations processed.`,
      ipAddress: '192.168.1.10 (Management Suite)',
    });

    return {
      cancelledCount: cancelled,
      message: `24-Hour Hold Policy Sweep completed. ${cancelled} unpaid reservations released back to active inventory.`,
    };
  }, [addAuditLog, user]);

  // Filter records by selected month
  const selectedMonthRecords = useMemo(() => {
    return channelRecords.filter((rec) => rec.checkIn.startsWith(selectedMonth));
  }, [channelRecords, selectedMonth]);

  // Executive Metrics calculation
  const metrics = useMemo<ExecutiveMetrics>(() => {
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter((r) => r.status === 'OCCUPIED').length;
    const availableRooms = rooms.filter((r) => r.status === 'AVAILABLE').length;
    const reservedRooms = rooms.filter((r) => r.status === 'RESERVED').length;

    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    // Filter current month revenue
    let walkInRevenue = 0;
    let onlineRevenue = 0;
    let walkInCount = 0;
    let onlineCount = 0;

    selectedMonthRecords.forEach((rec) => {
      if (rec.bookingStatus === 'CANCELLED' || rec.paymentStatus === 'CANCELLED_24H_HOLD') {
        return;
      }
      if (rec.channel === 'WALK_IN') {
        walkInRevenue += rec.totalAmount;
        walkInCount += 1;
      } else {
        onlineRevenue += rec.totalAmount;
        onlineCount += 1;
      }
    });

    const mtdRevenue = walkInRevenue + onlineRevenue;

    // ADR = Room Revenue / Occupied Rooms
    // If calculated based on active occupied rooms:
    const activeOccupiedRateSum = rooms
      .filter((r) => r.status === 'OCCUPIED')
      .reduce((sum, r) => sum + r.pricePerNight, 0);

    const adr = occupiedRooms > 0 ? activeOccupiedRateSum / occupiedRooms : 285000;
    const revPar = (adr * occupancyRate) / 100;

    // Taxes - mathematically balanced: netBase + service10 + commercialTax5 === mtdRevenue
    const netRoomRevenue = Math.round(mtdRevenue / 1.15);
    const serviceCharge10 = Math.round(netRoomRevenue * 0.1);
    const commercialTax5 = mtdRevenue - netRoomRevenue - serviceCharge10;

    return {
      totalRooms,
      occupiedRooms,
      availableRooms,
      reservedRooms,
      maintenanceRooms: 0,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      adr: Math.round(adr),
      revPar: Math.round(revPar),
      mtdRevenue,
      netRoomRevenue,
      serviceCharge10,
      commercialTax5,
      walkInRevenue,
      onlineRevenue,
      walkInCount,
      onlineCount,
    };
  }, [rooms, selectedMonthRecords]);

  const value = useMemo(
    () => ({
      rooms,
      loading,
      refresh,
      updateRoom,
      addRoom,
      toggleMaintenance,
      deleteRoom,
      channelRecords,
      selectedMonth,
      setSelectedMonth,
      addChannelRecord,
      auditLogs,
      addAuditLog,
      runCancellationPolicySweep,
      metrics,
      selectedMonthRecords,
    }),
    [
      rooms,
      loading,
      refresh,
      updateRoom,
      addRoom,
      toggleMaintenance,
      deleteRoom,
      channelRecords,
      selectedMonth,
      addChannelRecord,
      auditLogs,
      addAuditLog,
      runCancellationPolicySweep,
      metrics,
      selectedMonthRecords,
    ],
  );

  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>;
}

export function useAdminStore() {
  const context = useContext(AdminStoreContext);
  if (!context) {
    throw new Error('useAdminStore must be used within an AdminStoreProvider');
  }
  return context;
}
