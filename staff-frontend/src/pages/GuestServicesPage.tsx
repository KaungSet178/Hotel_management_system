import { useMemo, useState } from 'react';
import { CheckCheck, Plus, Wrench } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/store';
import { useToast } from '@/components/toast';
import {
  Button,
  Field,
  Modal,
  SectionTitle,
  SelectInput,
  TextArea,
  TextInput,
  Toggle,
} from '@/components/ui';
import type { ServiceRequest, ServiceState } from '@/types';

const CATEGORIES = [
  'Housekeeping',
  'Concierge',
  'Maintenance',
  'In-Room Pantry',
  'Bell Captain',
];

const CATEGORY_STYLES: Record<string, string> = {
  Housekeeping: 'bg-secondary-container text-on-secondary-container',
  Concierge: 'bg-[#d6e3ff] text-[#0e1c32]',
  Maintenance: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
  'In-Room Pantry': 'bg-secondary-container text-on-secondary-container',
  'Bell Captain': 'bg-[#e7eeff] text-[#3a475f]',
};

const COLUMNS: Array<{ state: ServiceState; countKey: string; accent: string }> = [
  { state: 'PENDING', countKey: 'Pending', accent: 'bg-[#e7eeff] text-[#3a475f]' },
  { state: 'IN_PROGRESS', countKey: 'In Progress', accent: 'bg-tertiary-fixed text-on-tertiary-fixed-variant' },
  { state: 'COMPLETED', countKey: 'Completed', accent: 'bg-secondary-container text-on-secondary-container' },
];

function ServiceCard({
  request,
  onMoveNext,
}: {
  request: ServiceRequest;
  onMoveNext: () => void;
}) {
  const actionLabel =
    request.state === 'PENDING' ? 'Assign & Move' : request.state === 'IN_PROGRESS' ? 'Mark Complete' : 'Done';
  return (
    <article className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-4 shadow-[0_1px_2px_rgba(17,28,45,0.05)]">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-label-sm font-medium',
            CATEGORY_STYLES[request.category] ?? 'bg-[#e7eeff] text-[#3a475f]',
          )}
        >
          {request.category}
        </span>
        {request.urgency === 'URGENT' && (
          <span className="rounded-full bg-error-container px-2 py-0.5 text-label-sm font-semibold text-on-error-container">
            Urgent
          </span>
        )}
      </div>

      <div className="mt-2 flex items-start gap-2">
        {request.category === 'Maintenance' ? (
          <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant" />
        ) : (
          <span className="mt-1.5 flex h-2 w-2 shrink-0 rounded-full bg-secondary" />
        )}
        <div>
          <h3 className="text-label-md font-semibold text-on-surface">{request.title}</h3>
          <p className="mt-0.5 text-label-sm text-on-surface-variant">
            {request.guest} · Room {request.room} · {request.ago}
          </p>
        </div>
      </div>

      <p className="mt-2.5 text-body-sm text-on-surface-variant">{request.quote}</p>

      {request.assignee && (
        <p className="mt-1.5 text-label-sm text-on-surface-variant">{request.assignee}</p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-outline-variant/40 pt-2.5">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-label-sm font-semibold',
              request.charge > 0
                ? 'bg-tertiary-fixed text-on-tertiary-fixed-variant'
                : 'bg-surface-container text-on-surface-variant',
            )}
          >
            {request.charge > 0 ? `${request.charge.toLocaleString('en-US')} MMK` : 'Complimentary'}
          </span>
          {request.state !== 'COMPLETED' ? (
            <Button variant="ghost" size="sm" onClick={onMoveNext}>
              {actionLabel}
            </Button>
          ) : (
            <span className="flex items-center gap-1 text-label-sm font-medium text-secondary">
              <CheckCheck className="h-3.5 w-3.5" />
              Guest signed
            </span>
          )}
        </div>
      </article>
    );
  }

function NewServiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { rooms, addServiceRequest } = useAppStore();
  const toast = useToast();
  const occupied = rooms.filter((r) => r.status === 'OCCUPIED');

  const [category, setCategory] = useState('Housekeeping');
  const [room, setRoom] = useState('');
  const [guest, setGuest] = useState('');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [charge, setCharge] = useState('0');
  const [urgent, setUrgent] = useState(false);

  const submit = (): void => {
    if (!title.trim() || !guest.trim()) {
      toast.warning('Add a guest name and a short request title.');
      return;
    }
    const targetRoom = room || occupied[0]?.number || '—';
    const chargeValue = Math.max(0, Math.round(Number(charge.replace(/[^0-9.]/g, '')) || 0));
    addServiceRequest({
      category,
      room: targetRoom,
      title: title.trim(),
      guest: guest.trim(),
      quote: details.trim() || 'No additional details provided.',
      charge: chargeValue,
      urgency: urgent ? 'URGENT' : undefined,
    });
    toast.success(
      chargeValue > 0
        ? `Raised · ${title.trim()} · Room ${targetRoom} · ${chargeValue.toLocaleString('en-US')} MMK`
        : `Raised · ${title.trim()} · Room ${targetRoom}`,
    );
    setCategory('Housekeeping');
    setRoom('');
    setGuest('');
    setTitle('');
    setDetails('');
    setCharge('0');
    setUrgent(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New Service Request">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Category">
            <SelectInput value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Room">
            <SelectInput value={room} onChange={(e) => setRoom(e.target.value)}>
              <option value="">Auto · first occupied</option>
              {occupied.map((r) => (
                <option key={r.id} value={r.number}>
                  Room {r.number} · {r.guestName ?? 'Guest'}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>

        <Field label="Guest name">
          <TextInput
            placeholder="e.g. Thant Zin Oo"
            value={guest}
            onChange={(e) => setGuest(e.target.value)}
          />
        </Field>

        <Field label="Request title">
          <TextInput
            placeholder="e.g. Extra towels & linens"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <Field label="Details (optional)">
          <TextArea
            rows={3}
            placeholder="Quantities, timing, special instructions…"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </Field>

        <Field label="Charge to folio (MMK)" hint="0 for complimentary services. Added to the guest's check-out incidentals.">
          <TextInput
            inputMode="numeric"
            placeholder="e.g. 25000"
            value={charge}
            onChange={(e) => setCharge(e.target.value)}
          />
        </Field>

        <div className="rounded-lg border border-outline-variant/60 px-3 py-2.5">
          <Toggle checked={urgent} onChange={setUrgent} label="Flag as urgent" />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit}>
            <Plus className="h-4 w-4" />
            Raise Request
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function GuestServicesPage() {
  const { serviceRequests, updateServiceState } = useAppStore();
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  const counts = useMemo(
    () => ({
      PENDING: serviceRequests.filter((s) => s.state === 'PENDING').length,
      IN_PROGRESS: serviceRequests.filter((s) => s.state === 'IN_PROGRESS').length,
      COMPLETED: serviceRequests.filter((s) => s.state === 'COMPLETED').length,
    }),
    [serviceRequests],
  );

  const moveNext = (request: ServiceRequest): void => {
    if (request.state === 'PENDING') {
      updateServiceState(request.id, 'IN_PROGRESS');
      toast.success(`Assigned ${request.id} · ${request.title}`);
    } else if (request.state === 'IN_PROGRESS') {
      updateServiceState(request.id, 'COMPLETED');
      toast.success(`${request.id} completed · ${request.guest} signed`);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="StayFlow · Front Desk"
        title="Guest Services"
        description="Housekeeping, concierge, maintenance and bell-captain requests flowing across the team."
        action={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            New Service Request
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {COLUMNS.map((col) => (
          <span
            key={col.countKey}
            className={cn('rounded-full px-3 py-1 text-label-sm font-medium', col.accent)}
          >
            {col.countKey} ({counts[col.state]})
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <section
            key={col.state}
            className="flex flex-col rounded-xl border border-outline-variant/50 bg-surface-container-low/60 p-3"
          >
            <header className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-headline-md font-semibold tracking-tight text-on-surface">
                {col.countKey}
              </h2>
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-surface-container px-2 text-label-sm font-bold text-on-surface-variant">
                {counts[col.state]}
              </span>
            </header>
            <div className="flex-1 space-y-3">
              {serviceRequests
                .filter((s) => s.state === col.state)
                .map((request) => (
                  <ServiceCard key={request.id} request={request} onMoveNext={() => moveNext(request)} />
                ))}
              {counts[col.state] === 0 && (
                <p className="rounded-xl border border-dashed border-outline-variant/70 px-4 py-8 text-center text-body-sm text-on-surface-variant">
                  Nothing here.
                </p>
              )}
            </div>
          </section>
        ))}
      </div>

      <NewServiceModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}