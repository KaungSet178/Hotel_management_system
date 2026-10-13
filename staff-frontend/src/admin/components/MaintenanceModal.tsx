import { useState } from 'react';
import type { FormEvent } from 'react';
import { X, Wrench, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import type { Room } from '@/types';
import { useToast } from '@/components/toast';
import { cn } from '@/lib/cn';

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

  const [workOrderReason, setWorkOrderReason] = useState(
    room?.workOrder || 'Central Air Conditioning thermostat recalibration and filter replacement',
  );
  const [priority, setPriority] = useState<'URGENT' | 'ROUTINE'>('ROUTINE');

  if (!open || !room) return null;

  const isMaintenance = room.status === 'MAINTENANCE';

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isMaintenance) {
      onToggle(room.id);
      toast.success(`Suite ${room.number} lock released. Room is now AVAILABLE for sale.`);
    } else {
      const order = `[${priority}] ${workOrderReason.trim()}`;
      onToggle(room.id, order);
      toast.warning(`Suite ${room.number} locked out of inventory for maintenance.`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#071322]/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-2xl animate-[drawer-in_0.15s_ease-out]">
        <div className="flex items-center justify-between border-b border-outline-variant/40 bg-surface-container-low/40 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl shadow-xs',
                isMaintenance ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700',
              )}
            >
              {isMaintenance ? <CheckCircle2 className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
            </span>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-on-surface">
                {isMaintenance ? 'Restore Suite to Active Service' : 'Maintenance Lockout Order'}
              </h3>
              <p className="text-body-xs text-on-surface-variant">
                Suite {room.number} • Floor {room.floor} ({room.category})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-on-surface-variant hover:bg-surface-container hover:text-on-surface cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isMaintenance ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-label-sm font-bold text-amber-950 dark:text-amber-200">
                    Active Maintenance Lockout
                  </p>
                  <p className="mt-1 text-body-sm text-amber-900 dark:text-amber-300">
                    Logged Work Order: <strong>{room.workOrder || 'General Repair'}</strong>
                  </p>
                  <p className="mt-2 text-label-xs text-amber-800/80">
                    Releasing this lockout immediately returns Suite {room.number} to the live rack for online and front desk counter reservations.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low/60 p-3.5">
                <p className="text-label-sm font-bold text-on-surface flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  Inventory Protection Notice
                </p>
                <p className="mt-1 text-body-xs text-on-surface-variant leading-relaxed">
                  Locking this suite immediately prevents guest reservations across all direct web and walk-in counter channels until released by management.
                </p>
              </div>

              <div>
                <label className="block text-label-xs font-bold text-on-surface-variant uppercase mb-1.5">
                  Priority Classification
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority('ROUTINE')}
                    className={cn(
                      'rounded-xl border p-2.5 text-center text-label-sm font-bold transition cursor-pointer',
                      priority === 'ROUTINE'
                        ? 'border-[#0e2a4a] bg-[#0e2a4a] text-white shadow-xs'
                        : 'border-outline-variant/60 bg-surface-container-low text-on-surface hover:bg-surface-container',
                    )}
                  >
                    Routine Inspection
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('URGENT')}
                    className={cn(
                      'rounded-xl border p-2.5 text-center text-label-sm font-bold transition cursor-pointer',
                      priority === 'URGENT'
                        ? 'border-rose-600 bg-rose-600 text-white shadow-xs'
                        : 'border-outline-variant/60 bg-surface-container-low text-rose-700 hover:bg-surface-container',
                    )}
                  >
                    Urgent Work Order
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-label-xs font-bold text-on-surface-variant uppercase mb-1.5">
                  Work Order Description / Engineering Notes
                </label>
                <textarea
                  required
                  rows={3}
                  value={workOrderReason}
                  onChange={(e) => setWorkOrderReason(e.target.value)}
                  placeholder="e.g. AC compressor recalibration, plumbing fixture replacement..."
                  className="w-full rounded-xl border border-outline-variant/60 bg-surface-container-low p-3 text-body-sm text-on-surface outline-none focus:border-[#0e2a4a] focus:bg-white"
                />
              </div>
            </>
          )}

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
              className={cn(
                'flex items-center gap-2 rounded-xl px-5 py-2.5 text-label-sm font-bold text-white shadow-xs transition active:scale-[0.99] cursor-pointer',
                isMaintenance
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700',
              )}
            >
              {isMaintenance ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Restore to Available Rack
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4" />
                  Lock Suite from Inventory
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
