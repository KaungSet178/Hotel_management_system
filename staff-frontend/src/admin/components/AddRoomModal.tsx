import { useState } from 'react';
import type { FormEvent } from 'react';
import { X, Plus, Check } from 'lucide-react';
import type { Room } from '@/types';
import { useToast } from '@/components/toast';
import { cn } from '@/lib/cn';

interface AddRoomModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (room: Omit<Room, 'id'>) => void;
}

const ROOM_CATEGORIES = [
  'Deluxe Azure Suite',
  'Heritage Junior Suite',
  'Skyline Grand King',
  'Executive Ocean Panorama',
  'Deluxe Courtyard',
  'Azure Sunset Villa',
  'Governor Suite',
  'Presidential Horizon Villa',
];

const STANDARD_AMENITIES = [
  'Ocean View',
  'Private Balcony',
  'King Bed',
  'Jacuzzi Tub',
  'High-speed WiFi',
  'Espresso Bar',
  'Marble Bath',
  'Work Desk',
  'Strand Club Access',
  'Breakfast Inc.',
];

export function AddRoomModal({ open, onClose, onAdd }: AddRoomModalProps) {
  const toast = useToast();
  if (!open) return null;

  const [number, setNumber] = useState('');
  const [floor, setFloor] = useState(3);
  const [category, setCategory] = useState(ROOM_CATEGORIES[0]);
  const [beds, setBeds] = useState('1 King Bed');
  const [maxGuests, setMaxGuests] = useState(2);
  const [size, setSize] = useState(55);
  const [wing, setWing] = useState('Oceanfront Wing');
  const [pricePerNight, setPricePerNight] = useState(220000);
  const [amenities, setAmenities] = useState<string[]>([
    'Ocean View',
    'King Bed',
    'High-speed WiFi',
    'Espresso Bar',
  ]);

  const toggleAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item],
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!number.trim()) {
      toast.warning('Please specify a room number.');
      return;
    }

    onAdd({
      number: number.trim(),
      floor: Number(floor),
      category,
      beds,
      maxGuests: Number(maxGuests),
      size: Number(size),
      wing,
      pricePerNight: Number(pricePerNight),
      amenities,
      status: 'AVAILABLE',
    });

    toast.success(`Suite ${number} added to active rack matrix.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#071322]/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-2xl animate-[drawer-in_0.15s_ease-out]">
        <div className="flex items-center justify-between border-b border-outline-variant/40 bg-surface-container-low/40 px-6 py-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-on-surface">Add New Luxury Suite</h3>
            <p className="mt-0.5 text-body-xs text-on-surface-variant">
              Register a new room number into Grand Azure's active rack matrix
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-xs font-bold text-on-surface-variant uppercase">
                Suite Number *
              </label>
              <input
                type="text"
                placeholder="e.g. 504"
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="mt-1 h-11 w-full rounded-xl border border-outline-variant/60 bg-surface-container-low px-3.5 text-lg font-black text-on-surface outline-none focus:border-[#0e2a4a] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-label-xs font-bold text-on-surface-variant uppercase">
                Floor Level
              </label>
              <select
                value={floor}
                onChange={(e) => setFloor(Number(e.target.value))}
                className="mt-1 h-11 w-full rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 text-body-sm font-bold text-on-surface outline-none cursor-pointer"
              >
                {[1, 2, 3, 4, 5].map((fl) => (
                  <option key={fl} value={fl}>
                    Floor {fl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-label-xs font-bold text-on-surface-variant uppercase">
              Suite Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 text-body-sm font-bold text-on-surface outline-none cursor-pointer"
            >
              {ROOM_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-label-xs font-bold text-on-surface-variant uppercase">
                Bed Config
              </label>
              <input
                type="text"
                required
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 text-body-sm font-semibold text-on-surface outline-none focus:border-[#0e2a4a] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-label-xs font-bold text-on-surface-variant uppercase">
                Max Guests
              </label>
              <input
                type="number"
                min="1"
                max="8"
                required
                value={maxGuests}
                onChange={(e) => setMaxGuests(Number(e.target.value))}
                className="mt-1 h-10 w-full rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 text-body-sm font-semibold text-on-surface outline-none focus:border-[#0e2a4a] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-label-xs font-bold text-on-surface-variant uppercase">
                Size (m²)
              </label>
              <input
                type="number"
                min="15"
                required
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="mt-1 h-10 w-full rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 text-body-sm font-semibold text-on-surface outline-none focus:border-[#0e2a4a] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-label-xs font-bold text-on-surface-variant uppercase">
              Resort Wing / Building Location
            </label>
            <input
              type="text"
              required
              value={wing}
              onChange={(e) => setWing(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 text-body-sm font-semibold text-on-surface outline-none focus:border-[#0e2a4a] focus:bg-white"
            />
          </div>

          {/* Rate Input */}
          <div className="rounded-xl border border-[#0e2a4a]/20 bg-[#0e2a4a]/5 p-4">
            <label className="block text-label-xs font-bold text-[#0e2a4a] uppercase">
              Base Nightly Price (MMK)
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-body-sm font-extrabold text-[#0e2a4a]">
                MMK
              </span>
              <input
                type="number"
                step="5000"
                min="50000"
                required
                value={pricePerNight}
                onChange={(e) => setPricePerNight(Number(e.target.value))}
                className="h-11 w-full rounded-xl border border-outline-variant/80 bg-white pl-16 pr-4 text-xl font-black text-on-surface outline-none focus:border-[#0e2a4a]"
              />
            </div>
          </div>

          {/* Amenities */}
          <div>
            <label className="block text-label-xs font-bold text-on-surface-variant uppercase mb-2">
              Amenities & Inclusions
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STANDARD_AMENITIES.map((item) => {
                const active = amenities.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleAmenity(item)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full px-3 py-1 text-label-xs font-semibold transition cursor-pointer',
                      active
                        ? 'bg-[#0e2a4a] text-white shadow-xs'
                        : 'border border-outline-variant/60 bg-surface-container-low text-on-surface-variant hover:bg-surface-container',
                    )}
                  >
                    {active && <Check className="h-3 w-3 text-[#89f5e7]" />}
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-outline-variant/40 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-label-sm font-semibold text-on-surface-variant hover:bg-surface-container transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-[#0e2a4a] px-5 py-2.5 text-label-sm font-semibold text-white shadow-xs hover:bg-[#18395f] active:scale-[0.99] transition cursor-pointer"
            >
              <Plus className="h-4 w-4 text-[#89f5e7]" />
              Add Suite to Rack
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
