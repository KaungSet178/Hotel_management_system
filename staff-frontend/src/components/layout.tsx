import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  CalendarCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  ConciergeBell,
  FileText,
  KeyRound,
  LogOut,
  MapPin,
  Menu,
  Receipt,
  Search,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ADMIN_NAV_ITEMS, NAV_ITEMS } from '@/nav';
import { LOCALE } from '@/data/seed';
import { formatMyanmarDateTime } from '@/lib/format';
import { useAppStore } from '@/store';
import { useAuth } from '@/auth';
import { useToast } from '@/components/toast';
import { ProfileModal } from '@/components/profile';
import { Avatar, CountBadge } from '@/components/ui';
import { useNotifications, type StaffNotification } from '@/context/NotificationContext';

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function getNotificationIcon(type: string): LucideIcon {
  switch (type) {
    case 'NEW_BOOKING':
      return CalendarCheck;
    case 'PAYMENT_PROOF':
      return FileText;
    case 'SERVICE_REQUEST':
      return ConciergeBell;
    case 'CHECK_IN':
      return KeyRound;
    case 'PAYMENT_SETTLED':
      return Receipt;
    default:
      return Bell;
  }
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary-container">
        <Building2 className="h-5 w-5 text-on-secondary-container" />
      </span>
      <div>
        <p className="text-title-sm leading-5 font-bold text-white">StayEase</p>
        <p className="text-label-sm text-white/55">{LOCALE.property}</p>
      </div>
    </div>
  );
}

function SidebarContent({
  onNavigate,
  onOpenProfile,
}: {
  onNavigate?: () => void;
  onOpenProfile: () => void;
}) {
  const { requests, bookings } = useAppStore();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const isAdmin = user?.role === 'ADMIN';

  const queueCount = requests.filter(
    (r) => r.state === 'PROOF_UPLOADED',
  ).length;
  const arrivalsCount = bookings.filter(
    (b) => b.status === 'PENDING' || b.status === 'CONFIRMED',
  ).length;

  const countFor = (path: string): number => {
    if (path === '/requests') return queueCount;
    if (path === '/availability' || path === '/qr-checkin') return arrivalsCount;
    return 0;
  };

  const handleLogout = async () => {
    await logout();
    toast.info('Signed out of StayEase portal');
    navigate('/login');
  };

  return (
    <nav className="flex h-full w-64 flex-col bg-primary-container text-[#ecf1ff]">
      <div className="px-5 pt-5 pb-4">
        <Brand />
        <div className="mt-4 flex items-center justify-between rounded-lg bg-white/8 px-3 py-2">
          <div className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-[#86f2e4]" />
            <span className="text-label-sm font-medium text-white/90">
              {user?.station || LOCALE.desk}
            </span>
          </div>
          <span className="rounded-full bg-white/12 px-2 py-0.5 text-label-xs font-semibold text-[#86f2e4]">
            {user?.role || 'STAFF'}
          </span>
        </div>
      </div>

      <div className="scrollbar-none flex-1 space-y-4 overflow-y-auto px-3 py-1">
        {/* Strictly Isolated Navigation: Admin sees ONLY Admin nav, Staff sees ONLY Staff nav */}
        {isAdmin ? (
          <div>
            <p className="px-2 pb-1.5 text-label-xs font-bold tracking-wider text-[#89f5e7]">
              EXECUTIVE MANAGEMENT
            </p>
            <div className="space-y-1">
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/admin'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 transition',
                        isActive
                          ? 'bg-white text-[#0e1c32] shadow-sm font-semibold'
                          : 'text-white/80 hover:bg-white/10 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={cn(
                            'h-[18px] w-[18px]',
                            isActive ? 'text-[#0e1c32]' : 'text-[#89f5e7]',
                          )}
                        />
                        <span className="flex-1 text-label-md font-medium">{item.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            <p className="px-2 pb-1.5 text-label-xs font-semibold tracking-wider text-white/40">
              OPERATIONS & FRONT DESK
            </p>
            <div className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2 transition',
                        isActive
                          ? 'bg-white text-[#0e1c32] shadow-sm font-semibold'
                          : 'text-white/80 hover:bg-white/10 hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          className={cn(
                            'h-[18px] w-[18px]',
                            isActive ? 'text-[#0e1c32]' : 'text-[#89f5e7]',
                          )}
                        />
                        <span className="flex-1 text-label-md font-medium">{item.label}</span>
                        {countFor(item.to) > 0 && (
                          <CountBadge
                            count={countFor(item.to)}
                            className={cn(
                              isActive
                                ? 'bg-primary-container text-white'
                                : 'bg-secondary-container text-on-secondary-container',
                            )}
                          />
                        )}
                        <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* User Card & Logout */}
      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex w-full items-center gap-2.5 rounded-lg px-1 py-1 text-left transition hover:bg-white/10"
        >
          <Avatar
            name={user?.name || LOCALE.staffName}
            className="h-9 w-9 bg-secondary-container text-on-secondary-container"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-label-md font-semibold text-white">
              {user?.name || LOCALE.staffName}
            </p>
            <p className="truncate text-label-xs text-white/50">
              {user?.title || LOCALE.staffRole}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 text-white/60" />
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/12 py-2 text-label-md font-medium text-white/80 transition hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>
    </nav>
  );
}

