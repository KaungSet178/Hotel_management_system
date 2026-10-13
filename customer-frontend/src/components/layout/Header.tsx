import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { BedDouble, Menu, Phone, X } from 'lucide-react';
import { Container } from '@/components/ui/section';
import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { ProfileMenu } from '@/components/account/ProfileMenu';
import { SupportDialog } from './SupportDialog';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/search', label: 'Find Rooms' },
  { to: '/guest-services', label: 'Guest Services' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-full px-3 py-2 text-sm font-medium transition-colors',
      isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-soft hover:bg-lavender-100 hover:text-ink',
    );

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-brand-900/8 backdrop-blur transition-[box-shadow,background-color] duration-300',
        scrolled ? 'bg-white/95 shadow-card' : 'bg-white/85 shadow-none',
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link to="/" className="group flex items-center gap-2" aria-label="StayFlow home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
            <BedDouble className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink">StayFlow</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className={cn(navLinkClass({ isActive: false }))}
          >
            Help
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <span
            className="hidden items-center rounded-full border border-brand-900/12 px-3 py-1.5 text-xs font-semibold text-brand-800 sm:inline-flex"
            title="All prices are shown in Myanmar Kyat"
          >
            MMK
          </span>
          <Link to="/search" className={buttonStyles('primary', 'sm', 'hidden sm:inline-flex')}>
            Book Now
          </Link>
          <ProfileMenu />
          <button
            type="button"
            className="rounded-full p-2 text-ink-soft hover:bg-lavender-100 lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      {open ? (
        <div className="animate-menu-in border-t border-brand-900/8 bg-white lg:hidden">
          <Container className="flex flex-col gap-1 py-3">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-xl px-3 py-2.5 text-sm font-medium',
                    isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-soft hover:bg-lavender-100',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setHelpOpen(true);
              }}
              className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink-soft hover:bg-lavender-100"
            >
              Help &amp; Concierge
            </button>
            <a
              href="tel:+9512304567"
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-lavender-100"
            >
              <Phone className="h-4 w-4" aria-hidden="true" /> Front desk +95 1 230 4567
            </a>
            <Link
              to="/search"
              onClick={() => setOpen(false)}
              className="mt-1 inline-flex h-11 items-center justify-center rounded-full bg-brand-700 px-5 text-sm font-medium text-white"
            >
              Book Now
            </Link>
          </Container>
        </div>
      ) : null}

      <SupportDialog open={helpOpen} onClose={() => setHelpOpen(false)} context={location.pathname} />
    </header>
  );
}