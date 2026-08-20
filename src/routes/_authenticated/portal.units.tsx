import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Network } from "lucide-react";
import {
  getMyRoleContext, listUnits, createUnit, deleteUnit,
  listAdminAssignments, assignAdmin, revokeAdmin, listPosts,
  LEVEL_LIST, ROLE_LIST, type CaucusLevel,
} from "@/lib/forum.functions";
import { EmptyState, LoadingCard } from "@/components/portal/empty-state";
import { MemberPicker } from "@/components/portal/member-picker";

export const Route = createFileRoute("/_authenticated/portal/units")({
  head: () => ({ meta: [{ title: "Units & Admins — Portal" }] }),
  component: UnitsPage,
});

function prettyRole(r: string) {
  return r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function UnitsPage() {
  const qc = useQueryClient();
  const fetchCtx = useServerFn(getMyRoleContext);
  const fetchUnits = useServerFn(listUnits);
  const fetchAssignments = useServerFn(listAdminAssignments);
  const fetchPosts = useServerFn(listPosts);
  const create = useServerFn(createUnit);
  const del = useServerFn(deleteUnit);
  const assign = useServerFn(assignAdmin);
  const revoke = useServerFn(revokeAdmin);

  const ctxQ = useQuery({ queryKey: ["forum-ctx"], queryFn: () => fetchCtx() });
  const unitsQ = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const assignQ = useQuery({ queryKey: ["assignments"], queryFn: () => fetchAssignments() });
  const postsQ = useQuery({ queryKey: ["posts"], queryFn: () => fetchPosts({ data: {} }) });

  const [level, setLevel] = useState<CaucusLevel>("continent");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<typeof ROLE_LIST[number]>("branch_admin");
  const [unitId, setUnitId] = useState("");

  const ctx = ctxQ.data;
  const units = unitsQ.data ?? [];

  if (ctxQ.isLoading) return <div className="max-w-5xl mx-auto p-6"><LoadingCard /></div>;
  if (!ctx?.isSenatePresident) {
    const isCaucusAdmin = ctx?.adminAssignments.some((a) => a.unit_id);
    if (!isCaucusAdmin) {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <EmptyState icon={Network} title="Not authorized" description="Only Senate President and Caucus admins can view this page." />
        </div>
      );
    }
  }

  const requiresUnit = !["senate_president", "senate_member", "member"].includes(role);
  const levelForRole: Record<string, CaucusLevel> = {
    continent_admin: "continent", country_admin: "country", zone_admin: "zone",
    state_admin: "state", district_admin: "district", branch_admin: "branch",
  };
  const eligibleUnits = requiresUnit ? units.filter((u) => u.level === levelForRole[role]) : [];
  const parentCandidates = units.filter((u) => {
    const idx = LEVEL_LIST.indexOf(level);
    return idx > 0 && u.level === LEVEL_LIST[idx - 1];
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-brand-saffron font-semibold">Governance</p>
        <h1 className="mt-1 font-serif text-4xl font-medium">Units & Admins</h1>
      </div>

      {/* Level counters */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {LEVEL_LIST.map((l) => (
          <div key={l} className="rounded-xl bg-white ring-1 ring-brand-ink/10 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-brand-ink/50 font-semibold">{l}</p>
            <p className="mt-1 font-serif text-2xl text-brand-ink">{units.filter((u) => u.level === l).length}</p>
          </div>
        ))}
      </div>

      {/* Admins assigned / posts this week */}
      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="rounded-xl bg-white ring-1 ring-brand-ink/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-brand-ink/50 font-semibold">Admins assigned</p>
          <p className="mt-1 font-serif text-2xl text-brand-ink">{(assignQ.data ?? []).length}</p>
        </div>
        <div className="rounded-xl bg-white ring-1 ring-brand-ink/10 p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-brand-ink/50 font-semibold">Posts this week</p>
          <p className="mt-1 font-serif text-2xl text-brand-ink">
            {(postsQ.data ?? []).filter((p) => Date.now() - new Date(p.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000).length}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Units */}
        <div className="rounded-xl border border-brand-ink/10 p-5 bg-white">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-ink/50 font-semibold">Caucus Units</p>
          {ctx?.isSenatePresident && (
            <form className="mt-3 space-y-2" onSubmit={async (e) => {
              e.preventDefault();
              if (!name.trim()) return;
              try {
                await create({ data: { level, name, parentId: parentId || null } });
                setName(""); setParentId("");
                await qc.invalidateQueries({ queryKey: ["units"] });
              } catch (err) { alert((err as Error).message); }
            }}>
              <select value={level} onChange={(e) => { setLevel(e.target.value as CaucusLevel); setParentId(""); }}
                className="w-full border border-brand-ink/20 rounded-md px-3 py-2 text-sm bg-white">
                {LEVEL_LIST.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              {level !== "continent" && (
                <select value={parentId} onChange={(e) => setParentId(e.target.value)}
                  className="w-full border border-brand-ink/20 rounded-md px-3 py-2 text-sm bg-white">
                  <option value="">Select parent…</option>
                  {parentCandidates.map((p) => <option key={p.id} value={p.id}>{p.level}: {p.name}</option>)}
                </select>
              )}
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
                className="w-full border border-brand-ink/20 rounded-md px-3 py-2 text-sm" />
              <button className="bg-brand-green text-brand-paper text-xs font-semibold px-3 py-1.5 rounded-full">Add unit</button>
            </form>
          )}
          <ul className="mt-4 max-h-72 overflow-auto text-xs space-y-1 pr-1">
            {units.length === 0 && <li className="text-brand-ink/50">No units yet.</li>}
            {units.map((u) => (
              <li key={u.id} className="flex items-baseline justify-between gap-2 py-1">
                <span><span className="text-brand-ink/40 uppercase tracking-wider mr-1">{u.level}</span>{u.name}</span>
                {ctx?.isSenatePresident && (
                  <button onClick={async () => {
                    if (!confirm(`Delete ${u.name}? Children will be removed.`)) return;
                    await del({ data: { id: u.id } });
                    await qc.invalidateQueries({ queryKey: ["units"] });
                  }} className="text-red-600 hover:underline">×</button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Admin assignments */}
        <div className="rounded-xl border border-brand-ink/10 p-5 bg-white">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-ink/50 font-semibold">Admin Assignments</p>
          {ctx?.isSenatePresident && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!userId) return;
              try {
                await assign({ data: { userId, role, unitId: requiresUnit ? unitId || null : null } });
                setUserId(null); setUnitId("");
                await qc.invalidateQueries({ queryKey: ["assignments"] });
              } catch (err) { alert((err as Error).message); }
            }} className="mt-3 space-y-2">
              <MemberPicker value={userId} onChange={(uid) => setUserId(uid)} />
              <select value={role} onChange={(e) => setRole(e.target.value as typeof ROLE_LIST[number])}
                className="w-full border border-brand-ink/20 rounded-md px-3 py-2 text-sm bg-white">
                {ROLE_LIST.map((r) => <option key={r} value={r}>{prettyRole(r)}</option>)}
              </select>
              {requiresUnit && (
                <select value={unitId} onChange={(e) => setUnitId(e.target.value)}
                  className="w-full border border-brand-ink/20 rounded-md px-3 py-2 text-sm bg-white">
                  <option value="">Select unit…</option>
                  {eligibleUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              )}
              <button disabled={!userId}
                className="bg-brand-green text-brand-paper text-xs font-semibold px-3 py-1.5 rounded-full disabled:opacity-50">
                Assign
              </button>
            </form>
          )}
          <ul className="mt-4 max-h-72 overflow-auto text-xs space-y-1 pr-1">
            {(assignQ.data ?? []).length === 0 && <li className="text-brand-ink/50">No assignments yet.</li>}
            {(assignQ.data ?? []).map((a) => {
              const u = a.unit_id ? units.find((x) => x.id === a.unit_id) : null;
              return (
                <li key={a.id} className="flex items-baseline justify-between gap-2 py-1">
                  <span>
                    <span className="text-brand-ink/60 mr-1 font-medium">{prettyRole(a.role)}</span>
                    {u ? <span className="text-brand-ink/60">· {u.name}</span> : null}
                    <span className="ml-2 font-mono text-brand-ink/40">{a.user_id.slice(0, 8)}</span>
                  </span>
                  {ctx?.isSenatePresident && (
                    <button onClick={async () => {
                      await revoke({ data: { id: a.id } });
                      await qc.invalidateQueries({ queryKey: ["assignments"] });
                    }} className="text-red-600 hover:underline">×</button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
