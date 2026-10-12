import { useMemo, useState } from 'react';
import {
  Clock,
  Search,
  Download,
  RefreshCw,
  Play,
} from 'lucide-react';
import { useAdminStore } from '../context/AdminStore';
import { AdminHeader } from '../components/AdminHeader';
import { cn } from '@/lib/cn';
import { downloadCsv } from '@/lib/download';
import { useToast } from '@/components/toast';

export function AdminAuditPage() {
  const toast = useToast();
  const { auditLogs, runCancellationPolicySweep } = useAdminStore();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [isSweeping, setIsSweeping] = useState(false);

  const handleSweep = () => {
    setIsSweeping(true);
    setTimeout(() => {
      const res = runCancellationPolicySweep();
      setIsSweeping(false);
      toast.success(res.message);
    }, 600);
  };

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchRole = roleFilter === 'ALL' || log.actorRole === roleFilter;
      const matchAction = actionFilter === 'ALL' || log.action === actionFilter;
      const matchSearch =
        log.actor.toLowerCase().includes(search.toLowerCase()) ||
        log.details.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        log.entityId.toLowerCase().includes(search.toLowerCase()) ||
        (log.ipAddress && log.ipAddress.toLowerCase().includes(search.toLowerCase()));

      return matchRole && matchAction && matchSearch;
    });
  }, [auditLogs, roleFilter, actionFilter, search]);

  const handleExportCsv = () => {
    const headers = [
      'Audit ID',
      'Timestamp (UTC)',
      'Actor Name',
      'Actor Role',
      'Action Code',
      'Entity Type',
      'Entity ID',
      'Details / Log Message',
      'IP Address / Terminal',
    ];

    const rows = filteredLogs.map((l) => [
      l.id,
      l.timestamp,
      l.actor,
      l.actorRole,
      l.action,
      l.entityType,
      l.entityId,
      l.details,
      l.ipAddress || '—',
    ]);

    const filename = `Grand_Azure_Audit_Trail_${Date.now()}.csv`;
    downloadCsv(filename, headers, rows);
    toast.success(`Exported ${filteredLogs.length} audit records.`);
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Policy Engine & Security Audit Trail"
        subtitle="Cryptographically logged operational events, rate yields, and automated hold cancellation triggers"
        badge="Zero-Trust Audit"
        actions={
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-label-md font-medium text-white shadow-xs transition hover:brightness-110 active:scale-[0.99]"
          >
            <Download className="h-4 w-4" />
            Export Audit Log CSV
          </button>
        }
      />

      {/* 24-Hour Hold Policy Runner Card */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-surface-container-lowest to-surface-container-low p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                <Clock className="h-4 w-4" />
              </span>
              <h3 className="text-title-md font-semibold text-on-surface">
                24-Hour Hold Policy Automated Cancellation Runner
              </h3>
            </div>
            <p className="mt-2 text-body-sm text-on-surface-variant leading-relaxed">
              Resort policy mandates that all unpaid Pay-at-Hotel bookings without verified deposit slips are held for a maximum of 24 hours prior to scheduled arrival. Expired unconfirmed holds are released back to active inventory to maximize RevPAR.
            </p>
            <div className="mt-3 flex items-center gap-4 text-label-xs text-on-surface-variant">
              <span>Status: <strong className="text-emerald-600">Active (Hourly pg_cron)</strong></span>
              <span>•</span>
              <span>Grace Period: <strong>24 Hours Prior</strong></span>
              <span>•</span>
              <span>Next Automatic Run: <strong>In 24 mins</strong></span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSweep}
            disabled={isSweeping}
            className="flex items-center justify-center gap-2 shrink-0 rounded-xl bg-secondary-container px-5 py-3 text-label-md font-semibold text-on-secondary-container shadow-xs transition hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
          >
            {isSweeping ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Scanning Reservation Pool…
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                Execute Policy Sweep Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search actor, action code, room, IP, details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9.5 w-full rounded-xl border border-outline-variant/60 bg-surface-container-low pl-9 pr-4 text-body-sm text-on-surface outline-none focus:border-primary focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9.5 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 text-body-sm text-on-surface outline-none cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">ADMIN (Manager)</option>
            <option value="RECEPTIONIST">RECEPTIONIST</option>
            <option value="HOUSEKEEPING">HOUSEKEEPING</option>
            <option value="SYSTEM">SYSTEM Daemon</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9.5 rounded-xl border border-outline-variant/60 bg-surface-container-low px-3 text-body-sm text-on-surface outline-none cursor-pointer"
          >
            <option value="ALL">All Action Types</option>
            <option value="ROOM_PRICE_UPDATED">Room Price Updated</option>
            <option value="ROOM_MAINTENANCE_LOCKED">Room Maintenance Locked</option>
            <option value="ROOM_MAINTENANCE_CLEARED">Room Maintenance Cleared</option>
            <option value="CANCELLATION_SWEEP_EXECUTED">Cancellation Sweep</option>
            <option value="CHECK_IN_COMPLETED">Check-In Completed</option>
            <option value="PAYMENT_PROOF_VERIFIED">Payment Verified</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/60 bg-surface-container-low text-label-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              <th className="px-5 py-3">Timestamp (UTC)</th>
              <th className="px-5 py-3">Actor & Role</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Entity Target</th>
              <th className="px-5 py-3">Audit Details</th>
              <th className="px-5 py-3">IP / Terminal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40 text-body-sm text-on-surface">
            {filteredLogs.map((log) => {
              const isSys = log.actorRole === 'SYSTEM';
              const isAdmin = log.actorRole === 'ADMIN';

              return (
                <tr key={log.id} className="hover:bg-surface-container-low/50 transition">
                  <td className="px-5 py-3.5 font-mono text-label-xs text-on-surface-variant whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-on-surface">{log.actor}</p>
                    <span
                      className={cn(
                        'inline-block rounded-xs px-1.5 py-0.2 text-[10px] font-bold uppercase',
                        isAdmin && 'bg-primary/10 text-primary',
                        isSys && 'bg-slate-500/10 text-slate-700',
                        log.actorRole === 'RECEPTIONIST' && 'bg-secondary-container/40 text-on-secondary-container',
                        log.actorRole === 'HOUSEKEEPING' && 'bg-amber-500/10 text-amber-700',
                      )}
                    >
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-label-xs font-bold text-on-surface">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-label-xs text-on-surface-variant whitespace-nowrap">
                    <span className="font-mono text-primary">{log.entityType}</span> / {log.entityId}
                  </td>
                  <td className="px-5 py-3.5 text-body-sm text-on-surface-variant max-w-md">
                    {log.details}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-label-xs text-on-surface-variant whitespace-nowrap">
                    {log.ipAddress || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
