import { requireSupportWrite } from "@/lib/impersonate/support";
import { createTenantSchema } from "@/lib/schemas/tenant-creation";
import { issueInvite } from "@/lib/auth/issue-invite";
import { mfaEmDivida } from "@/lib/auth/server";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { createHash, randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const querySchema = z.object({
  q: z.string().max(120).optional(),
  status: z.enum(["active", "suspended", "onboarding", "redacted"]).optional(),
  commercial_state: z
    .enum(["pending", "trial", "active", "expired", "suspended", "legacy"])
    .optional(),
  origin: z.enum(["self_service", "manual", "unknown"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

// ---------------------------------------------------------------------------
// Cursor helpers
// ---------------------------------------------------------------------------

interface CursorPayload {
  created_at: string;
  id: string;
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeCursor(cursor: string): CursorPayload | null {
  try {
    return z
      .object({ created_at: z.string().datetime(), id: z.string().uuid() })
      .parse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8")));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// GET /api/v1/admin/tenants
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const requestId = randomUUID();

  let adminCtx: Awaited<ReturnType<typeof requirePlatformAdmin>>;
  try {
    adminCtx = await requirePlatformAdmin();
  } catch {
    return fail("forbidden", "Platform admin required", 403, { requestId });
  }

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  if (!parsed.success) {
    return fail("validation_error", "Invalid query params", 400, {
      requestId,
      details: parsed.error.flatten(),
    });
  }

  const { q, status, commercial_state, origin, cursor, limit } = parsed.data;
  const admin = createAdminClient();
  const cursorPayload = cursor ? decodeCursor(cursor) : null;
  if (cursor && !cursorPayload)
    return fail("invalid_cursor", "Página inválida.", 400, { requestId });
  const search = q?.replace(/[,%().]/g, " ").trim();
  let countQuery = admin
    .from("organizations")
    .select(
      commercial_state ? "id,ai_account:organization_ai_accounts!inner(organization_id)" : "id",
      { count: "exact", head: true },
    );

  let query = admin
    .from("organizations")
    .select(
      `
      id,
      slug,
      display_name,
      legal_name,
      cnpj,
      status,
      onboarded_at,
      suspended_at,
      created_at,
      signup_origin,
      ai_account:organization_ai_accounts${commercial_state ? "!inner" : ""}(mode,state,access_until,monthly_remaining,extra_remaining),
      user_count:user_organizations(count),
      conversations_count:conversations(count)
    `,
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (origin) {
    if (origin === "unknown") {
      query = query.is("signup_origin", null);
      countQuery = countQuery.is("signup_origin", null);
    } else {
      query = query.eq("signup_origin", origin);
      countQuery = countQuery.eq("signup_origin", origin);
    }
  }
  if (commercial_state) {
    if (commercial_state === "legacy") {
      query = query.eq("ai_account.mode", "legacy");
      countQuery = countQuery.eq("ai_account.mode", "legacy");
    } else {
      query = query.eq("ai_account.mode", "platform");
      countQuery = countQuery.eq("ai_account.mode", "platform");
      const now = new Date().toISOString();
      if (commercial_state === "expired") {
        const filter = `state.eq.expired,and(state.in.(trial,active),access_until.lte.${now})`;
        query = query.or(filter, { referencedTable: "ai_account" });
        countQuery = countQuery.or(filter, { referencedTable: "ai_account" });
      } else {
        query = query.eq("ai_account.state", commercial_state);
        countQuery = countQuery.eq("ai_account.state", commercial_state);
        if (["trial", "active"].includes(commercial_state)) {
          query = query.gt("ai_account.access_until", now);
          countQuery = countQuery.gt("ai_account.access_until", now);
        }
      }
    }
  }

  if (status === "onboarding") {
    // Estado derivado: ativo no banco, onboarding ainda não concluído.
    query = query.eq("status", "active").is("onboarded_at", null);
    countQuery = countQuery.eq("status", "active").is("onboarded_at", null);
  } else if (status) {
    query = query.eq("status", status);
    countQuery = countQuery.eq("status", status);
  }

  if (search) {
    query = query.or(
      `display_name.ilike.%${search}%,slug.ilike.%${search}%,cnpj.ilike.%${search}%`,
    );
    countQuery = countQuery.or(
      `display_name.ilike.%${search}%,slug.ilike.%${search}%,cnpj.ilike.%${search}%`,
    );
  }

  if (cursorPayload) {
    query = query.or(
      `created_at.lt.${cursorPayload.created_at},and(created_at.eq.${cursorPayload.created_at},id.lt.${cursorPayload.id})`,
    );
  }

  const [{ data, error }, counted] = await Promise.all([query, countQuery]);

  if (error || counted.error) {
    return fail("internal_error", "Query failed", 500, {
      requestId,
      details: error?.message ?? counted.error?.message,
    });
  }

  const rows = data ?? [];
  const has_more = rows.length > limit;
  const page = has_more ? rows.slice(0, limit) : rows;

  const lastRow = page.at(-1);
  const nextCursor =
    has_more && lastRow
      ? encodeCursor({
          created_at: (lastRow as { created_at: string }).created_at,
          id: lastRow.id,
        })
      : null;

  void audit({
    action: "platform_admin.tenants_listed",
    actorUserId: adminCtx.user.id,
    actingAsPlatformAdmin: true,
    bypassedRls: true,
    requestId,
    metadata: {
      filters: {
        status: status ?? null,
        commercial_state: commercial_state ?? null,
        origin: origin ?? null,
        has_q: !!q,
      },
      result_count: page.length,
    },
  });

  return ok(page, {
    requestId,
    meta: { has_more, cursor: nextCursor, total: counted.count },
  });
}

// ---------------------------------------------------------------------------
// POST /api/v1/admin/tenants
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();

  let adminCtx: Awaited<ReturnType<typeof requirePlatformAdmin>>;
  try {
    adminCtx = await requirePlatformAdmin();
  } catch {
    return fail("forbidden", "Platform admin required", 403, { requestId });
  }

  if (adminCtx.platformAdmin.scope !== "full") {
    return fail("forbidden", "Seu acesso de suporte não permite criar organizações", 403, {
      requestId,
    });
  }
  if (await mfaEmDivida())
    return fail("mfa_required", "Confirme a verificação em duas etapas", 403, { requestId });
  const key = req.headers.get("Idempotency-Key") ?? randomUUID();
  if (!z.string().uuid().safeParse(key).success) {
    return fail("validation_error", "Idempotency-Key deve ser UUID", 400, { requestId });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("validation_error", "Invalid JSON body", 400, { requestId });
  }

  const parsed = createTenantSchema.safeParse(body);
  if (!parsed.success) {
    return fail("validation_error", "Invalid request body", 400, {
      requestId,
      details: parsed.error.flatten(),
    });
  }

  const admin = createAdminClient();
  const request = { ...parsed.data, owner_email: parsed.data.owner_email.trim().toLowerCase() };
  const { data: org, error } = await admin.rpc("fn_create_tenant_with_owner", {
    p_actor: adminCtx.user.id,
    p_key: key,
    p_request: request,
    p_hash: createHash("sha256").update(JSON.stringify(request)).digest("hex"),
  });
  if (error) {
    if (error.code === "23505" || error.code === "22023") {
      return fail("conflict", "Slug já existe ou a chave foi usada com outros dados", 409, {
        requestId,
      });
    }
    return fail("internal_error", "Não foi possível criar a organização", 500, { requestId });
  }
  if (org.created) {
    await audit({
      action: "tenant.created_by_platform_admin",
      actorUserId: adminCtx.user.id,
      actingAsPlatformAdmin: true,
      bypassedRls: true,
      organizationId: org.id,
      resourceType: "organization",
      resourceId: org.id,
      requestId,
      metadata: {
        slug: org.slug,
        display_name: org.display_name,
        plan: request.plan,
        creator_role: "admin",
      },
    });
  }
  const ownerInvitation =
    request.owner_email === adminCtx.user.email?.trim().toLowerCase()
      ? null
      : await issueInvite({
          email: request.owner_email,
          role: "admin",
          interfaceSettings: request.owner_interface_settings,
          organizationId: org.id,
          orgName: org.display_name,
          inviterId: adminCtx.user.id,
          inviterName:
            adminCtx.user.user_metadata?.full_name ?? adminCtx.user.email ?? "Administrador",
          requestId,
          inviteId: org.invite_id,
          issuedAt: org.issued_at,
          dispatch: org.created,
        });
  return ok(
    {
      id: org.id,
      slug: org.slug,
      display_name: org.display_name,
      owner_invitation: ownerInvitation,
    },
    { status: 201, requestId },
  );
}
