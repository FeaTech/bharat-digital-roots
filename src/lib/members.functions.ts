import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { planIdSchema, PLAN_PRICES_INR, planName, planDuration, type PlanId } from "@/lib/plans";

export type MemberRow = {
  id: string;
  user_id: string | null;
  member_code: string;
  full_name: string;
  parent_name: string | null;
  email: string;
  alt_email: string | null;
  mobile: string;
  alt_mobile: string | null;
  plan_id: PlanId;
  amount_inr: number;
  address: string;
  town: string;
  district: string;
  state: string;
  country: string;
  joined_at: string;
  expires_at: string | null;
  status: "pending" | "approved" | "rejected";
  branch_unit_id: string | null;
};

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  parentName: z.string().trim().max(120).optional().default(""),
  mobile: z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, "Invalid mobile number"),
  altMobile: z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, "Invalid alternate mobile number").optional().or(z.literal("")).default(""),
  email: z.string().trim().email().max(160),
  altEmail: z.string().trim().email().max(160).optional().or(z.literal("")).default(""),
  address: z.string().trim().min(1).max(400),
  country: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  district: z.string().trim().min(1).max(80),
  town: z.string().trim().min(1).max(80),
  planId: planIdSchema,
});

export const submitMembership = createServerFn({ method: "POST" })
  .inputValidator((data) => profileSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.toLowerCase();

    // Reject duplicates against existing members or auth users
    const { data: existingMember } = await supabaseAdmin
      .from("members")
      .select("id, status")
      .ilike("email", email)
      .maybeSingle();
    if (existingMember) {
      throw new Error(
        existingMember.status === "pending"
          ? "A registration with this email is already awaiting approval."
          : "This email is already registered. Please log in instead.",
      );
    }
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (list?.users.some((u) => (u.email ?? "").toLowerCase() === email)) {
      throw new Error("This email is already registered. Please log in instead.");
    }

    const { data: codeRow, error: codeErr } = await supabaseAdmin.rpc("generate_member_code", {
      _plan: data.planId,
    });
    if (codeErr || !codeRow) throw new Error(`Could not generate member code: ${codeErr?.message ?? "unknown"}`);
    const memberCode = codeRow as unknown as string;

    const { error: insErr } = await supabaseAdmin.from("members").insert({
      member_code: memberCode,
      full_name: data.fullName,
      parent_name: data.parentName || null,
      mobile: data.mobile,
      alt_mobile: data.altMobile || null,
      email: data.email,
      alt_email: data.altEmail || null,
      address: data.address,
      country: data.country,
      state: data.state,
      district: data.district,
      town: data.town,
      plan_id: data.planId,
      amount_inr: 0,
      expires_at: null,
      status: "pending",
    });
    if (insErr) throw new Error(`Could not submit registration: ${insErr.message}`);

    return { submitted: true, memberCode };
  });

export const getMyMember = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("members")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as unknown as MemberRow | null;
  });

export const getAllMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: rerr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (rerr) throw new Error(rerr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("members")
      .select("*")
      .order("joined_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as MemberRow[];
  });

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const roles = (data ?? []).map((r) => r.role);
    return { isAdmin: roles.includes("admin"), roles };
  });

function generateTempPassword(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 10);
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Forbidden");
}

export const approveMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ memberId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: member, error: getErr } = await supabaseAdmin
      .from("members")
      .select("*")
      .eq("id", data.memberId)
      .maybeSingle();
    if (getErr || !member) throw new Error("Member not found");
    if (member.status === "approved") throw new Error("Member is already approved");

    const planId = member.plan_id as PlanId;
    const isLifetime = planDuration(planId) === "lifetime";
    const amountInr = PLAN_PRICES_INR[planId] ?? 0;
    const tempPassword = generateTempPassword();

    // Create auth user
    const { data: created, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email: member.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: member.full_name,
        member_code: member.member_code,
        must_change_password: true,
      },
    });
    if (userErr || !created.user) {
      throw new Error(
        userErr?.message?.includes("already")
          ? "An account with this email already exists."
          : `Could not create account: ${userErr?.message ?? "unknown"}`,
      );
    }
    const userId = created.user.id;

    const expiresAt = isLifetime
      ? null
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const { error: updErr } = await supabaseAdmin
      .from("members")
      .update({
        user_id: userId,
        status: "approved",
        amount_inr: amountInr,
        expires_at: expiresAt,
      })
      .eq("id", data.memberId);
    if (updErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      throw new Error(`Could not update member: ${updErr.message}`);
    }

    await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "member" })
      .then(() => undefined, () => undefined);

    // Send welcome email (best-effort)
    try {
      const [{ render }, React, { template: welcomeTpl }] = await Promise.all([
        import("@react-email/components"),
        import("react"),
        import("@/lib/email-templates/membership-welcome"),
      ]);

      const origin = "https://bharat-digital-roots.lovable.app";
      const templateData = {
        fullName: member.full_name,
        memberCode: member.member_code,
        email: member.email,
        tempPassword,
        planName: planName(planId),
        amountInr,
        razorpayPaymentId: "",
        razorpayOrderId: "",
        expiresAt: expiresAt ?? "",
        loginUrl: `${origin}/login`,
      };
      const element = React.createElement(welcomeTpl.component, templateData);
      const html = await render(element);
      const plainText = await render(element, { plainText: true });
      const subject =
        typeof welcomeTpl.subject === "function" ? welcomeTpl.subject(templateData) : welcomeTpl.subject;

      const lovableApiKey = process.env.LOVABLE_API_KEY;
      const resendApiKey = process.env.RESEND_API_KEY;
      if (lovableApiKey && resendApiKey) {
        await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableApiKey}`,
            "X-Connection-Api-Key": resendApiKey,
          },
          body: JSON.stringify({
            from: "Feathers Community Forum <noreply@evian-flow-commerce.com>",
            to: [member.email],
            subject,
            html,
            text: plainText,
          }),
        });
      }
    } catch (err) {
      console.error("Failed to send approval email:", err);
    }

    const { logAudit } = await import("@/lib/audit.server");
    void logAudit(supabaseAdmin, {
      actorId: context.userId,
      action: "member.approve",
      targetType: "members",
      targetId: data.memberId,
      detail: { email: member.email, planId, amountInr },
    });

    return { approved: true, email: member.email, tempPassword };
  });

export const assignMemberBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ memberId: z.string().uuid(), unitId: z.string().uuid().nullable() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("members")
      .update({ branch_unit_id: data.unitId })
      .eq("id", data.memberId);
    if (error) throw new Error(error.message);

    const { logAudit } = await import("@/lib/audit.server");
    void logAudit(supabaseAdmin, {
      actorId: context.userId,
      action: "member.assign_branch",
      targetType: "members",
      targetId: data.memberId,
      detail: { unitId: data.unitId },
    });

    return { ok: true };
  });

export const rejectMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ memberId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("members")
      .update({ status: "rejected" })
      .eq("id", data.memberId);
    if (error) throw new Error(error.message);

    const { logAudit } = await import("@/lib/audit.server");
    void logAudit(supabaseAdmin, {
      actorId: context.userId,
      action: "member.reject",
      targetType: "members",
      targetId: data.memberId,
    });

    return { rejected: true };
  });
