import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone } from 'lucide-react';

export function SupportDialog({
  open,
  onClose,
  context,
}: {
  open: boolean;
  onClose: () => void;
  context?: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Help & Concierge"
      description="Our guest relations team is available 24/7."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <a href="tel:+9512304567" className="inline-flex">
            <Button leadingIcon={<Phone className="h-4 w-4" />}>Call front desk</Button>
          </a>
        </>
      }
    >
      <div className="space-y-4 text-sm text-ink-soft">
        <div className="rounded-2xl bg-lavender-100 p-4">
          <p className="font-semibold text-ink">Front desk hotline (24/7)</p>
          <p className="mt-1">+95 1 230 4567 / Ext. 0</p>
        </div>
        <ul className="space-y-3">
          <li>
            <p className="font-medium text-ink">Smart QR Express Check-in</p>
            <p>
              Your digital QR pass is issued the moment your reservation is confirmed. Present it at
              reception for keyless entry.
            </p>
          </li>
          <li>
            <p className="font-medium text-ink">In-stay service requests</p>
            <p>
              Open <span className="font-medium">Guest Services</span> from any checked-in reservation to
              order housekeeping, amenities or maintenance in one tap.
            </p>
          </li>
          <li>
            <p className="font-medium text-ink">Cancellation &amp; refunds</p>
            <p>
              Flexible rates are 100% refundable up to 48 hours before check-in. Manage this from{' '}
              <span className="font-medium">My Bookings</span>.
            </p>
          </li>
        </ul>
        {context ? <p className="text-xs text-ink-mute">Current page: {context}</p> : null}
        <p className="flex items-center gap-2 text-xs text-ink-mute">
          <MessageSquare className="h-4 w-4" aria-hidden="true" /> This is a frontend demo. Chat is
          simulated; a backend integration point is documented in API_CONTRACTS.md.
        </p>
      </div>
    </Modal>
  );
}