import { Link } from 'react-router-dom';
import { useState } from 'react';
import { BedDouble, Mail, MapPin, Phone, ShieldCheck, Wifi } from 'lucide-react';
import { Container } from '@/components/ui/section';
import { SupportDialog } from './SupportDialog';

const QUICK_LINKS = [
  { to: '/search', label: 'Find Suites' },
  { to: '/account', label: 'My Account' },
  { to: '/guest-services', label: 'Guest Services' },
];

const POLICIES = [
  'Cancellation Policy',
  'Payment Protection',
  'Terms of Hospitality',
  'Privacy Standard',
];

export function Footer() {
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <footer id="support" className="mt-20 border-t border-brand-900/8 bg-white">
      <Container className="py-14">
        <div className="grid gap-10 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2" aria-label="StayFlow home">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">
                <BedDouble className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-semibold tracking-tight text-ink">StayFlow</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-ink-soft">
              Modern boutique hospitality engineered for ultimate tranquility, discretion and effortless
              comfort across Yangon &amp; Inle Lake.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-lavender-100 px-3 py-1 text-xs font-medium text-brand-800">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> PCI-DSS compliant
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-lavender-100 px-3 py-1 text-xs font-medium text-brand-800">
                <Wifi className="h-3.5 w-3.5" aria-hidden="true" /> Secure Wi-Fi
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Quick Links</h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {QUICK_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-ink-soft transition-colors hover:text-brand-700">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => setHelpOpen(true)}
                  className="text-ink-soft transition-colors hover:text-brand-700"
                >
                  FAQ &amp; Concierge
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Policies &amp; Trust</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
              {POLICIES.map((policy) => (
                <li key={policy} className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
                  {policy}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Resort Reception</h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              <li className="flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                <span>No. 84 Strand Road, Heritage Quarter, Yangon, Myanmar</span>
              </li>
              <li className="flex gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                <a href="tel:+9512304567" className="hover:text-brand-700">
                  +95 1 230 4567 / Ext. 0
                </a>
              </li>
              <li className="flex gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                <a href="mailto:concierge@stayflow.example" className="hover:text-brand-700">
                  concierge@stayflow.example
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-brand-900/8 pt-6 text-xs text-ink-mute sm:flex-row">
          <p>© {new Date().getFullYear()} StayFlow Hospitality Solutions Ltd. All rights reserved.</p>
          <p>Currency: MMK (Myanmar Kyat) · Demo build</p>
        </div>
      </Container>
      <SupportDialog open={helpOpen} onClose={() => setHelpOpen(false)} context="/footer" />
    </footer>
  );
}