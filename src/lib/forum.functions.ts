import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const LEVELS = ["continent", "country", "zone", "state", "district", "branch"] as const;
export type CaucusLevel = (typeof LEVELS)[number];
const KINDS = ["event", "news", "announcement", "policy"] as const;
export type PostKind = (typeof KINDS)[number];
const ROLES = [
  "senate_president",
  "senate_member",
  "continent_admin",
  "country_admin",
  "zone_admin",
  "state_admin",
  "district_admin",
  "branch_admin",
  "member",
] as const;

export const getMyRoleContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: assignments }, { data: member }, { data: isAdmin }, { data: presidentExists }] = await Promise.all([
      supabase.from("admin_assignments").select("id, role, unit_id").eq("user_id", userId),
      supabase.from("members").select("id, branch_unit_id, member_code, full_name").eq("user_id", userId).maybeSingle(),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("senate_president_exists"),
    ]);
    const roles = (assignments ?? []).map((a) => a.role as string);
    const isSenatePresident = roles.includes("senate_president");
    const isSenateMember = roles.includes("senate_member");
    const isSenate = isSenatePresident || isSenateMember;
    const adminAssignments = (assignments ?? []).filter((a) => a.unit_id);
    return {
      userId,
      roles,
      isSenate,
      isSenatePresident,
      isSenateMember,
      isAdmin: !!isAdmin,
      senatePresidentExists: !!presidentExists,
      adminAssignments,
      memberUnitId: member?.branch_unit_id ?? null,
      memberCode: member?.member_code ?? null,
      memberName: member?.full_name ?? null,
    };
  });

export const claimSenatePresident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("claim_senate_president");
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("@/lib/audit.server");
    void logAudit(supabaseAdmin, {
      actorId: context.userId,
      action: "senate_president.claim",
      targetType: "admin_assignments",
      targetId: context.userId,
    });

    return { ok: true };
  });

export const listAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: isAdmin }, { data: isSenate }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("is_senate", { _uid: context.userId }),
    ]);
    if (!isAdmin && !isSenate) throw new Error("Forbidden");

    const { data, error } = await context.supabase
      .from("audit_log")
      .select("id, actor_id, action, target_type, target_id, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });


export const listUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("geographic_units")
      .select("id, level, name, slug, parent_id")
      .order("level")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      level: z.enum(LEVELS),
      name: z.string().min(1).max(120),
      parentId: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("geographic_units")
      .insert({ level: data.level, name: data.name, parent_id: data.parentId ?? null })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("@/lib/audit.server");
    void logAudit(supabaseAdmin, {
      actorId: context.userId,
      action: "unit.create",
      targetType: "geographic_units",
      targetId: row.id,
      detail: { level: row.level, name: row.name, parentId: row.parent_id },
    });

    return row;
  });

export const deleteUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("geographic_units").select("level, name").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("geographic_units").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("@/lib/audit.server");
    void logAudit(supabaseAdmin, {
      actorId: context.userId,
      action: "unit.delete",
      targetType: "geographic_units",
      targetId: data.id,
      detail: existing ?? {},
    });

    return { ok: true };
  });

export const listAdminAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("admin_assignments")
      .select("id, user_id, role, unit_id, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const assignAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      role: z.enum(ROLES),
      unitId: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("admin_assignments")
      .insert({ user_id: data.userId, role: data.role, unit_id: data.unitId ?? null })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("@/lib/audit.server");
    void logAudit(supabaseAdmin, {
      actorId: context.userId,
      action: "admin.assign",
      targetType: "admin_assignments",
      targetId: row.id,
      detail: { grantedTo: data.userId, role: data.role, unitId: data.unitId ?? null },
    });

    return row;
  });

