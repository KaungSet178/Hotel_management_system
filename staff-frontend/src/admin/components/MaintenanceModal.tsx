import { useState } from 'react';
import type { FormEvent } from 'react';
import { X, Wrench, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Room } from '@/types';
import { useToast } from '@/components/toast';

interface MaintenanceModalProps {
  room: Room | null;
  open: boolean;
  onClose: () => void;
  onToggle: (id: string, workOrder?: string) => void;
}

export function MaintenanceModal({
  room,
  open,
  onClose,
  onToggle,
}: MaintenanceModalProps) {
  const toast = useToast();
  if (!open || !room) return null;

  const isMaintenance = room.status === 'MAINTENANCE';
  const [workOrderReason, setWorkOrderReason] = useState(
    room.workOrder || 'Central Air Conditioning thermostat recalibration and filter replacement',
  );
  const [priority, setPriority] = useState<'URGENT' | 'ROUTINE'>('ROUTINE');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isMaintenance) {
      onToggle(room.id);
      toast.success(`Room ${room.number} maintenance cleared. Room is now AVAILABLE.`);
    } else {
      const order = `[${priority}] ${workOrderReason.trim()}`;
      onToggle(room.id, order);
      toast.warning(`Room ${room.number} locked out of inventory for maintenance.`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#0b1626]/50 backdrop-blur-xs" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-2xl">
        <div className="flex items-center justify-between border-b border-outline-variant/50 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                isMaintenance ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
              }`}
            >
              {isMaintenance ? <CheckCircle2 className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
            </span>
            <div>
              <h3 className="text-title-lg font-semibold text-on-surface">
                {isMaintenance ? 'Restore Room to Service' : 'Maintenance Lockout'}
              </h3>
              <p className="text-body-sm text-on-surface-variant">
                Room {room.number} • {room.category}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isMaintenance ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-label-md font-semibold text-amber-900 dark:text-amber-200">
                    Active Maintenance Lockout
                  </p>
                  <p className="mt-1 text-body-sm text-amber-800 dark:text-amber-300">
                    Current Work Order: <strong>{room.workOrder || 'General Repair'}</strong>
                  </p>
                  <p className="mt-2 text-label-xs text-amber-700/80">
                    Restoring this room will make it immediately bookable online and at the front desk.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-outline-variant/60 bg-surface-container-low p-4">
                <p className="text-label-sm font-semibold text-on-surface">
                  Maintenance Impact Notice
                </p>
                <p className="mt-1 text-body-xs text-on-surface-variant">
                  Locking this room removes it from available inventory. Guests cannot book this room online and desk clerks will see it disabled in the room matrix.
                </p>
              </div>

              <div>
                <label className="block text-label-sm font-medium text-on-surface mb-1.5">
                  Priority Level
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      checked={priority === 'ROUTINE'}
                      onChange={() => setPriority('ROUTINE')}
                    />
                    <span className="text-label-sm text-on-surface">Routine Service</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="priority"
                      checked={priority === 'URGENT'}
                      onChange={() => setPriority('URGENT')}
                    />
                    <span className="text-label-sm text-rose-600 font-medium">Urgent Work Order</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-label-sm font-medium text-on-surface mb-1.5">
                  Work Order Description / Defect Details
                </label>
                <textarea
                  required
                  rows={3}
                  value={workOrderReason}
                  onChange={(e) => setWorkOrderReason(e.target.value)}
                  placeholder="e.g. AC compressor repair, plumbing leak, painting..."
                  className="w-full rounded-xl border border-outline-variant/70 bg-surface-container-low p-3 text-body-sm text-on-surface outline-none focus:border-primary focus:bg-white"
                />
              </div>
            </>
          )}

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
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-label-md font-medium text-white shadow-sm transition active:scale-[0.99] ${
                isMaintenance
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isMaintenance ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Restore to Available
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4" />
                  Lock for Maintenance
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
