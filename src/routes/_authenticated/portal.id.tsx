import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Newspaper } from "lucide-react";
import { getMyMember } from "@/lib/members.functions";
import { getMyRoleContext, listUnits, listPosts, getRsvpSummary } from "@/lib/forum.functions";
import { planName, planNameShort } from "@/lib/plans";
import { LoadingCard, EmptyState } from "@/components/portal/empty-state";
import { EventRsvpButton } from "@/components/portal/event-rsvp-button";

export const Route = createFileRoute("/_authenticated/portal/id")({
  head: () => ({ meta: [{ title: "My ID — Feathers Community Forum" }] }),
  component: MyId,
});

function MyId() {
  const fetchMember = useServerFn(getMyMember);
  const fetchCtx = useServerFn(getMyRoleContext);
  const fetchUnits = useServerFn(listUnits);
  const fetchPosts = useServerFn(listPosts);
  const fetchRsvps = useServerFn(getRsvpSummary);
  const memberQ = useQuery({ queryKey: ["my-member"], queryFn: () => fetchMember() });
  const ctxQ = useQuery({ queryKey: ["forum-ctx"], queryFn: () => fetchCtx() });
  const unitsQ = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const postsQ = useQuery({ queryKey: ["posts"], queryFn: () => fetchPosts({ data: {} }) });
  const now = Date.now();
  const upcomingIds = (postsQ.data ?? [])
    .filter((p) => p.kind === "event" && p.event_starts_at && new Date(p.event_starts_at).getTime() >= now)
    .slice(0, 5)
    .map((p) => p.id);
  const rsvpQ = useQuery({
    queryKey: ["rsvp-summary", upcomingIds],
    queryFn: () => fetchRsvps({ data: { postIds: upcomingIds } }),
    enabled: upcomingIds.length > 0,
  });

  if (memberQ.isLoading) {
    return <div className="max-w-4xl mx-auto p-6"><LoadingCard /></div>;
  }
  if (memberQ.error) return <p className="p-6 text-red-600">{(memberQ.error as Error).message}</p>;

  const m = memberQ.data!;
  const ctx = ctxQ.data;
  const branches = (unitsQ.data ?? []).filter((u) => u.level === "branch");
  const posts = postsQ.data ?? [];
  const upcoming = posts
    .filter((p) => p.kind === "event" && p.event_starts_at && new Date(p.event_starts_at).getTime() >= now)
    .slice(0, 5);
  const recent = posts.filter((p) => p.kind !== "event").slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-brand-saffron font-semibold">My Membership</p>
        <h1 className="mt-2 font-serif text-4xl font-medium">Hello, {m.full_name.split(" ")[0]}.</h1>
      </div>

      {/* ID card */}
      <div className="rounded-2xl bg-gradient-to-br from-brand-green to-brand-green-deep text-brand-paper p-8 shadow-xl shadow-brand-green/20 max-w-md">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-brand-saffron font-semibold">Feathers Community Forum</p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-brand-paper/60">Member Identity Card</p>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-brand-saffron text-[10px] font-semibold uppercase tracking-wider text-white">
            {planNameShort(m.plan_id)}
          </span>
        </div>
        <p className="mt-8 font-serif text-3xl leading-tight">{m.full_name}</p>
        <p className="mt-1 text-sm text-brand-paper/70">{m.district}, {m.state}</p>
        <div className="mt-6 grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-brand-paper/50 uppercase tracking-wider">Member ID</p>
            <p className="font-mono mt-1">{m.member_code}</p>
          </div>
          <div>
            <p className="text-brand-paper/50 uppercase tracking-wider">Valid Until</p>
            <p className="font-mono mt-1">{m.expires_at ? new Date(m.expires_at).toLocaleDateString() : "Lifetime"}</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
        <Detail label="Email" value={m.email} />
        <Detail label="Mobile" value={m.mobile} />
        <Detail label="Plan" value={`${planName(m.plan_id)} · ₹${m.amount_inr}`} />
        <Detail label="Joined" value={new Date(m.joined_at).toLocaleDateString()} />
        <Detail label="Address" value={`${m.address}, ${m.town}`} />
        <Detail label="Region" value={`${m.district}, ${m.state}, ${m.country}`} />
      </div>

      {/* Branch */}
      {ctx && (
        <div className="rounded-xl border border-brand-ink/10 p-5 bg-white">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-ink/50 font-semibold">Caucus branch</p>
          {ctx.memberUnitId ? (
            <p className="mt-2 text-sm">
              You are placed under{" "}
              <span className="font-medium">
                {branches.find((b) => b.id === ctx.memberUnitId)?.name ?? "your branch"}
              </span>
              .
            </p>
          ) : (
            <p className="mt-2 text-sm text-brand-ink/60">
              You have not been placed under a branch yet. An admin will assign you shortly.
            </p>
          )}
        </div>
      )}


      {/* Recent + upcoming */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-brand-ink/10 bg-white">
          <div className="px-5 py-4 border-b border-brand-ink/10 flex items-baseline justify-between">
            <p className="text-[11px] uppercase tracking-[0.2em] text-brand-ink/50 font-semibold">Recent posts</p>
            <Link to="/portal/forum" className="text-xs text-brand-green hover:underline">All →</Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState icon={Newspaper} title="No posts yet" description="Forum posts for your scope will appear here." />
          ) : (
            <ul className="divide-y divide-brand-ink/10">
              {recent.map((p) => (
                <li key={p.id} className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-brand-saffron font-semibold">{p.kind}</p>
                  <p className="mt-1 font-medium text-sm">{p.title}</p>
                  <p className="text-xs text-brand-ink/50 mt-0.5">{new Date(p.created_at).toLocaleDateString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-brand-ink/10 bg-white">
          <div className="px-5 py-4 border-b border-brand-ink/10">
            <p className="text-[11px] uppercase tracking-[0.2em] text-brand-ink/50 font-semibold">Upcoming events</p>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No upcoming events" description="Scheduled events will show up here." />
          ) : (
            <ul className="divide-y divide-brand-ink/10">
              {upcoming.map((p) => (
                <li key={p.id} className="p-4">
                  <p className="font-medium text-sm">{p.title}</p>
                  <p className="text-xs text-brand-ink/60 mt-0.5">
                    {p.event_starts_at && new Date(p.event_starts_at).toLocaleString()}
                    {p.event_location ? ` · ${p.event_location}` : ""}
                  </p>
                  <div className="mt-2">
                    <EventRsvpButton
                      postId={p.id}
                      count={rsvpQ.data?.[p.id]?.count ?? 0}
                      mine={rsvpQ.data?.[p.id]?.mine ?? false}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.2em] text-brand-ink/50 font-semibold">{label}</p>
      <p className="mt-1 text-brand-ink">{value}</p>
    </div>
  );
}