export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("admin_assignments").select("user_id, role, unit_id").eq("id", data.id).maybeSingle();
    const { error } = await context.supabase.from("admin_assignments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logAudit } = await import("@/lib/audit.server");
    void logAudit(supabaseAdmin, {
      actorId: context.userId,
      action: "admin.revoke",
      targetType: "admin_assignments",
      targetId: data.id,
      detail: existing ?? {},
    });

    return { ok: true };
  });

export const listPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      unitId: z.string().uuid().nullable().optional(),
      kind: z.enum(KINDS).optional(),
    }).partial().parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("posts")
      .select("id, kind, title, body, unit_id, author_id, event_starts_at, event_location, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data?.unitId) q = q.eq("unit_id", data.unitId);
    if (data?.kind) q = q.eq("kind", data.kind);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      kind: z.enum(KINDS),
      title: z.string().min(1).max(200),
      body: z.string().max(20000).default(""),
      unitId: z.string().uuid().nullable().optional(),
      eventStartsAt: z.string().datetime().optional().nullable(),
      eventLocation: z.string().max(240).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("posts")
      .insert({
        kind: data.kind,
        title: data.title,
        body: data.body ?? "",
        unit_id: data.unitId ?? null,
        author_id: context.userId,
        event_starts_at: data.eventStartsAt ?? null,
        event_location: data.eventLocation ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getRsvpSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ postIds: z.array(z.string().uuid()).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.postIds.length === 0) return {};
    const { data: rows, error } = await context.supabase
      .from("event_rsvps")
      .select("post_id, user_id")
      .in("post_id", data.postIds);
    if (error) throw new Error(error.message);
    const summary: Record<string, { count: number; mine: boolean }> = {};
    for (const id of data.postIds) summary[id] = { count: 0, mine: false };
    for (const r of rows ?? []) {
      summary[r.post_id].count += 1;
      if (r.user_id === context.userId) summary[r.post_id].mine = true;
    }
    return summary;
  });

export const setRsvp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ postId: z.string().uuid(), going: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.going) {
      const { error } = await context.supabase
        .from("event_rsvps")
        .upsert({ post_id: data.postId, user_id: context.userId });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("event_rsvps")
        .delete()
        .eq("post_id", data.postId)
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listPolicies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("policies")
      .select("id, title, body, status, created_by, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      title: z.string().min(1).max(200),
      body: z.string().max(50000).default(""),
      status: z.enum(["draft", "published", "archived"]).default("draft"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("policies")
      .insert({ title: data.title, body: data.body, status: data.status, created_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updatePolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(200).optional(),
      body: z.string().max(50000).optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error, data: row } = await context.supabase
      .from("policies").update(patch).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const addPolicyCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      policyId: z.string().uuid(),
      userId: z.string().uuid(),
      permission: z.enum(["edit", "comment"]).default("edit"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("policy_collaborators")
      .insert({ policy_id: data.policyId, user_id: data.userId, permission: data.permission });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMembersInScope = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("members")
      .select("id, full_name, email, member_code, plan_id, branch_unit_id, status, joined_at")
      .order("joined_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });


export const searchMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ query: z.string().max(120).default("") }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: isSenate }] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("is_senate", { _uid: context.userId }),
    ]);
    if (!isAdmin && !isSenate) throw new Error("Forbidden");

    const q = (data?.query ?? "").trim();
    let query = context.supabase
      .from("members")
      .select("id, user_id, full_name, email, member_code")
      .not("user_id", "is", null)
      .eq("status", "approved")
      .order("full_name")
      .limit(20);
    if (q) {
      const like = `%${q.replace(/[%_]/g, "\\$&")}%`;
      query = query.or(`full_name.ilike.${like},email.ilike.${like},member_code.ilike.${like}`);
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return (rows ?? []).filter((r) => r.user_id) as Array<{
      id: string;
      user_id: string;
      full_name: string;
      email: string;
      member_code: string;
    }>;
  });

export const LEVEL_LIST = LEVELS;
export const POST_KINDS = KINDS;
export const ROLE_LIST = ROLES;

