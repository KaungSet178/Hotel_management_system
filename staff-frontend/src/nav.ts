import {
  BedDouble,
  BookCheck,
  BookMarked,
  ConciergeBell,
  KeyRound,
  ScanLine,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  description: string;
  to: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Reservations',
    description: 'Registry of all stays',
    to: '/reservations',
    icon: BookMarked,
  },
  {
    label: 'Room Availability & Walk-in Booking',
    description: 'Live inventory and direct booking',
    to: '/availability',
    icon: BedDouble,
  },
  {
    label: 'Booking Requests & Payment Verification',
    description: 'Deposits, pay-at-hotel, conflicts',
    to: '/requests',
    icon: BookCheck,
  },
  {
    label: 'QR Check-in',
    description: 'Contactless arrival at the gate',
    to: '/qr-checkin',
    icon: ScanLine,
  },
  {
    label: 'Guest Services',
    description: 'Housekeeping, concierge, bell captain',
    to: '/services',
    icon: ConciergeBell,
  },
  {
    label: 'Check-out',
    description: 'Settlement, folios and keys',
    to: '/checkout',
    icon: KeyRound,
  },
];