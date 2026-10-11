import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { bookings } from '@/services';
import { hasAccess } from '@/lib/access';
import { matchesProfile } from '@/lib/auth';

export type FolioAccessState = 'loading' | 'granted' | 'denied';

/**
 * Decides whether a folio can be opened without the PIN:
 *
 *  - it is already unlocked in this browser (reference + PIN stored), or
 *  - the reservation is **checked in** — a live guest ticket is open by design,
 *    no PIN is asked for an in-stay stay, or
 *  - the signed-in profile belongs to the reservation's guest, so an account is
 *    enough to open an upcoming/past folio (a "forgot the PIN" recovery path).
 *
 * Anything else is `denied` and the caller shows {@link FolioGate}.
 *
 * Note: this is for **viewing** a folio (pass / services). Pages with destructive
 * actions — like the reservation detail page — skip this hook entirely and always
 * show the PIN gate on entry.
 */
export function useFolioAccess(reference: string): FolioAccessState {
  const { user } = useAuth();
  const [checked, setChecked] = useState<'granted' | 'denied' | null>(null);

  useEffect(() => {
    let active = true;
    bookings
      .getBooking(reference)
      .then(({ data }) => {
        if (!active) return;
        if (data.status === 'checked_in' || (user != null && matchesProfile(data.guest, user))) {
          setChecked('granted');
        } else {
          setChecked('denied');
        }
      })
      .catch(() => {
        if (active) setChecked('denied');
      });
    return () => {
      active = false;
    };
  }, [reference, user]);

  // Fast path: this browser already holds the PIN for the folio. Read fresh on
  // every render so a change of reference is respected immediately.
  if (checked === 'granted' || hasAccess(reference)) return 'granted';
  if (checked === 'denied') return 'denied';
  return 'loading';
}