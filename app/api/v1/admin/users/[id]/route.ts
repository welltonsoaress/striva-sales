import { type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { randomUUID } from "node:crypto";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { z } from "zod";
import { requireAdminMutation } from "@/lib/auth/admin-mutation";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const support = await requireSupportWrite();
  if (support) return support;
  const { id } = await params;
  const parsed = z
    .object({
      full_name: z.string().trim().min(2).max(120).optional(),
      organization_id: z.uuid().optional(),
      role: z.enum(["admin", "manager", "agent", "viewer"]).optional(),
    })
    .refine(
      (d) =>
        (!!d.full_name || (!!d.organization_id && !!d.role)) && !!d.organization_id === !!d.role,
    )
    .safeParse(await req.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !parsed.success)
    return fail("validation_failed", "Confira o nome e o papel de acesso.", 422);
  const auth = await requireAdminMutation();
  if (!auth.ok) return auth.response;
  const db = createAdminClient();
  if (parsed.data.organization_id && parsed.data.role) {
    const { error } = await db.rpc("fn_admin_manage_user_access", {
      p_actor: auth.user.id,
      p_user: id,
      p_org: parsed.data.organization_id,
      p_role: parsed.data.role,
      p_revoke: false,
    });
    if (error)
      return fail(
        "conflict",
        "Não foi possível alterar o acesso. Preserve um administrador ativo em cada empresa.",
        409,
      );
  }
  if (parsed.data.full_name) {
    const { error } = await db.auth.admin.updateUserById(id, {
      user_metadata: { full_name: parsed.data.full_name },
    });
    if (error) return fail("unavailable", "Não foi possível salvar o nome.", 503);
    await audit({
      action: "platform_admin.user_updated",
      actorUserId: auth.user.id,
      actingAsPlatformAdmin: true,
      bypassedRls: true,
      resourceType: "user",
      resourceId: id,
      metadata: { fields: ["full_name"] },
    });
  }
  return ok({ updated: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const support = await requireSupportWrite();
  if (support) return support;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return fail("validation_failed", "Usuário inválido.", 422);
  const auth = await requireAdminMutation();
  if (!auth.ok) return auth.response;
  const db = createAdminClient();
  const { error } = await db.rpc("fn_admin_manage_user_access", {
    p_actor: auth.user.id,
    p_user: id,
    p_org: null,
    p_role: null,
    p_revoke: true,
  });
  if (error)
    return fail(
      "conflict",
      "Não é possível excluir a própria conta, um administrador da plataforma ou o último administrador de uma empresa.",
      409,
    );
  const removed = await db.auth.admin.deleteUser(id, true);
  if (removed.error)
    return fail(
      "unavailable",
      "O acesso foi revogado, mas a exclusão da conta não terminou. Tente excluir novamente.",
      503,
    );
  await audit({
    action: "platform_admin.user_deleted",
    actorUserId: auth.user.id,
    actingAsPlatformAdmin: true,
    bypassedRls: true,
    resourceType: "user",
    resourceId: id,
    metadata: { soft_deleted: true },
  });
  return ok({ deleted: true });
}

// ---------------------------------------------------------------------------
// GET /api/v1/admin/users/[id]
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = randomUUID();
  const { id } = await params;

  let adminCtx: Awaited<ReturnType<typeof requirePlatformAdmin>>;
  try {
    adminCtx = await requirePlatformAdmin();
  } catch {
    return fail("forbidden", "Platform admin required", 403, { requestId });
  }

  const admin = createAdminClient();

  // Load auth user via admin auth API
  const { data: authUserData, error: authError } = await admin.auth.admin.getUserById(id);

  if (authError || !authUserData?.user) {
    return fail("not_found", "User not found", 404, { requestId });
  }

  const authUser = authUserData.user;

  // Load memberships (user_organizations + organizations join)
  const { data: memberships, error: membershipError } = await admin
    .from("user_organizations")
    .select(
      `
      organization_id,
      role,
      accepted_at,
      revoked_at,
      organizations(display_name, slug)
    `,
    )
    .eq("user_id", id)
    .order("accepted_at", { ascending: false });

  if (membershipError) {
    return fail("internal_error", "Membership query failed", 500, {
      requestId,
      details: membershipError.message,
    });
  }

  type RawMembership = {
    organization_id: string;
    role: string;
    accepted_at: string | null;
    revoked_at: string | null;
    organizations: { display_name: string; slug: string } | null;
  };

  const formattedMemberships = ((memberships ?? []) as unknown as RawMembership[]).map((m) => ({
    organization_id: m.organization_id,
    tenant_name: m.organizations?.display_name ?? null,
    tenant_slug: m.organizations?.slug ?? null,
    role: m.role,
    accepted_at: m.accepted_at,
    revoked_at: m.revoked_at,
  }));

  // Load recent audit entries where actor_user_id = id (LIMIT 50)
  const { data: recentAudit, error: auditError } = await admin
    .from("api_audit_log")
    .select("id, action, organization_id, resource_type, resource_id, created_at, metadata")
    .eq("actor_user_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (auditError) {
    // Non-fatal: return empty array and continue
  }

  const userMeta = authUser.user_metadata as Record<string, unknown> | null;

  const userPayload = {
    id: authUser.id,
    email: authUser.email ?? null,
    full_name: (userMeta?.full_name as string | undefined) ?? null,
    phone: authUser.phone ?? null,
    last_sign_in_at: authUser.last_sign_in_at ?? null,
    created_at: authUser.created_at,
    email_confirmed_at: authUser.email_confirmed_at ?? null,
    factors: (authUser.factors ?? []).map((f) => ({
      id: f.id,
      type: f.factor_type,
      status: f.status,
    })),
  };

  void audit({
    action: "platform_admin.user_viewed",
    actorUserId: adminCtx.user.id,
    actingAsPlatformAdmin: true,
    bypassedRls: true,
    resourceType: "user",
    resourceId: id,
    requestId,
    metadata: {
      email_hash: authUser.email
        ? Buffer.from(authUser.email.toLowerCase()).toString("hex").slice(0, 12) + "..."
        : null,
    },
  });

  return ok(
    {
      user: userPayload,
      memberships: formattedMemberships,
      recent_audit: recentAudit ?? [],
    },
    { requestId },
  );
}
