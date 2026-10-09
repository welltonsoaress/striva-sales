import { requireRole } from "./require-role";
import { mfaEmDivida } from "./server";
import { createClient } from "@/lib/supabase/server";
import { fail } from "@/lib/api/wrappers";

/** Credenciais e conexão de IA são operadas somente pela plataforma, inclusive no legado. */
export async function requireAiPlatformAdmin() {
  const auth = await requireRole("admin", { allowPlatformAdmin: true, resource: "ai_credentials" });
  if (!auth.ok) return auth;
  if (auth.user.support || !auth.user.is_platform_admin)
    return {
      ok: false as const,
      response: fail("forbidden", "A conexão de IA é administrada pela plataforma.", 403),
    };
  const db = await createClient();
  const { data, error } = await db
    .from("platform_admins")
    .select("scope,mfa_required")
    .eq("user_id", auth.user.id)
    .is("revoked_at", null)
    .maybeSingle();
  if (error || data?.scope !== "full")
    return {
      ok: false as const,
      response: fail(
        "forbidden",
        "Somente a administração completa da plataforma pode alterar a conexão de IA.",
        403,
      ),
    };
  if (await mfaEmDivida())
    return {
      ok: false as const,
      response: fail("mfa_required", "Confirme a verificação em duas etapas.", 403),
    };
  if (data.mfa_required) {
    const { data: assurance } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance?.currentLevel !== "aal2")
      return {
        ok: false as const,
        response: fail("mfa_required", "Confirme a verificação em duas etapas.", 403),
      };
  }
  return auth;
}
