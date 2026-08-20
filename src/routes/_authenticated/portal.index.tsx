import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { IdCard, MessagesSquare, Users, ScrollText, Network, Crown } from "lucide-react";
import { getMyRoleContext, listPosts, listUnits, claimSenatePresident } from "@/lib/forum.functions";
import { LoadingCard } from "@/components/portal/empty-state";

export const Route = createFileRoute("/_authenticated/portal/")({
  head: () => ({ meta: [{ title: "Portal — Feathers Community Forum" }] }),
  component: PortalHome,
});

function PortalHome() {
  const qc = useQueryClient();
  const fetchCtx = useServerFn(getMyRoleContext);
  const fetchPosts = useServerFn(listPosts);
  const fetchUnits = useServerFn(listUnits);
  const claim = useServerFn(claimSenatePresident);
  const ctxQ = useQuery({ queryKey: ["forum-ctx"], queryFn: () => fetchCtx() });
  const postsQ = useQuery({ queryKey: ["posts"], queryFn: () => fetchPosts({ data: {} }) });
  const unitsQ = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const [claiming, setClaiming] = useState(false);
  const [claimErr, setClaimErr] = useState<string | null>(null);

  const ctx = ctxQ.data;

  async function handleClaim() {
    setClaiming(true); setClaimErr(null);
    try {
      await claim();
      await qc.invalidateQueries({ queryKey: ["forum-ctx"] });
    } catch (e) { setClaimErr((e as Error).message); }
    finally { setClaiming(false); }
  }

  if (ctxQ.isLoading || !ctx) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-4">
        <LoadingCard />
        <LoadingCard />
      </div>
    );
  }

  const roleLabel = ctx.isSenatePresident
    ? "Senate President"
    : ctx.isSenateMember
      ? "Senate Member"
      : ctx.adminAssignments[0]
        ? ctx.adminAssignments[0].role.replace(/_/g, " ")
        : "Member";

  const recentPosts = (postsQ.data ?? []).slice(0, 5);
  const totalPosts = postsQ.data?.length ?? 0;
  const units = unitsQ.data ?? [];

  const isCaucusAdmin = ctx.adminAssignments.some((a) => a.unit_id);
  const showChecklist = ctx.isSenatePresident && units.length === 0 && totalPosts === 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <p className="text-[11px] uppercase tracking-[0.3em] text-brand-saffron font-semibold">Dashboard</p>
      <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight">
        Welcome{ctx.memberName ? `, ${ctx.memberName.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-1 text-brand-ink/60 capitalize">Signed in as {roleLabel}</p>

      {/* Onboarding banners */}

      {!ctx.senatePresidentExists && ctx.isAdmin && (
        <div className="mt-6 rounded-xl border border-brand-saffron/30 bg-brand-saffron/5 p-5 flex items-start gap-4">
          <Crown className="w-5 h-5 text-brand-saffron shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-serif text-lg">No Senate President yet</p>
            <p className="mt-1 text-sm text-brand-ink/70">
              As an admin, you can claim this role to start setting up caucus units, appointing other admins, and
              publishing org-wide posts. This can only be done once.
            </p>
            {claimErr && <p className="mt-2 text-sm text-red-600">{claimErr}</p>}
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="mt-3 bg-brand-saffron text-white text-xs font-semibold px-4 py-2 rounded-full disabled:opacity-60"
            >
              {claiming ? "Claiming…" : "Claim Senate President"}
            </button>
          </div>
        </div>
      )}

      {showChecklist && (
        <div className="mt-6 rounded-xl border border-brand-ink/10 p-5 bg-white">
          <p className="font-serif text-lg">Get your org set up</p>
          <p className="mt-1 text-sm text-brand-ink/70">Three quick steps to start using the portal.</p>
          <ol className="mt-4 space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-brand-green/10 text-brand-green text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>
                <Link to="/portal/units" className="text-brand-green hover:underline font-medium">Add your first caucus unit</Link>
                {" "}— continent, country, zone, state, district, or branch.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-brand-green/10 text-brand-green text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>
                <Link to="/portal/units" className="text-brand-green hover:underline font-medium">Assign an admin</Link>
                {" "}to a unit so they can manage it.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-brand-green/10 text-brand-green text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>
                <Link to="/portal/forum" className="text-brand-green hover:underline font-medium">Publish your first post</Link>
                {" "}— news, an announcement, or an event.
              </span>
            </li>
          </ol>
        </div>
      )}

      {ctx.memberCode && !ctx.memberUnitId && (
        <div className="mt-6 rounded-xl border border-brand-ink/10 p-5 bg-white flex items-start gap-4">
          <Network className="w-5 h-5 text-brand-green shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-serif text-lg">Awaiting branch placement</p>
            <p className="mt-1 text-sm text-brand-ink/70">An admin will place you under a Caucus branch. You'll see posts and events for your area once assigned.</p>
          </div>
        </div>
      )}


      {/* Quick links */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <QuickCard to="/portal/id" icon={IdCard} title="My membership ID" description="View and share your member card." />
        <QuickCard to="/portal/forum" icon={MessagesSquare} title="Forum feed" description={`${totalPosts} posts visible to you`} />
        {(ctx.adminAssignments.some((a) => !a.unit_id) || isCaucusAdmin) && (
          <QuickCard to="/portal/members" icon={Users} title="Members" description="Review, approve, and manage members." />
        )}
        {ctx.isSenate && (
          <QuickCard to="/portal/policies" icon={ScrollText} title="Policies" description="Draft and publish Senate policies." />
        )}
        {(ctx.isSenatePresident || isCaucusAdmin) && (
          <QuickCard to="/portal/units" icon={Network} title="Units & Admins" description="Caucus hierarchy and admin assignments." />
        )}
      </div>

      {/* Recent posts */}
      <div className="mt-10 rounded-xl border border-brand-ink/10 bg-white">
        <div className="px-5 py-4 border-b border-brand-ink/10 flex items-baseline justify-between">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-ink/50 font-semibold">Recent posts</p>
          <Link to="/portal/forum" className="text-xs text-brand-green hover:underline">See all →</Link>
        </div>
        {postsQ.isLoading ? (
          <div className="p-5 text-sm text-brand-ink/50">Loading…</div>
        ) : recentPosts.length === 0 ? (
          <div className="p-8 text-center text-sm text-brand-ink/50">No posts yet.</div>
        ) : (
          <ul className="divide-y divide-brand-ink/10">
            {recentPosts.map((p) => (
              <li key={p.id} className="p-4">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-brand-saffron">{p.kind}</p>
                <p className="mt-1 font-medium">{p.title}</p>
                <p className="text-xs text-brand-ink/50 mt-0.5">{new Date(p.created_at).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function QuickCard({
  to, icon: Icon, title, description,
}: { to: string; icon: typeof IdCard; title: string; description: string }) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-brand-ink/10 bg-white p-5 hover:border-brand-green/40 hover:shadow-sm transition-all"
    >
      <div className="w-10 h-10 rounded-lg bg-brand-green/10 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-brand-green" />
      </div>
      <p className="font-serif text-lg">{title}</p>
      <p className="mt-1 text-sm text-brand-ink/60">{description}</p>
    </Link>
  );
}
