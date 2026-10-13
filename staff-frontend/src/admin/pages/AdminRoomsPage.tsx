import { useMemo, useState } from 'react';
import {
  Edit3,
  Plus,
  Search,
  Trash2,
  LayoutGrid,
  List,
  BedDouble,
  Users,
  Maximize2,
  X,
  CheckCircle2,
  CalendarCheck,
  Building,
  RefreshCw,
} from 'lucide-react';
import { useAdminStore } from '../context/AdminStore';
import { AdminHeader } from '../components/AdminHeader';
import { RoomEditModal } from '../components/RoomEditModal';
import { AddRoomModal } from '../components/AddRoomModal';
import type { Room } from '@/types';
import { cn } from '@/lib/cn';
import { useToast } from '@/components/toast';

export function AdminRoomsPage() {
  const toast = useToast();
  const { rooms, updateRoom, addRoom, deleteRoom, refresh } = useAdminStore();

  const [search, setSearch] = useState('');
  const [floorFilter, setFloorFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Modals state
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Stats calculation
  const stats = useMemo(() => {
    return {
      total: rooms.length,
      available: rooms.filter((r) => r.status === 'AVAILABLE').length,
      occupied: rooms.filter((r) => r.status === 'OCCUPIED').length,
      reserved: rooms.filter((r) => r.status === 'RESERVED').length,
    };
  }, [rooms]);

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
    if (window.confirm(`Are you sure you want to decommission Room ${num} from active inventory?`)) {
      deleteRoom(id);
      toast.info(`Room ${num} removed.`);
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Room Inventory & Pricing Matrix"
        subtitle="Live inventory rack matrix, nightly rate yields, amenity configurations, and maintenance lockouts"
        badge={`${rooms.length} Suites`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                await refresh();
                toast.info(`Inventory synced with Supabase · ${rooms.length} suites live`);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 py-2 text-label-sm font-semibold text-on-surface transition hover:bg-surface-container cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Sync Live Rack
            </button>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-[#0e2a4a] px-4 py-2 text-label-sm font-semibold text-white shadow-xs transition hover:bg-[#18395f] active:scale-[0.99] cursor-pointer"
            >
              <Plus className="h-4 w-4 text-[#89f5e7]" />
              Add New Suite
            </button>
          </div>
        }
      />

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-3.5 shadow-xs">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0e2a4a]/10 text-[#0e2a4a]">
            <Building className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-on-surface-variant uppercase">Total Suites</p>
            <p className="text-xl font-extrabold text-on-surface">{stats.total}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 shadow-xs">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase">Available for Sale</p>
            <p className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">{stats.available}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3.5 shadow-xs">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-primary uppercase">Occupied In-House</p>
            <p className="text-xl font-extrabold text-primary">{stats.occupied}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3.5 shadow-xs">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-700">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold text-sky-800 dark:text-sky-300 uppercase">Reserved / Incoming</p>
            <p className="text-xl font-extrabold text-sky-700 dark:text-sky-400">{stats.reserved}</p>
          </div>
        </div>
      </div>

      {/* Control Filter Toolbar */}
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-4 shadow-xs space-y-4">
        {/* Status Tab Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 text-label-xs font-semibold">
            {[
              { id: 'ALL', label: 'All Suites', count: stats.total },
              { id: 'AVAILABLE', label: 'Available', count: stats.available, dot: 'bg-emerald-500' },
              { id: 'OCCUPIED', label: 'Occupied', count: stats.occupied, dot: 'bg-[#0e2a4a]' },
              { id: 'RESERVED', label: 'Reserved', count: stats.reserved, dot: 'bg-sky-500' },
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition cursor-pointer',
                    isActive
                      ? 'bg-[#0e2a4a] text-white shadow-xs'
                      : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container',
                  )}
                >
                  {tab.dot && <span className={cn('h-2 w-2 rounded-full', tab.dot)} />}
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                      isActive ? 'bg-white/20 text-white' : 'bg-surface-container-highest text-on-surface-variant',
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Grid vs Table View Toggle */}
          <div className="flex items-center rounded-xl border border-outline-variant/50 bg-surface-container-low p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-label-xs font-semibold transition cursor-pointer',
                viewMode === 'GRID'
                  ? 'bg-white shadow-xs text-[#0e2a4a]'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-label-xs font-semibold transition cursor-pointer',
                viewMode === 'TABLE'
                  ? 'bg-white shadow-xs text-[#0e2a4a]'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </button>
          </div>
        </div>

        {/* Second Row: Search & Floor Pills */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search by suite number, category, wing, or guest name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9.5 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low pl-9 pr-8 text-body-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none transition focus:border-primary focus:bg-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Floor Segmented Filter */}
          <div className="flex items-center gap-1.5 text-label-xs font-semibold">
            <span className="text-on-surface-variant mr-1">Floor:</span>
            {['ALL', '1', '2', '3', '4', '5'].map((fl) => {
              const isSelected = floorFilter === fl;
              return (
                <button
                  key={fl}
                  type="button"
                  onClick={() => setFloorFilter(fl)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 transition cursor-pointer',
                    isSelected
                      ? 'bg-[#0e2a4a] text-white shadow-xs'
                      : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container',
                  )}
                >
                  {fl === 'ALL' ? 'All Floors' : `${fl}F`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid Mode */}
      {viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => {
            const isAvail = room.status === 'AVAILABLE';
            const isOccupied = room.status === 'OCCUPIED';

            return (
              <div
                key={room.id}
                className={cn(
                  'group flex flex-col justify-between rounded-2xl border bg-surface-container-lowest p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                  isAvail && 'border-outline-variant/40 hover:border-emerald-500/40',
                  isOccupied && 'border-primary/20 hover:border-primary/40',
                  room.status === 'RESERVED' && 'border-sky-500/20 hover:border-sky-500/40',
                )}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black tracking-tight text-on-surface">
                          {room.number}
                        </span>
                        <span className="rounded-md bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                          Floor {room.floor} • {room.wing}
                        </span>
                      </div>
                      <p className="mt-1 text-label-md font-bold text-[#0e2a4a]">
                        {room.category}
                      </p>
                    </div>

                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-label-xs font-bold uppercase tracking-wider',
                        isAvail && 'bg-emerald-500/10 text-emerald-700',
                        isOccupied && 'bg-primary/10 text-primary',
                        room.status === 'RESERVED' && 'bg-sky-500/10 text-sky-700',
                      )}
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          isAvail && 'bg-emerald-500',
                          isOccupied && 'bg-primary',
                          room.status === 'RESERVED' && 'bg-sky-500',
                        )}
                      />
                      {room.status}
                    </span>
                  </div>

                  {/* Pricing Banner */}
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-low/70 px-3.5 py-2.5">
                    <div>
                      <p className="text-[11px] font-semibold text-on-surface-variant uppercase">Current Rate Plan</p>
                      <p className="text-title-sm font-extrabold text-on-surface">
                        {room.pricePerNight.toLocaleString()}{' '}
                        <span className="text-label-xs font-medium text-on-surface-variant">
                          MMK / night
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingRoom(room)}
                      className="flex items-center gap-1 rounded-lg border border-secondary/30 bg-secondary-container/30 px-2.5 py-1 text-label-xs font-bold text-secondary transition hover:bg-secondary-container cursor-pointer"
                      title="Adjust Nightly Rate"
                    >
                      <Edit3 className="h-3 w-3" />
                      Adjust
                    </button>
                  </div>

                  {/* Room Specs */}
                  <div className="mt-3.5 flex items-center gap-3 text-label-xs font-medium text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <BedDouble className="h-3.5 w-3.5 text-secondary" /> {room.beds}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-secondary" /> Max {room.maxGuests}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Maximize2 className="h-3.5 w-3.5 text-secondary" /> {room.size} m²
                    </span>
                  </div>

                  {/* Amenities */}
                  {room.amenities && room.amenities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {room.amenities.slice(0, 3).map((amenity) => (
                        <span
                          key={amenity}
                          className="rounded-md border border-outline-variant/30 bg-surface-container-low px-2 py-0.5 text-[10px] font-medium text-on-surface-variant"
                        >
                          {amenity}
                        </span>
                      ))}
                      {room.amenities.length > 3 && (
                        <span className="rounded-md border border-outline-variant/30 bg-surface-container-low px-1.5 py-0.5 text-[10px] font-medium text-on-surface-variant">
                          +{room.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Occupant Notice */}
                  {isOccupied && room.guestName && (
                    <div className="mt-3.5 rounded-xl border border-primary/20 bg-primary/5 p-2.5 text-body-xs text-primary">
                      <p className="font-bold">In-House Guest: {room.guestName}</p>
                      {room.departsAt && (
                        <p className="text-[11px] text-primary/80">Scheduled Checkout: {room.departsAt}</p>
                      )}
                    </div>
                  )}

                  {/* Reserved Notice */}
                  {room.status === 'RESERVED' && room.guestName && (
                    <div className="mt-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5 p-2.5 text-body-xs text-sky-800 dark:text-sky-300">
                      <p className="font-bold">Reserved Guest: {room.guestName}</p>
                      {room.departsAt && (
                        <p className="text-[11px] text-sky-700/80">{room.departsAt}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-5 flex items-center justify-between border-t border-outline-variant/30 pt-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingRoom(room)}
                      className="rounded-xl border border-outline-variant/50 bg-surface-container-low px-3 py-1.5 text-label-xs font-semibold text-on-surface hover:bg-surface-container transition cursor-pointer"
                    >
                      Edit Suite Details
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(room.id, room.number)}
                    className="rounded-lg p-1.5 text-rose-500/80 hover:bg-rose-500/10 hover:text-rose-600 transition cursor-pointer"
                    title="Decommission Suite"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table Mode */
        <div className="overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface-container-lowest shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant/40 bg-surface-container-low/50 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="py-3 px-4">Suite</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Configuration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Nightly Rate</th>
                  <th className="py-3 px-4">Occupant / Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredRooms.map((room) => {
                  const isAvail = room.status === 'AVAILABLE';
                  const isOccupied = room.status === 'OCCUPIED';

                  return (
                    <tr key={room.id} className="transition hover:bg-surface-container-low/40">
                      <td className="py-3.5 px-4 font-black text-on-surface text-base">
                        {room.number}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#0e2a4a]">
                        {room.category}
                      </td>
                      <td className="py-3.5 px-4 text-label-xs text-on-surface-variant">
                        Floor {room.floor} • {room.wing}
                      </td>
                      <td className="py-3.5 px-4 text-label-xs text-on-surface-variant">
                        {room.beds} (Max {room.maxGuests})
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase',
                            isAvail && 'bg-emerald-500/10 text-emerald-700',
                            isOccupied && 'bg-primary/10 text-primary',
                            room.status === 'RESERVED' && 'bg-sky-500/10 text-sky-700',
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              isAvail && 'bg-emerald-500',
                              isOccupied && 'bg-primary',
                              room.status === 'RESERVED' && 'bg-sky-500',
                            )}
                          />
                          {room.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-on-surface">
                        {room.pricePerNight.toLocaleString()} MMK
                      </td>
                      <td className="py-3.5 px-4 text-label-xs text-on-surface-variant">
                        {room.guestName ? (
                          <span className={cn('font-semibold', isOccupied ? 'text-primary' : 'text-sky-700')}>{room.guestName}</span>
                        ) : (
                          <span className="text-on-surface-variant/40">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingRoom(room)}
                            className="rounded-lg p-1.5 text-secondary hover:bg-secondary-container/40 transition cursor-pointer"
                            title="Edit Suite Rates & Amenities"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(room.id, room.number)}
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Delete Room"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {editingRoom && (
        <RoomEditModal
          room={editingRoom}
          open={!!editingRoom}
          onClose={() => setEditingRoom(null)}
          onSave={(id, updates) => {
            updateRoom(id, updates);
            setEditingRoom(null);
            toast.success(`Suite details updated.`);
          }}
        />
      )}

      {isAddOpen && (
        <AddRoomModal
          open={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onAdd={(newRoom) => {
            addRoom(newRoom);
            setIsAddOpen(false);
            toast.success(`Suite ${newRoom.number} added to active rack.`);
          }}
        />
      )}
    </div>
  );
}
