import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { getAllMembers, getMyRole, approveMember, rejectMember, assignMemberBranch } from "@/lib/members.functions";
import { listUnits } from "@/lib/forum.functions";
import { planNameShort } from "@/lib/plans";
import { EmptyState, LoadingRows } from "@/components/portal/empty-state";

export const Route = createFileRoute("/_authenticated/portal/members")({
  ssr: false,
  beforeLoad: async () => {
    const { isAdmin } = await getMyRole();
    if (!isAdmin) throw redirect({ to: "/portal" });
  },
  head: () => ({ meta: [{ title: "Members — Portal" }] }),
  component: MembersPage,
});

type Tab = "pending" | "approved" | "expiring" | "rejected" | "all";
const EXPIRING_WINDOW_DAYS = 30;

function isExpiringSoon(r: { status: string; expires_at: string | null }) {
  if (r.status !== "approved" || !r.expires_at) return false;
  const days = (new Date(r.expires_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  return days >= 0 && days <= EXPIRING_WINDOW_DAYS;
}
type SortKey = "name" | "joined" | "plan" | "state";

const PAGE_SIZE = 25;

function MembersPage() {
  const qc = useQueryClient();
  const fetchAll = useServerFn(getAllMembers);
  const approve = useServerFn(approveMember);
  const reject = useServerFn(rejectMember);
  const assignBranch = useServerFn(assignMemberBranch);
  const fetchUnits = useServerFn(listUnits);
  const q = useQuery({ queryKey: ["all-members"], queryFn: () => fetchAll() });
  const unitsQ = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const branches = (unitsQ.data ?? []).filter((u) => u.level === "branch");

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("pending");
  const [sort, setSort] = useState<SortKey>("joined");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const rows = q.data ?? [];

  const counts = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    expiring: rows.filter(isExpiringSoon).length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    thisMonth: rows.filter((r) => {
      const d = new Date(r.joined_at);
      const n = new Date();
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    }).length,
  }), [rows]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows
      .filter((r) => (tab === "all" ? true : tab === "expiring" ? isExpiringSoon(r) : r.status === tab))
      .filter((r) => !s || [r.full_name, r.email, r.member_code, r.mobile, r.district, r.state]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(s)));
  }, [rows, search, tab]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sort === "name") { av = a.full_name; bv = b.full_name; }
      else if (sort === "joined") { av = new Date(a.joined_at).getTime(); bv = new Date(b.joined_at).getTime(); }
      else if (sort === "plan") { av = a.plan_id; bv = b.plan_id; }
      else if (sort === "state") { av = a.state; bv = b.state; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sort, sortDir]);

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(k: SortKey) {
    if (sort === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSort(k); setSortDir(k === "joined" ? "desc" : "asc"); }
    setPage(0);
  }

  async function handleApprove(id: string) {
    setBusyId(id); setErr(null); setMsg(null);
    try {
      const res = await approve({ data: { memberId: id } });
      setMsg(`Approved ${res.email}. Welcome email sent.`);
      await qc.invalidateQueries({ queryKey: ["all-members"] });
    } catch (e) { setErr((e as Error).message); }
    finally { setBusyId(null); }
  }

  async function handleReject(id: string) {
    if (!confirm("Reject this registration?")) return;
    setBusyId(id); setErr(null); setMsg(null);
    try {
      await reject({ data: { memberId: id } });
      setMsg("Registration rejected.");
      await qc.invalidateQueries({ queryKey: ["all-members"] });
    } catch (e) { setErr((e as Error).message); }
    finally { setBusyId(null); }
  }

  async function handleAssignBranch(id: string, unitId: string) {
    setBusyId(id); setErr(null); setMsg(null);
    try {
      await assignBranch({ data: { memberId: id, unitId: unitId || null } });
      setMsg("Branch updated.");
      await qc.invalidateQueries({ queryKey: ["all-members"] });
    } catch (e) { setErr((e as Error).message); }
    finally { setBusyId(null); }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-brand-saffron font-semibold">Admin</p>
          <h1 className="mt-1 font-serif text-3xl md:text-4xl font-medium">Members</h1>
        </div>
        <input
          type="search"
          placeholder="Search name, email, ID, mobile…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="w-full sm:w-80 bg-white border border-brand-ink/15 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:border-brand-green"
        />
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Total" value={counts.total} />
        <Stat label="Pending" value={counts.pending} tone="amber" />
        <Stat label="Approved" value={counts.approved} tone="green" />
        <Stat label="Expiring soon" value={counts.expiring} tone="amber" />
        <Stat label="Joined this month" value={counts.thisMonth} />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {(["pending", "approved", "expiring", "rejected", "all"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(0); }}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
              tab === t
                ? "bg-brand-green text-brand-paper"
                : "bg-white text-brand-ink/70 ring-1 ring-brand-ink/10 hover:ring-brand-green/40"
            }`}
          >
            {t} ({t === "all" ? counts.total : counts[t]})
          </button>
        ))}
      </div>

      {msg && <p className="mt-4 text-sm text-brand-green">{msg}</p>}
      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

      {/* Desktop table */}
      <div className="mt-6 hidden md:block overflow-x-auto rounded-2xl ring-1 ring-brand-ink/10 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-brand-paper-warm/40 text-left text-[11px] uppercase tracking-[0.15em] text-brand-ink/60 sticky top-0">
            <tr>
              <th className="px-4 py-3">Member ID</th>
              <SortTh label="Name" k="name" sort={sort} dir={sortDir} onClick={toggleSort} />
              <th className="px-4 py-3">Email</th>
              <SortTh label="Plan" k="plan" sort={sort} dir={sortDir} onClick={toggleSort} />
              <SortTh label="State" k="state" sort={sort} dir={sortDir} onClick={toggleSort} />
              <SortTh label="Joined" k="joined" sort={sort} dir={sortDir} onClick={toggleSort} />
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={8}><LoadingRows /></td></tr>}
            {!q.isLoading && paged.map((m) => {
              const open = openId === m.id;
              return (
                <Fragment key={m.id}>
                  <tr onClick={() => setOpenId(open ? null : m.id)}
                    className="border-t border-brand-ink/5 hover:bg-brand-paper-warm/20 cursor-pointer">
                    <td className="px-4 py-3 font-mono text-xs">{m.member_code}</td>
                    <td className="px-4 py-3">{m.full_name}</td>
                    <td className="px-4 py-3 text-brand-ink/70">{m.email}</td>
                    <td className="px-4 py-3"><PlanPill plan={m.plan_id} /></td>
                    <td className="px-4 py-3 text-brand-ink/70">{m.state}</td>
                    <td className="px-4 py-3 text-brand-ink/70">{new Date(m.joined_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><StatusPill status={m.status} /></td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {m.status === "pending" ? (
                        <div className="flex gap-2">
                          <button disabled={busyId === m.id} onClick={() => handleApprove(m.id)}
                            className="px-3 py-1 rounded-full text-xs font-semibold bg-brand-green text-brand-paper disabled:opacity-60">
                            {busyId === m.id ? "…" : "Approve"}
                          </button>
                          <button disabled={busyId === m.id} onClick={() => handleReject(m.id)}
                            className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-red-600 ring-1 ring-red-200 disabled:opacity-60">
                            Reject
                          </button>
                        </div>
                      ) : <span className="text-xs text-brand-ink/40">—</span>}
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-brand-paper-warm/30 border-t border-brand-ink/5">
                      <td colSpan={8} className="px-5 py-5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <Detail label="Mobile" value={m.mobile} />
                          <Detail label="Alt mobile" value={m.alt_mobile} />
                          <Detail label="Alt email" value={m.alt_email} />
                          <Detail label="Parent" value={m.parent_name} />
                          <Detail label="Address" value={m.address} className="col-span-2" />
                          <Detail label="Town" value={m.town} />
                          <Detail label="District" value={m.district} />
                          <Detail label="Expires" value={m.expires_at ? new Date(m.expires_at).toLocaleDateString() : "Lifetime"} />
                        </div>
                        {m.status === "approved" && (
                          <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                            <p className="text-[10px] uppercase tracking-wider text-brand-ink/40 mb-1">Caucus branch</p>
                            <select
                              defaultValue={m.branch_unit_id ?? ""}
                              disabled={busyId === m.id}
                              onChange={(e) => handleAssignBranch(m.id, e.target.value)}
                              className="border border-brand-ink/20 rounded-md px-3 py-1.5 text-xs bg-white"
                            >
                              <option value="">Unassigned</option>
                              {branches.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!q.isLoading && paged.length === 0 && (
              <tr><td colSpan={8}>
                <EmptyState icon={Users} title="No members found" description="Try a different filter or search." />
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-6 md:hidden space-y-3">
        {q.isLoading && <LoadingRows />}
        {!q.isLoading && paged.map((m) => (
          <div key={m.id} className="rounded-xl bg-white ring-1 ring-brand-ink/10 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{m.full_name}</p>
                <p className="text-xs text-brand-ink/60 font-mono">{m.member_code}</p>
                <p className="text-xs text-brand-ink/60 truncate">{m.email}</p>
                <p className="text-xs text-brand-ink/50 mt-1">{m.district}, {m.state}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <StatusPill status={m.status} />
                <PlanPill plan={m.plan_id} />
              </div>
            </div>
            {m.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <button disabled={busyId === m.id} onClick={() => handleApprove(m.id)}
                  className="flex-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-green text-brand-paper disabled:opacity-60">Approve</button>
                <button disabled={busyId === m.id} onClick={() => handleReject(m.id)}
                  className="flex-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-red-600 ring-1 ring-red-200 disabled:opacity-60">Reject</button>
              </div>
            )}
          </div>
        ))}
        {!q.isLoading && paged.length === 0 && (
          <EmptyState icon={Users} title="No members found" description="Try a different filter or search." />
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-6 flex items-center justify-between text-xs text-brand-ink/60">
          <span>{sorted.length} results · page {page + 1} of {pages}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(page - 1)}
              className="px-3 py-1 rounded-full bg-white ring-1 ring-brand-ink/10 disabled:opacity-40">Prev</button>
            <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}
              className="px-3 py-1 rounded-full bg-white ring-1 ring-brand-ink/10 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "green" | "amber" }) {
  const toneCls = tone === "green" ? "text-brand-green" : tone === "amber" ? "text-amber-600" : "text-brand-ink";
  return (
    <div className="rounded-xl bg-white ring-1 ring-brand-ink/10 p-4">
      <p className="text-[10px] uppercase tracking-wider text-brand-ink/50 font-semibold">{label}</p>
      <p className={`mt-1 font-serif text-3xl ${toneCls}`}>{value}</p>
    </div>
  );
}

function SortTh({ label, k, sort, dir, onClick }: { label: string; k: SortKey; sort: SortKey; dir: "asc"|"desc"; onClick: (k: SortKey) => void }) {
  const active = sort === k;
  return (
    <th className="px-4 py-3">
      <button onClick={() => onClick(k)} className="flex items-center gap-1 uppercase text-[11px] tracking-[0.15em] text-brand-ink/60 hover:text-brand-ink">
        {label}{active && <span>{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}

function StatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${styles[status]}`}>{status}</span>;
}

function PlanPill({ plan }: { plan: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
      plan.startsWith("active") ? "bg-brand-green/10 text-brand-green" : "bg-brand-saffron/10 text-brand-saffron"
    }`}>{planNameShort(plan)}</span>
  );
}

function Detail({ label, value, className = "" }: { label: string; value: string | null | undefined; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase tracking-wider text-brand-ink/40">{label}</p>
      <p className="mt-0.5 text-brand-ink/80 break-words">{value || "—"}</p>
    </div>
  );
}
