import { useState } from 'react';
import type { FormEvent } from 'react';
import { X, Plus } from 'lucide-react';
import type { Room } from '@/types';
import { useToast } from '@/components/toast';

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

    toast.success(`Room ${number} has been created and added to available inventory.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#0b1626]/50 backdrop-blur-xs" onClick={onClose} />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant/50 px-6 py-4">
          <div>
            <h3 className="text-title-lg font-semibold text-on-surface">Add New Room</h3>
            <p className="text-body-sm text-on-surface-variant">
              Register a new luxury suite into Grand Azure inventory
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-sm font-medium text-on-surface">
                Room Number
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 308"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-outline-variant/70 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-label-sm font-medium text-on-surface">Floor Level</label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={floor}
                onChange={(e) => setFloor(Number(e.target.value))}
                className="mt-1 h-10 w-full rounded-xl border border-outline-variant/70 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-label-sm font-medium text-on-surface">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-outline-variant/70 bg-surface-container-low px-3 text-body-sm text-on-surface outline-none focus:border-primary focus:bg-white cursor-pointer"
              >
                {ROOM_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-label-sm font-medium text-on-surface">
                Wing / Sector
              </label>
              <input
                type="text"
                required
                value={wing}
                onChange={(e) => setWing(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-outline-variant/70 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary focus:bg-white"
              />
            </div>
          </div>

          {/* Rate Setup */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <label className="block text-label-sm font-semibold text-primary">
              Base Price Per Night (MMK)
            </label>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-body-sm font-bold text-primary">
                MMK
              </span>
              <input
                type="number"
                step="5000"
                min="50000"
                required
                value={pricePerNight}
                onChange={(e) => setPricePerNight(Number(e.target.value))}
                className="h-10 w-full rounded-xl border border-outline-variant/80 bg-white pl-14 pr-4 text-headline-sm font-bold text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-label-xs font-medium text-on-surface">Beds</label>
              <input
                type="text"
                required
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                className="mt-1 h-9 w-full rounded-xl border border-outline-variant/70 bg-surface-container-low px-3 text-body-sm text-on-surface outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-label-xs font-medium text-on-surface">Max Guests</label>
              <input
                type="number"
                min="1"
                max="8"
                required
                value={maxGuests}
                onChange={(e) => setMaxGuests(Number(e.target.value))}
                className="mt-1 h-9 w-full rounded-xl border border-outline-variant/70 bg-surface-container-low px-3 text-body-sm text-on-surface outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-label-xs font-medium text-on-surface">Size (m²)</label>
              <input
                type="number"
                min="20"
                required
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="mt-1 h-9 w-full rounded-xl border border-outline-variant/70 bg-surface-container-low px-3 text-body-sm text-on-surface outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Amenities Multi-Select */}
          <div>
            <label className="block text-label-sm font-medium text-on-surface mb-2">
              Features & Amenities
            </label>
            <div className="flex flex-wrap gap-2">
              {STANDARD_AMENITIES.map((item) => {
                const active = amenities.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleAmenity(item)}
                    className={`rounded-full px-3 py-1 text-label-sm transition ${
                      active
                        ? 'bg-secondary-container text-on-secondary-container font-medium'
                        : 'border border-outline-variant/60 bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-outline-variant/50 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-label-md font-medium text-on-surface-variant hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-label-md font-medium text-white shadow-sm hover:brightness-110 active:scale-[0.99]"
            >
              <Plus className="h-4 w-4" />
              Create Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