function NotificationsPanel({
  items,
  onOpen,
  onMarkAllAsRead,
  onClear,
}: {
  items: StaffNotification[];
  onOpen: (item: StaffNotification) => void;
  onMarkAllAsRead: () => void;
  onClear: () => void;
}) {
  const unreadCount = items.filter((i) => !i.read).length;

  return (
    <div className="w-full rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-[0_24px_60px_-24px_rgba(11,22,38,0.4)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-outline-variant/40 px-4 py-3 bg-surface-container-low/50">
        <div className="flex items-center gap-2">
          <p className="text-label-md font-semibold text-on-surface">Live Alerts</p>
          {unreadCount > 0 && (
            <span className="rounded-full bg-secondary-container px-2 py-0.5 text-label-xs font-bold text-on-secondary-container">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="rounded-full px-2 py-1 text-label-xs font-semibold text-secondary transition hover:bg-secondary-container/40"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-body-sm text-on-surface-variant">
          You're all caught up. Real-time updates appear here.
        </p>
      ) : (
        <ul className="max-h-96 overflow-y-auto divide-y divide-outline-variant/30">
          {items.map((item) => {
            const Icon = getNotificationIcon(item.type);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition hover:bg-surface-container-low focus-visible:bg-surface-container-low focus-visible:outline-none',
                    !item.read ? 'bg-secondary-container/15' : 'bg-transparent',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                      !item.read
                        ? 'bg-secondary text-on-secondary'
                        : 'bg-surface-container text-on-surface-variant',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-label-md truncate',
                        !item.read ? 'font-bold text-on-surface' : 'font-medium text-on-surface/80',
                      )}
                    >
                      {item.title}
                    </p>
                    <p className="truncate text-body-sm text-on-surface-variant">{item.desc}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-label-xs text-on-surface-variant/70 font-mono">
                      {formatTimeAgo(item.timestamp)}
                    </span>
                    {!item.read && (
                      <span className="h-2 w-2 rounded-full bg-secondary" />
                    )}
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-on-surface-variant/40" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > 0 && (
        <div className="border-t border-outline-variant/30 px-4 py-2 bg-surface-container-low/30 flex items-center justify-between">
          <span className="text-label-xs text-on-surface-variant/60">Front Desk Realtime Hub</span>
          <button
            type="button"
            onClick={onClear}
            className="text-label-xs text-on-surface-variant hover:text-error transition"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

export function Shell() {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState('');

  const isAdminView = location.pathname.startsWith('/admin');

  const [mmtTime, setMmtTime] = useState(() => formatMyanmarDateTime(new Date()));

  useEffect(() => {
    const timer = setInterval(() => {
      setMmtTime(formatMyanmarDateTime(new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

  const openNotification = (item: StaffNotification): void => {
    markAsRead(item.id);
    const target = isAdminView && item.adminTo ? item.adminTo : item.to;
    setNotifOpen(false);
    navigate(target);
  };


  const submitSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const q = document.querySelector<HTMLInputElement>('input[data-desk-search]');
    const term = (q?.value ?? query).trim();
    navigate(term ? `/reservations?q=${encodeURIComponent(term)}` : '/reservations');
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-surface">
      <aside className="hidden shrink-0 lg:block">
        <SidebarContent onOpenProfile={() => setProfileOpen(true)} />
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[#0b1626]/45"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 animate-[drawer-in_0.2s_ease-out]">
            <SidebarContent
              onNavigate={() => setDrawerOpen(false)}
              onOpenProfile={() => {
                setDrawerOpen(false);
                setProfileOpen(true);
              }}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-outline-variant/50 bg-white/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-low lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="hidden items-center gap-1.5 rounded-full bg-secondary-container px-2.5 py-1 text-label-sm font-medium text-on-secondary-container md:inline-flex">
            <MapPin className="h-3.5 w-3.5" />
            {isAdminView ? 'Executive Management Suite' : 'Front Desk 01 • Main Wing'}
          </div>

          <div className="hidden items-center gap-1.5 rounded-full border border-secondary/20 bg-secondary-container/30 px-3 py-1 font-mono text-label-xs font-semibold text-secondary sm:inline-flex">
            <Clock className="h-3.5 w-3.5" />
            {mmtTime}
          </div>

          <form
            onSubmit={submitSearch}
            className="relative hidden max-w-md flex-1 sm:block"
          >
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#75777e]" />
            <input
              data-desk-search
              type="text"
              placeholder="Search reservations, guests…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-full rounded-full border border-outline-variant/60 bg-surface-container-low pl-9 pr-4 text-body-md text-on-surface placeholder:text-[#91949c] outline-none transition focus:border-[#0e1c32] focus:bg-white focus:ring-2 focus:ring-[#0e1c32]/10"
            />
          </form>

          <div className="flex-1" />

          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((prev) => !prev)}
              className="relative rounded-full p-2 text-on-surface-variant transition hover:bg-surface-container-low hover:text-on-surface"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-84 sm:w-96 max-w-[calc(100vw-2rem)]">
                  <NotificationsPanel
                    items={notifications}
                    onOpen={openNotification}
                    onMarkAllAsRead={markAllAsRead}
                    onClear={() => {
                      clearAll();
                      setNotifOpen(false);
                      toast.success('Notifications cleared');
                    }}
                  />
                </div>
              </>
            )}
          </div>

          <div className="h-6 w-px bg-outline-variant" />

          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2.5 rounded-lg px-1 py-1 transition hover:bg-surface-container-low"
          >
            <Avatar name={user?.name || LOCALE.staffName} />
            <div className="hidden text-left sm:block">
              <p className="text-label-md leading-4 font-semibold text-on-surface">
                {user?.name || LOCALE.staffName}
              </p>
              <p className="text-label-sm leading-4 text-on-surface-variant">
                {user?.title || LOCALE.staffRole}
              </p>
            </div>
            <ChevronDown className="hidden h-4 w-4 text-on-surface-variant sm:block" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}