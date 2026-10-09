import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { sameRequestOrigin } from "@/lib/api/request-origin";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";

export async function PATCH(request: Request) {
  const denied = await requireSupportWrite(undefined, { commercialExempt: true });
  if (denied) return denied;
  if (!sameRequestOrigin(request, env.NEXT_PUBLIC_APP_URL)) return fail("forbidden", "Origem inválida.", 403);
  const auth = await requireRole("viewer");
  if (!auth.ok) return auth.response;
  if (auth.user.support) return fail("forbidden", "Esta preferência pertence ao usuário da empresa.", 403);
  const parsed = z.object({ preset: z.enum(["simplificada", "completa"]) }).strict()
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("validation_failed", "Confira o modo de navegação.", 422);
  const { data, error } = await createAdminClient().from("user_organizations")
    .update({ interface_settings: parsed.data }).eq("organization_id", auth.org.orgId)
    .eq("user_id", auth.user.id).is("revoked_at", null).not("accepted_at", "is", null)
    .select("user_id").maybeSingle();
  if (error) return fail("unavailable", "Não foi possível salvar sua preferência.", 503);
  if (!data) return fail("not_found", "Vínculo ativo não encontrado.", 404);
  await audit({ action: "team.interface_changed", actorUserId: auth.user.id, organizationId: auth.org.orgId,
    resourceType: "user_organization", resourceId: auth.user.id, metadata: { preset: parsed.data.preset, self_service: true } });
  return ok({ interface_settings: parsed.data });
}
