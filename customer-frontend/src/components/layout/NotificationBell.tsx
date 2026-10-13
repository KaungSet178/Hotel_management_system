import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Clock, ChevronRight, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useCustomerNotifications, type CustomerNotification } from '@/context/NotificationContext';
import { cn } from '@/lib/cn';

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useCustomerNotifications();
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const handleItemClick = (notif: CustomerNotification) => {
    markAsRead(notif.id);
    setOpen(false);
    if (notif.to) {
      navigate(notif.to);
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-full transition-colors',
          open
            ? 'bg-brand-50 text-brand-800'
            : 'text-ink-soft hover:bg-lavender-100 hover:text-ink',
        )}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-84 sm:w-96 rounded-2xl border border-brand-900/10 bg-white shadow-pop animate-menu-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-brand-900/8 px-4 py-3 bg-brand-50/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-bold text-brand-800">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900 transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-brand-900/6">
            {notifications.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-brand-300 mb-2" />
                <p className="text-sm font-medium text-ink">You're all caught up</p>
                <p className="text-xs text-ink-soft mt-0.5">
                  Real-time updates about your stay and requests will appear here.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                    item.read
                      ? 'bg-white hover:bg-lavender-50/60'
                      : 'bg-brand-50/30 hover:bg-brand-50/60',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                      item.type === 'BOOKING_APPROVED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : item.type === 'BOOKING_REJECTED'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-brand-100 text-brand-700',
                    )}
                  >
                    {item.type === 'BOOKING_APPROVED' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : item.type === 'BOOKING_REJECTED' ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          'text-xs font-semibold truncate',
                          item.read ? 'text-ink-soft' : 'text-ink',
                        )}
                      >
                        {item.title}
                      </p>
                      <span className="shrink-0 flex items-center gap-0.5 text-[10px] text-ink-soft">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTimeAgo(item.timestamp)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-soft line-clamp-2">{item.desc}</p>
                  </div>

                  {!item.read && (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                  )}
                  <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-soft/40" />
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-brand-900/8 px-4 py-2.5 bg-gray-50 flex items-center justify-between">
              <span className="text-[11px] text-ink-soft">Grand Azure Live Sync</span>
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-ink-soft hover:text-rose-600 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
