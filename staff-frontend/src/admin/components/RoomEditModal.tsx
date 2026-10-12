import { useState } from 'react';
import type { FormEvent } from 'react';
import { X, Save } from 'lucide-react';
import type { Room } from '@/types';
import { useToast } from '@/components/toast';

interface RoomEditModalProps {
  room: Room | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Room>) => void;
}

const ALL_AMENITIES = [
  'Ocean View',
  'Private Balcony',
  'King Bed',
  'Twin Beds',
  'Jacuzzi Tub',
  'Strand Club Access',
  'Espresso Bar',
  'High-speed WiFi',
  'Marble Bath',
  'Work Desk',
  'Butler Service',
];

export function RoomEditModal({ room, open, onClose, onSave }: RoomEditModalProps) {
  const toast = useToast();
  if (!open || !room) return null;

  const [pricePerNight, setPricePerNight] = useState(room.pricePerNight);
  const [category, setCategory] = useState(room.category);
  const [beds, setBeds] = useState(room.beds);
  const [maxGuests, setMaxGuests] = useState(room.maxGuests);
  const [size, setSize] = useState(room.size);
  const [wing, setWing] = useState(room.wing);
  const [amenities, setAmenities] = useState<string[]>(room.amenities || []);

  const toggleAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item],
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave(room.id, {
      pricePerNight: Number(pricePerNight),
      category,
      beds,
      maxGuests: Number(maxGuests),
      size: Number(size),
      wing,
      amenities,
    });
    toast.success(`Room ${room.number} details updated successfully.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#0b1626]/50 backdrop-blur-xs" onClick={onClose} />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/50 px-6 py-4">
          <div>
            <h3 className="text-title-lg font-semibold text-on-surface">
              Edit Room {room.number}
            </h3>
            <p className="text-body-sm text-on-surface-variant">
              Floor {room.floor} • Current status: <strong>{room.status}</strong>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-4">
          {/* Rate Adjustment Card */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <label className="block text-label-md font-semibold text-primary">
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
                className="h-11 w-full rounded-xl border border-outline-variant/80 bg-white pl-14 pr-4 text-headline-sm font-bold text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <p className="mt-1 text-label-xs text-on-surface-variant">
              Applies to all upcoming walk-in direct desk inquiries and standard web bookings.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-label-sm font-medium text-on-surface">
                Room Category
              </label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-outline-variant/70 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-label-sm font-medium text-on-surface">
                Bed Configuration
              </label>
              <input
                type="text"
                required
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-outline-variant/70 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-label-sm font-medium text-on-surface">
                Max Guest Capacity
              </label>
              <input
                type="number"
                min="1"
                max="8"
                required
                value={maxGuests}
                onChange={(e) => setMaxGuests(Number(e.target.value))}
                className="mt-1 h-10 w-full rounded-xl border border-outline-variant/70 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-label-sm font-medium text-on-surface">
                Floor Space (m²)
              </label>
              <input
                type="number"
                min="15"
                required
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="mt-1 h-10 w-full rounded-xl border border-outline-variant/70 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-label-sm font-medium text-on-surface">
              Wing / Building Location
            </label>
            <input
              type="text"
              required
              value={wing}
              onChange={(e) => setWing(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-outline-variant/70 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary focus:bg-white"
            />
          </div>

          {/* Amenities Multi-Select */}
          <div>
            <label className="block text-label-sm font-medium text-on-surface mb-2">
              Features & Amenities
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_AMENITIES.map((item) => {
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

          {/* Footer Actions */}
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
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
