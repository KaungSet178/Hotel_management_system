import {
  BadgeCheck,
  CalendarDays,
  Clock3,
  KeyRound,
  LogOut,
  MapPin,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { LOCALE } from '@/data/seed';
import { mmk } from '@/lib/format';
import { useAppStore } from '@/store';
import { useToast } from '@/components/toast';
import { Avatar, Button, Modal } from '@/components/ui';

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { bookings, requests, folio } = useAppStore();
  const toast = useToast();

  const inHouse = bookings.filter((b) => b.status === 'CHECKED_IN').length;
  const arrivals = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'CHECKED_IN').length;
  const pendingProofs = requests.filter(
    (r) => r.state === 'PROOF_UPLOADED' || r.state === 'ROOM_CONFLICT',
  ).length;
  const total = folio.roomCharges + folio.incidentals + folio.taxes;

  const handleLogOut = (): void => {
    toast.info('Signed out · see you next shift, Daw Nu Nu');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Staff Profile">
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-surface-container-low p-4">
          <Avatar name={LOCALE.staffName} className="h-12 w-12 text-title-sm" />
          <div className="min-w-0">
            <p className="text-body-md font-semibold text-on-surface">{LOCALE.staffName}</p>
            <p className="text-label-sm text-on-surface-variant">
              {LOCALE.staffRole} · {LOCALE.property}
            </p>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-secondary-container px-2 py-0.5 text-label-sm font-medium text-on-secondary-container">
              <BadgeCheck className="h-3 w-3" />
              Verified staff
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 text-body-sm sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-lg border border-outline-variant/50 px-3 py-2">
            <MapPin className="h-4 w-4 shrink-0 text-secondary" />
            <div>
              <p className="text-label-sm text-on-surface-variant">Desk</p>
              <p className="font-medium text-on-surface">{LOCALE.desk}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-outline-variant/50 px-3 py-2">
            <Clock3 className="h-4 w-4 shrink-0 text-secondary" />
            <div>
              <p className="text-label-sm text-on-surface-variant">Shift</p>
              <p className="font-medium text-on-surface">{LOCALE.shift}</p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-outline-variant/40 rounded-xl border border-outline-variant/50">
          {[
            { Icon: CalendarDays, label: 'Reservations active', value: String(arrivals) },
            { Icon: UserCheck, label: 'Guests in-house', value: String(inHouse) },
            { Icon: ShieldCheck, label: 'Deposit proofs pending', value: String(pendingProofs) },
            { Icon: KeyRound, label: 'Open folio balance', value: mmk(total) },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3 px-3.5 py-2.5">
              <row.Icon className="h-4 w-4 shrink-0 text-on-surface-variant" />
              <span className="flex-1 text-body-sm text-on-surface-variant">{row.label}</span>
              <span className="text-label-md font-semibold text-on-surface">{row.value}</span>
            </div>
          ))}
        </div>

        <Button variant="danger" size="lg" className="w-full" onClick={handleLogOut}>
          <LogOut className="h-4 w-4" />
          Log Out
        </Button>
      </div>
    </Modal>
  );
}