import {
  BarChart3,
  BedDouble,
  BookCheck,
  BookMarked,
  ConciergeBell,
  KeyRound,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  description: string;
  to: string;
  icon: LucideIcon;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Executive Overview',
    description: 'RevPAR, ADR & Occupancy metrics',
    to: '/admin',
    icon: BarChart3,
  },
  {
    label: 'Room Management & Pricing',
    description: 'Room catalog, dynamic rates & maintenance',
    to: '/admin/rooms',
    icon: BedDouble,
  },
  {
    label: 'Channel Analytics',
    description: 'Monthly walk-ins vs online reservations',
    to: '/admin/channels',
    icon: Users,
  },
  {
    label: 'Financial & Tax Ledger',
    description: '10% service, 5% tax & CSV exports',
    to: '/admin/finances',
    icon: ReceiptText,
  },
  {
    label: 'Policy & Audit Logs',
    description: '24-hr hold policy and security trails',
    to: '/admin/audit',
    icon: ShieldCheck,
  },
];

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
    description: 'Deposit slips and payment verification',
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