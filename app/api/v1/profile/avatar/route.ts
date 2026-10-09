import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { loadAuthUser, resolveActiveOrg, mfaEmDivida } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";
import { farejarTipo, extensaoDe } from "@/lib/branding/logo-arquivo";
import { avatarPathOwnedBy, AVATAR_BUCKET, MAX_AVATAR_BYTES } from "@/lib/profile/avatars";
import { logger } from "@/lib/logger";
import { sameRequestOrigin } from "@/lib/api/request-origin";
import { checkRateLimit } from "@/lib/ai/dispatcher/rate-limit";
import { requireSupportWrite } from "@/lib/impersonate/support";

export async function POST(request: Request) {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  const user = await loadAuthUser();
  if (!user) return fail("unauthenticated", "Entre na sua conta para enviar a foto.", 401);
  if (user.support || (await mfaEmDivida()))
    return fail("forbidden_role", "Confirme sua sessão pessoal antes de alterar o perfil.", 403);
  if (!sameRequestOrigin(request, env.NEXT_PUBLIC_APP_URL))
    return fail("forbidden_role", "Origem do envio inválida.", 403);
  if (Number(request.headers.get("content-length")) > MAX_AVATAR_BYTES + 16384)
    return fail("validation_failed", "Use uma imagem PNG ou JPG de até 512 KB.", 422);
  if (!(await checkRateLimit(`avatar:${user.id}`, 10, 60)).allowed)
    return fail("rate_limited", "Aguarde antes de enviar outra foto.", 429);
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_AVATAR_BYTES)
      return fail("validation_failed", "Use uma imagem PNG ou JPG de até 512 KB.", 422);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const tipo = farejarTipo(bytes);
    if (!tipo) return fail("validation_failed", "Envie uma imagem PNG ou JPG válida.", 422);
    const db = createAdminClient();
    const path = `${user.id}/${randomUUID()}.${extensaoDe(tipo)}`;
    const { error: uploadError } = await db.storage
      .from(AVATAR_BUCKET)
      .upload(path, bytes, { contentType: tipo });
    if (uploadError)
      return fail(
        "internal_error",
        "Não foi possível guardar sua foto. A equipe pode conferir a configuração do armazenamento.",
        500,
      );
    const client = await createClient();
    const { data: auth } = await client.auth.getUser();
    const previous = auth.user?.user_metadata?.avatar_storage_path;
    const avatarUrl = `${env.NEXT_PUBLIC_APP_URL}/api/v1/profile/avatar/${user.id}?v=${randomUUID()}`;
    const { error } = await client.auth.updateUser({
      data: { avatar_url: avatarUrl, avatar_storage_path: path },
    });
    if (error) {
      await db.storage.from(AVATAR_BUCKET).remove([path]);
      return fail("internal_error", "Não foi possível atualizar sua foto.", 500);
    }
    if (avatarPathOwnedBy(previous, user.id)) {
      const { error: cleanup } = await db.storage.from(AVATAR_BUCKET).remove([previous]);
      if (cleanup) logger.warn("avatar_cleanup_failed", { user_id: user.id });
    }
    const org = await resolveActiveOrg(user);
    await audit({
      action: "profile.avatar_updated",
      actorUserId: user.id,
      organizationId: org?.orgId ?? null,
      resourceType: "user",
      resourceId: user.id,
    });
    revalidatePath("/app", "layout");
    return ok({ avatar_url: avatarUrl });
  } catch {
    logger.warn("avatar_upload_failed");
    return fail("invalid_request", "Não foi possível ler a imagem enviada.", 400);
  }
}
