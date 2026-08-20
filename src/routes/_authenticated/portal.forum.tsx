import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MessagesSquare } from "lucide-react";
import {
  getMyRoleContext, listUnits, listPosts, createPost, deletePost, getRsvpSummary,
  POST_KINDS, type PostKind, type CaucusLevel,
} from "@/lib/forum.functions";
import { EmptyState, LoadingCard } from "@/components/portal/empty-state";
import { EventRsvpButton } from "@/components/portal/event-rsvp-button";

export const Route = createFileRoute("/_authenticated/portal/forum")({
  head: () => ({ meta: [{ title: "Forum — Feathers Community Forum" }] }),
  component: ForumPage,
});

type Unit = { id: string; level: CaucusLevel; name: string; parent_id: string | null; slug: string | null };

function descendantsOf(unitId: string, map: Map<string, Unit>): Set<string> {
  const out = new Set<string>([unitId]);
  const children = new Map<string, Unit[]>();
  map.forEach((u) => {
    if (u.parent_id) {
      const arr = children.get(u.parent_id) ?? [];
      arr.push(u);
      children.set(u.parent_id, arr);
    }
  });
  const stack = [unitId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const c of children.get(id) ?? []) if (!out.has(c.id)) { out.add(c.id); stack.push(c.id); }
  }
  return out;
}

