import { useMemo, useState } from 'react';
import {
  Edit3,
  Plus,
  Search,
  Wrench,
  Trash2,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useAdminStore } from '../context/AdminStore';
import { AdminHeader } from '../components/AdminHeader';
import { RoomEditModal } from '../components/RoomEditModal';
import { AddRoomModal } from '../components/AddRoomModal';
import { MaintenanceModal } from '../components/MaintenanceModal';
import type { Room } from '@/types';
import { cn } from '@/lib/cn';
import { useToast } from '@/components/toast';

export function AdminRoomsPage() {
  const toast = useToast();
  const { rooms, updateRoom, addRoom, toggleMaintenance, deleteRoom } = useAdminStore();

  const [search, setSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Modals state
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [maintenanceRoom, setMaintenanceRoom] = useState<Room | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const matchSearch =
        r.number.toLowerCase().includes(search.toLowerCase()) ||
        r.category.toLowerCase().includes(search.toLowerCase()) ||
        r.wing.toLowerCase().includes(search.toLowerCase()) ||
        (r.guestName && r.guestName.toLowerCase().includes(search.toLowerCase()));

      const matchFloor = floorFilter === 'ALL' || String(r.floor) === floorFilter;
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;

      return matchSearch && matchFloor && matchStatus;
    });
  }, [rooms, search, floorFilter, statusFilter]);

  const handleDelete = (id: string, num: string) => {
    if (window.confirm(`Are you sure you want to remove Room ${num} from active inventory?`)) {
      deleteRoom(id);
      toast.info(`Room ${num} removed.`);
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Room Inventory & Pricing"
        subtitle="Live inventory rack matrix, nightly rate yields, amenity configurations, and maintenance lockouts"
        badge={`${rooms.length} Total Suites`}
        actions={
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-label-md font-medium text-white shadow-xs transition hover:brightness-110 active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" />
            Add New Room
          </button>
        }
      />

      {/* Control Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search room number, suite category, wing, guest..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9.5 w-full rounded-xl border border-outline-variant/60 bg-surface-container-low pl-9 pr-4 text-body-sm text-on-surface outline-none focus:border-primary focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Floor filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-1.5 text-label-sm">
            <span className="text-on-surface-variant">Floor:</span>
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="bg-transparent font-medium text-on-surface outline-none cursor-pointer"
            >
              <option value="ALL">All Floors</option>
              <option value="1">Floor 1</option>
              <option value="2">Floor 2</option>
              <option value="3">Floor 3</option>
              <option value="4">Floor 4</option>
              <option value="5">Floor 5</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-1.5 text-label-sm">
            <span className="text-on-surface-variant">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-medium text-on-surface outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="OCCUPIED">Occupied</option>
              <option value="RESERVED">Reserved</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center rounded-xl border border-outline-variant/60 bg-surface-container-low p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={cn(
                'rounded-lg p-1.5 transition',
                viewMode === 'GRID' ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-on-surface',
              )}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={cn(
                'rounded-lg p-1.5 transition',
                viewMode === 'TABLE' ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-on-surface',
              )}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Mode */}
      {viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => {
            const isMaint = room.status === 'MAINTENANCE';
            const isOccupied = room.status === 'OCCUPIED';
            const isAvail = room.status === 'AVAILABLE';

            return (
              <div
                key={room.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-5 shadow-xs transition hover:shadow-md hover:border-primary/40"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-headline-xs font-bold text-on-surface">
                          Room {room.number}
                        </span>
                        <span className="rounded-md bg-surface-container px-2 py-0.5 text-label-xs font-semibold text-on-surface-variant">
                          F{room.floor} • {room.wing}
                        </span>
                      </div>
                      <p className="mt-1 text-label-md font-medium text-primary">
                        {room.category}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-label-xs font-bold uppercase tracking-wider',
                        isAvail && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                        isOccupied && 'bg-primary/10 text-primary',
                        room.status === 'RESERVED' && 'bg-sky-500/10 text-sky-700',
                        isMaint && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                      )}
                    >
                      {room.status}
                    </span>
                  </div>

                  {/* Pricing Banner */}
                  <div className="mt-4 flex items-baseline justify-between rounded-xl bg-surface-container-low px-3.5 py-2.5">
                    <div>
                      <p className="text-label-xs text-on-surface-variant">Base Rate</p>
                      <p className="text-title-sm font-bold text-on-surface">
                        {room.pricePerNight.toLocaleString()}{' '}
                        <span className="text-label-xs font-normal text-on-surface-variant">
                          MMK / night
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingRoom(room)}
                      className="rounded-lg p-1.5 text-secondary hover:bg-secondary-container/50 transition"
                      title="Quick Adjust Rate"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Room Details */}
                  <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1 text-label-xs text-on-surface-variant">
                    <span>{room.beds}</span>
                    <span>•</span>
                    <span>Max {room.maxGuests} Guests</span>
                    <span>•</span>
                    <span>{room.size} m²</span>
                  </div>

                  {/* Amenities Pills */}
                  {room.amenities && room.amenities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {room.amenities.slice(0, 3).map((amenity) => (
                        <span
                          key={amenity}
                          className="rounded-full bg-surface-container px-2 py-0.5 text-[11px] text-on-surface-variant"
                        >
                          {amenity}
                        </span>
                      ))}
                      {room.amenities.length > 3 && (
                        <span className="rounded-full bg-surface-container px-1.5 py-0.5 text-[11px] text-on-surface-variant">
                          +{room.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Occupied / Maintenance Notice */}
                  {isOccupied && room.guestName && (
                    <div className="mt-3.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-body-xs text-primary">
                      Guest: <strong>{room.guestName}</strong>
                      {room.departsAt && <span> • Departs {room.departsAt}</span>}
                    </div>
                  )}

                  {isMaint && room.workOrder && (
                    <div className="mt-3.5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-1.5 text-body-xs text-amber-800 dark:text-amber-300">
                      Work Order: <strong>{room.workOrder}</strong>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="mt-5 flex items-center justify-between border-t border-outline-variant/40 pt-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMaintenanceRoom(room)}
                      className={cn(
                        'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-label-xs font-semibold transition',
                        isMaint
                          ? 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-700 hover:bg-amber-500/20',
                      )}
                    >
                      <Wrench className="h-3 w-3" />
                      {isMaint ? 'Clear Lock' : 'Maint. Lock'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(room.id, room.number)}
                      className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10 transition"
                      title="Decommission Room"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingRoom(room)}
                    className="flex items-center gap-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-1.5 text-label-xs font-semibold text-on-surface hover:bg-surface-container transition"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table Mode */
        <div className="overflow-x-auto rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/60 bg-surface-container-low text-label-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                <th className="px-5 py-3">Room</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Floor & Wing</th>
                <th className="px-5 py-3">Nightly Rate</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Current Assignment</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40 text-body-sm text-on-surface">
              {filteredRooms.map((room) => (
                <tr key={room.id} className="hover:bg-surface-container-low/50 transition">
                  <td className="px-5 py-3.5 font-bold text-on-surface">
                    Room {room.number}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-primary">
                    {room.category}
                  </td>
                  <td className="px-5 py-3.5 text-on-surface-variant">
                    Floor {room.floor} • {room.wing}
                  </td>
                  <td className="px-5 py-3.5 font-bold">
                    {room.pricePerNight.toLocaleString()} MMK
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-label-xs font-semibold',
                        room.status === 'AVAILABLE' && 'bg-emerald-500/10 text-emerald-700',
                        room.status === 'OCCUPIED' && 'bg-primary/10 text-primary',
                        room.status === 'RESERVED' && 'bg-sky-500/10 text-sky-700',
                        room.status === 'MAINTENANCE' && 'bg-amber-500/10 text-amber-700',
                      )}
                    >
                      {room.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-on-surface-variant">
                    {room.guestName ? (
                      <span className="font-medium text-on-surface">Guest: {room.guestName}</span>
                    ) : room.workOrder ? (
                      <span className="text-amber-700 text-xs">{room.workOrder}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => setMaintenanceRoom(room)}
                      className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container"
                      title="Maintenance Lock"
                    >
                      <Wrench className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingRoom(room)}
                      className="rounded-lg p-1.5 text-primary hover:bg-primary/10"
                      title="Edit Room"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <RoomEditModal
        room={editingRoom}
        open={!!editingRoom}
        onClose={() => setEditingRoom(null)}
        onSave={updateRoom}
      />

      <MaintenanceModal
        room={maintenanceRoom}
        open={!!maintenanceRoom}
        onClose={() => setMaintenanceRoom(null)}
        onToggle={toggleMaintenance}
      />

      <AddRoomModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={addRoom}
      />
    </div>
  );
}
