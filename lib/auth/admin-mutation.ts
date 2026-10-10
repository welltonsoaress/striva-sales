import { requirePlatformAdmin } from "./requirePlatformAdmin";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { mfaEmDivida } from "./server";
import { fail } from "@/lib/api/wrappers";

export async function requireAdminMutation() {
  const support = await requireSupportWrite();
  if (support) return { ok: false as const, response: support };
  try {
    const ctx = await requirePlatformAdmin();
    if (ctx.platformAdmin.scope !== "full")
      return {
        ok: false as const,
        response: fail("forbidden", "Seu acesso permite somente leitura.", 403),
      };
    if (await mfaEmDivida())
      return {
        ok: false as const,
        response: fail("mfa_required", "Confirme a verificação em duas etapas.", 403),
      };
    return { ok: true as const, ...ctx };
  } catch {
    return {
      ok: false as const,
      response: fail("forbidden", "A administração da plataforma é necessária.", 403),
    };
  }
}