function ForumPage() {
  const qc = useQueryClient();
  const fetchCtx = useServerFn(getMyRoleContext);
  const fetchUnits = useServerFn(listUnits);
  const fetchPosts = useServerFn(listPosts);
  const create = useServerFn(createPost);
  const del = useServerFn(deletePost);
  const fetchRsvps = useServerFn(getRsvpSummary);

  const ctxQ = useQuery({ queryKey: ["forum-ctx"], queryFn: () => fetchCtx() });
  const unitsQ = useQuery({ queryKey: ["units"], queryFn: () => fetchUnits() });
  const postsQ = useQuery({ queryKey: ["posts"], queryFn: () => fetchPosts({ data: {} }) });
  const eventIds = (postsQ.data ?? []).filter((p) => p.kind === "event").map((p) => p.id);
  const rsvpQ = useQuery({
    queryKey: ["rsvp-summary", eventIds],
    queryFn: () => fetchRsvps({ data: { postIds: eventIds } }),
    enabled: eventIds.length > 0,
  });

  const [filter, setFilter] = useState<PostKind | "all">("all");

  const ctx = ctxQ.data;
  const units = (unitsQ.data ?? []) as Unit[];
  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);

  const canPostUnits = useMemo(() => {
    if (!ctx) return [] as Unit[];
    if (ctx.isSenatePresident) return units;
    const ids = new Set<string>();
    for (const a of ctx.adminAssignments) {
      if (!a.unit_id) continue;
      for (const id of descendantsOf(a.unit_id, unitMap)) ids.add(id);
    }
    return units.filter((u) => ids.has(u.id));
  }, [ctx, units, unitMap]);

  const canPost = ctx?.isSenate || canPostUnits.length > 0;

  const [kind, setKind] = useState<PostKind>("announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [unitId, setUnitId] = useState<string>("");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [posting, setPosting] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setPosting(true);
    try {
      await create({
        data: {
          kind, title, body,
          unitId: unitId || (ctx?.isSenatePresident ? null : canPostUnits[0]?.id ?? null),
          eventStartsAt: kind === "event" && eventStartsAt ? new Date(eventStartsAt).toISOString() : null,
          eventLocation: kind === "event" ? eventLocation : null,
        },
      });
      setTitle(""); setBody(""); setEventStartsAt(""); setEventLocation("");
      await qc.invalidateQueries({ queryKey: ["posts"] });
    } catch (err) { alert((err as Error).message); }
    finally { setPosting(false); }
  }

  if (ctxQ.isLoading || unitsQ.isLoading) {
    return <div className="max-w-4xl mx-auto p-6 space-y-4"><LoadingCard /><LoadingCard /></div>;
  }

  const posts = (postsQ.data ?? []).filter((p) => filter === "all" || p.kind === filter);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.3em] text-brand-saffron font-semibold">Forum</p>
        <h1 className="mt-2 font-serif text-4xl font-medium">Community Feed</h1>
      </div>

      {canPost && (
        <form onSubmit={onCreate} className="rounded-xl border border-brand-ink/10 p-5 bg-white">
          <p className="text-[11px] uppercase tracking-[0.2em] text-brand-ink/50 font-semibold">Create post</p>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <label className="text-xs text-brand-ink/60">
              Kind
              <select value={kind} onChange={(e) => setKind(e.target.value as PostKind)}
                className="mt-1 w-full border border-brand-ink/20 rounded-md px-3 py-2 text-sm bg-white">
                {POST_KINDS.filter((k) => k !== "policy" || ctx?.isSenate).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-brand-ink/60">
              Scope
              <select value={unitId} onChange={(e) => setUnitId(e.target.value)}
                className="mt-1 w-full border border-brand-ink/20 rounded-md px-3 py-2 text-sm bg-white">
                {ctx?.isSenatePresident && <option value="">Senate-wide (all)</option>}
                {canPostUnits.map((u) => (
                  <option key={u.id} value={u.id}>{u.level}: {u.name}</option>
                ))}
              </select>
            </label>
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200}
            placeholder="Title"
            className="mt-3 w-full border border-brand-ink/20 rounded-md px-3 py-2 text-sm" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
            placeholder="Body"
            className="mt-2 w-full border border-brand-ink/20 rounded-md px-3 py-2 text-sm" />
          {kind === "event" && (
            <div className="mt-2 grid sm:grid-cols-2 gap-2">
              <input type="datetime-local" value={eventStartsAt} onChange={(e) => setEventStartsAt(e.target.value)}
                className="border border-brand-ink/20 rounded-md px-3 py-2 text-sm" />
              <input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)}
                placeholder="Location"
                className="border border-brand-ink/20 rounded-md px-3 py-2 text-sm" />
            </div>
          )}
          <button disabled={posting}
            className="mt-3 bg-brand-green text-brand-paper text-sm font-medium px-4 py-2 rounded-full hover:bg-brand-green-deep disabled:opacity-60">
            {posting ? "Posting…" : "Publish"}
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", ...POST_KINDS] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              filter === k
                ? "bg-brand-green text-brand-paper"
                : "bg-white text-brand-ink/70 ring-1 ring-brand-ink/10"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-brand-ink/10 bg-white">
        {posts.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="No posts yet"
            description={canPost ? "Be the first to post in your scope." : "Posts for your scope will appear here."}
          />
        ) : (
          <ul className="divide-y divide-brand-ink/10">
            {posts.map((p) => {
              const scope = p.unit_id ? unitMap.get(p.unit_id) : null;
              const canDelete = p.author_id === ctx?.userId || ctx?.isSenatePresident;
              return (
                <li key={p.id} className="p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <span className={badgeClass(p.kind as PostKind)}>{p.kind}</span>
                      <h3 className="mt-2 font-serif text-lg">{p.title}</h3>
                      <p className="text-[11px] uppercase tracking-wider text-brand-ink/40 mt-1">
                        {scope ? `${scope.level} · ${scope.name}` : "Senate-wide"}
                        {" · "}{new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {canDelete && (
                      <button
                        onClick={async () => {
                          if (!confirm("Delete this post?")) return;
                          await del({ data: { id: p.id } });
                          await qc.invalidateQueries({ queryKey: ["posts"] });
                        }}
                        className="text-xs text-red-600 hover:underline"
                      >Delete</button>
                    )}
                  </div>
                  {p.body && <p className="mt-3 text-sm text-brand-ink/80 whitespace-pre-wrap">{p.body}</p>}
                  {p.kind === "event" && (p.event_starts_at || p.event_location) && (
                    <p className="mt-2 text-xs text-brand-ink/60">
                      {p.event_starts_at && new Date(p.event_starts_at).toLocaleString()}
                      {p.event_location && ` · ${p.event_location}`}
                    </p>
                  )}
                  {p.kind === "event" && (
                    <div className="mt-3">
                      <EventRsvpButton
                        postId={p.id}
                        count={rsvpQ.data?.[p.id]?.count ?? 0}
                        mine={rsvpQ.data?.[p.id]?.mine ?? false}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function badgeClass(k: PostKind) {
  const base = "inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold";
  switch (k) {
    case "event": return `${base} bg-brand-saffron/20 text-brand-saffron`;
    case "news": return `${base} bg-brand-green/15 text-brand-green`;
    case "announcement": return `${base} bg-brand-ink/10 text-brand-ink`;
    case "policy": return `${base} bg-red-100 text-red-700`;
  }
}
