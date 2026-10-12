import { useState } from 'react';
import type { FormEvent } from 'react';
import { X, Save, Check } from 'lucide-react';
import type { Room } from '@/types';
import { useToast } from '@/components/toast';
import { cn } from '@/lib/cn';

interface RoomEditModalProps {
  room: Room | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Room>) => void;
}

const ALL_AMENITIES = [
  'Harbor View',
  'Ocean View',
  'Garden Terrace',
  'Private Balcony',
  'King Bed',
  'Twin Beds',
  'Jacuzzi Tub',
  'Strand Club Access',
  'Espresso Machine',
  'Free High-Speed Wi-Fi',
  'Marble Bath',
  'Executive Work Desk',
  'Butler Service',
  'Breakfast Inc.',
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

  const adjustPrice = (delta: number) => {
    setPricePerNight((prev) => Math.max(50000, prev + delta));
  };

  // Instant Tax & Gross Calculation Preview
  const serviceCharge = Math.round(pricePerNight * 0.1);
  const commercialTax = Math.round(pricePerNight * 0.05);
  const totalGuestRate = pricePerNight + serviceCharge + commercialTax;

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
    toast.success(`Suite ${room.number} rate and inventory details updated.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#071322]/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-2xl animate-[drawer-in_0.15s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/40 bg-surface-container-low/40 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold tracking-tight text-on-surface">
                Configure Suite {room.number}
              </h3>
              <span className="rounded-full bg-[#0e2a4a]/10 px-2.5 py-0.5 text-label-xs font-bold text-[#0e2a4a]">
                Floor {room.floor}
              </span>
            </div>
            <p className="mt-0.5 text-body-xs text-on-surface-variant">
              Dynamic pricing yield configuration & room rack specifications
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {/* Rate Adjustment Card */}
          <div className="rounded-2xl border border-[#0e2a4a]/20 bg-gradient-to-br from-[#0e2a4a]/5 via-surface-container-low to-surface-container-lowest p-4">
            <div className="flex items-center justify-between">
              <label className="text-label-sm font-bold text-[#0e2a4a] uppercase tracking-wide">
                Base Nightly Room Rate
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => adjustPrice(-10000)}
                  className="rounded-lg border border-outline-variant/60 bg-white px-2 py-0.5 text-[11px] font-bold text-on-surface hover:bg-surface-container transition cursor-pointer"
                >
                  -10k
                </button>
                <button
                  type="button"
                  onClick={() => adjustPrice(10000)}
                  className="rounded-lg border border-outline-variant/60 bg-white px-2 py-0.5 text-[11px] font-bold text-on-surface hover:bg-surface-container transition cursor-pointer"
                >
                  +10k
                </button>
                <button
                  type="button"
                  onClick={() => adjustPrice(25000)}
                  className="rounded-lg border border-outline-variant/60 bg-white px-2 py-0.5 text-[11px] font-bold text-on-surface hover:bg-surface-container transition cursor-pointer"
                >
                  +25k
                </button>
              </div>
            </div>

            <div className="relative mt-2.5">
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
                className="h-12 w-full rounded-xl border border-outline-variant/80 bg-white pl-16 pr-4 text-2xl font-black text-on-surface outline-none focus:border-[#0e2a4a] focus:ring-2 focus:ring-[#0e2a4a]/10"
              />
            </div>

            {/* Live Pricing Breakdown Preview */}
            <div className="mt-3.5 rounded-xl border border-outline-variant/30 bg-surface-container-low/70 p-3 text-body-xs">
              <div className="flex items-center justify-between font-medium text-on-surface-variant">
                <span>10% Service Charge:</span>
                <span className="font-semibold text-on-surface">{serviceCharge.toLocaleString()} MMK</span>
              </div>
              <div className="flex items-center justify-between font-medium text-on-surface-variant mt-1">
                <span>5% Commercial Tax (IRD):</span>
                <span className="font-semibold text-on-surface">{commercialTax.toLocaleString()} MMK</span>
              </div>
              <div className="flex items-center justify-between font-bold text-on-surface border-t border-outline-variant/30 pt-1.5 mt-1.5">
                <span>Estimated Guest Folio Gross:</span>
                <span className="text-label-md font-black text-[#0e2a4a]">{totalGuestRate.toLocaleString()} MMK / night</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-label-xs font-bold text-on-surface-variant uppercase">
                Suite Category
              </label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 text-body-sm font-semibold text-on-surface outline-none focus:border-[#0e2a4a] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-label-xs font-bold text-on-surface-variant uppercase">
                Bed Configuration
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
                Max Capacity
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
                Floor Space (m²)
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

          {/* Amenities Multi-Select */}
          <div>
            <label className="block text-label-xs font-bold text-on-surface-variant uppercase mb-2">
              Signature Amenities & Features
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_AMENITIES.map((item) => {
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
                        : 'border border-outline-variant/60 bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
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
              <Save className="h-4 w-4 text-[#89f5e7]" />
              Save Rate & Specs
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
