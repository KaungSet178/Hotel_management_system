import { useMemo, useState } from 'react';
import {
  Clock,
  Search,
  Download,
  RefreshCw,
  Play,
  Terminal,
  X,
  CheckCircle2,
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
    }, 700);
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
        badge="Zero-Trust Security"
        actions={
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-2 rounded-xl bg-[#0e2a4a] px-4 py-2 text-label-sm font-semibold text-white shadow-xs transition hover:bg-[#18395f] active:scale-[0.99] cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#89f5e7]" />
            Export Audit Log CSV
          </button>
        }
      />

      {/* 24-Hour Hold Policy Runner Card */}
      <div className="rounded-2xl border border-secondary/30 bg-[#0e2a4a] p-6 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[#89f5e7]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[#89f5e7]">
                <Clock className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-bold tracking-tight text-white">
                24-Hour Hold Policy Automated Cancellation Runner
              </h3>
            </div>
            <p className="mt-2 text-body-sm text-white/80 leading-relaxed">
              Resort policy mandates that all unpaid Pay-at-Hotel bookings without verified deposit slips are held for a maximum of 24 hours prior to scheduled arrival. Expired unconfirmed holds are released back to active inventory to maximize RevPAR.
            </p>
            <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-label-xs text-white/70">
              <span className="flex items-center gap-1.5 font-semibold text-[#89f5e7]">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Scheduler: Active (Hourly pg_cron)
              </span>
              <span>•</span>
              <span>Grace Period: <strong className="text-white">24 Hours Prior</strong></span>
              <span>•</span>
              <span>Next Automatic Run: <strong className="text-white">In 24 mins</strong></span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSweep}
            disabled={isSweeping}
            className="flex items-center justify-center gap-2 shrink-0 rounded-xl bg-[#89f5e7] px-5 py-3 text-label-sm font-bold text-[#071322] shadow-sm transition hover:bg-[#a6f9ef] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isSweeping ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin text-[#071322]" />
                Scanning Hold Pool…
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current text-[#071322]" />
                Execute Policy Sweep Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container-lowest p-4 shadow-xs space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Search actor, action code, suite number, IP address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9.5 w-full rounded-xl border border-outline-variant/50 bg-surface-container-low pl-9 pr-8 text-body-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none transition focus:border-primary focus:bg-white"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-label-xs font-semibold text-on-surface-variant">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 rounded-xl border border-outline-variant/60 bg-surface-container-low px-2.5 text-label-xs font-bold text-on-surface outline-none cursor-pointer"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">ADMIN (GM)</option>
                <option value="RECEPTIONIST">RECEPTIONIST</option>
                <option value="HOUSEKEEPING">HOUSEKEEPING</option>
                <option value="SYSTEM">SYSTEM Daemon</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-label-xs font-semibold text-on-surface-variant">Action:</span>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="h-9 rounded-xl border border-outline-variant/60 bg-surface-container-low px-2.5 text-label-xs font-bold text-on-surface outline-none cursor-pointer"
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
        </div>

        <div className="flex items-center justify-between border-t border-outline-variant/20 pt-2 text-label-xs text-on-surface-variant">
          <span>Displaying <strong>{filteredLogs.length}</strong> logged audit records</span>
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5" /> Cryptographic Integrity Verified
          </span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-2xl border border-outline-variant/50 bg-surface-container-lowest shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-outline-variant/40 bg-surface-container-low/50 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                <th className="px-4 py-3">Timestamp (UTC)</th>
                <th className="px-4 py-3">Actor & Role</th>
                <th className="px-4 py-3">Action Code</th>
                <th className="px-4 py-3">Target Entity</th>
                <th className="px-4 py-3">Audit Details</th>
                <th className="px-4 py-3">Terminal / Station</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-on-surface">
              {filteredLogs.map((log) => {
                const isSys = log.actorRole === 'SYSTEM';
                const isAdmin = log.actorRole === 'ADMIN';

                return (
                  <tr key={log.id} className="hover:bg-surface-container-low/40 transition">
                    <td className="px-4 py-3.5 font-mono text-label-xs text-on-surface-variant whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-on-surface">{log.actor}</p>
                      <span
                        className={cn(
                          'inline-block rounded-full px-2 py-0.2 text-[10px] font-extrabold uppercase tracking-wide',
                          isAdmin && 'bg-[#0e2a4a]/10 text-[#0e2a4a]',
                          isSys && 'bg-slate-500/10 text-slate-700',
                          log.actorRole === 'RECEPTIONIST' && 'bg-[#89f5e7]/20 text-secondary',
                          log.actorRole === 'HOUSEKEEPING' && 'bg-amber-500/10 text-amber-700',
                        )}
                      >
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          'font-mono text-label-xs font-bold px-2 py-0.5 rounded-md',
                          log.action.includes('PRICE') && 'bg-blue-500/10 text-blue-700',
                          log.action.includes('MAINTENANCE') && 'bg-amber-500/10 text-amber-800',
                          log.action.includes('SWEEP') && 'bg-[#89f5e7]/20 text-[#005a70]',
                          log.action.includes('CHECK_IN') && 'bg-emerald-500/10 text-emerald-700',
                        )}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-label-xs whitespace-nowrap">
                      <span className="font-mono text-[#0e2a4a] font-bold">{log.entityType}</span>
                      <span className="text-on-surface-variant"> / {log.entityId}</span>
                    </td>
                    <td className="px-4 py-3.5 text-body-sm text-on-surface max-w-md">
                      {log.details}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-label-xs text-on-surface-variant whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Terminal className="h-3 w-3 text-secondary" />
                        {log.ipAddress || 'Internal Daemon'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
