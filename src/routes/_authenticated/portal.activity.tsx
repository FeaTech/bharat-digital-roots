import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { History } from "lucide-react";
import { getMyRoleContext, listAuditLog } from "@/lib/forum.functions";
import { EmptyState, LoadingRows } from "@/components/portal/empty-state";

export const Route = createFileRoute("/_authenticated/portal/activity")({
  head: () => ({ meta: [{ title: "Activity Log — Portal" }] }),
  component: ActivityPage,
});

function prettyAction(a: string) {
  return a.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ActivityPage() {
  const fetchCtx = useServerFn(getMyRoleContext);
  const fetchLog = useServerFn(listAuditLog);
  const ctxQ = useQuery({ queryKey: ["forum-ctx"], queryFn: () => fetchCtx() });
  const logQ = useQuery({ queryKey: ["audit-log"], queryFn: () => fetchLog() });

  const [search, setSearch] = useState("");

  const ctx = ctxQ.data;
  const canView = !!ctx && (ctx.isAdmin || ctx.isSenate);

  const filtered = useMemo(() => {
    const rows = logQ.data ?? [];
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.action, r.target_type, r.target_id, r.actor_id, JSON.stringify(r.detail)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s)),
    );
  }, [logQ.data, search]);

  if (ctxQ.isLoading) return <div className="max-w-5xl mx-auto p-6"><LoadingRows /></div>;
  if (!canView) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <EmptyState icon={History} title="Not authorized" description="Only admins and senate members can view the activity log." />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-saffron font-semibold">Governance</p>
          <h1 className="mt-1 font-serif text-3xl md:text-4xl font-medium">Activity Log</h1>
        </div>
        <input
          type="search"
          placeholder="Search action, target, actor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 bg-white border border-brand-ink/15 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:border-brand-green"
        />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl ring-1 ring-brand-ink/10 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-brand-paper-warm/40 text-left text-[11px] uppercase tracking-[0.15em] text-brand-ink/60">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody>
            {logQ.isLoading && <tr><td colSpan={5}><LoadingRows /></td></tr>}
            {!logQ.isLoading && filtered.map((r) => (
              <tr key={r.id} className="border-t border-brand-ink/5">
                <td className="px-4 py-3 text-brand-ink/70 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-xs text-brand-ink/60">{r.actor_id ? r.actor_id.slice(0, 8) : "system"}</td>
                <td className="px-4 py-3 font-medium">{prettyAction(r.action)}</td>
                <td className="px-4 py-3 text-brand-ink/70">
                  {r.target_type}
                  {r.target_id ? <span className="font-mono text-xs text-brand-ink/40 ml-1">{r.target_id.slice(0, 8)}</span> : null}
                </td>
                <td className="px-4 py-3 text-xs text-brand-ink/50 max-w-xs truncate" title={JSON.stringify(r.detail)}>
                  {Object.keys(r.detail ?? {}).length > 0 ? JSON.stringify(r.detail) : "—"}
                </td>
              </tr>
            ))}
            {!logQ.isLoading && filtered.length === 0 && (
              <tr><td colSpan={5}>
                <EmptyState icon={History} title="No activity yet" description="Admin and senate actions will show up here." />
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
