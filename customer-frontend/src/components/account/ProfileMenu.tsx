import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ConciergeBell, LogOut, Ticket, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InitialsAvatar } from './InitialsAvatar';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/cn';

export function ProfileMenu() {
  const { user, openSignIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={openSignIn} leadingIcon={<UserRound className="h-4 w-4" aria-hidden="true" />}>
        Sign in
      </Button>
    );
  }

  const firstName = user.fullName.split(' ')[0];
  const items = [
    { to: '/account', label: 'My profile', icon: UserRound },
    { to: '/bookings', label: 'My bookings', icon: Ticket },
    { to: '/guest-services', label: 'Guest services', icon: ConciergeBell },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-brand-900/12 bg-white py-1 pl-1 pr-2.5 transition-colors hover:bg-lavender-100"
      >
        <InitialsAvatar name={user.fullName} />
        <span className="hidden text-sm font-medium text-ink sm:inline">{firstName}</span>
        <ChevronDown className={cn('h-4 w-4 text-ink-mute transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-brand-900/10 bg-white shadow-pop"
        >
          <div className="border-b border-brand-900/8 px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{user.fullName}</p>
            <p className="truncate text-xs text-ink-mute">{user.email}</p>
          </div>
          <div className="p-1.5">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-ink-soft transition-colors hover:bg-lavender-100 hover:text-ink"
              >
                <item.icon className="h-4 w-4 text-brand-600" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </div>
          <div className="border-t border-brand-900/8 p-1.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-600 transition-colors hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
