import { z } from "zod";
import { loadAuthUser, resolveActiveOrg } from "@/lib/auth/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail } from "@/lib/api/wrappers";
import { avatarPathOwnedBy, AVATAR_BUCKET } from "@/lib/profile/avatars";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const parsed = z
    .string()
    .uuid()
    .safeParse((await params).userId);
  if (!parsed.success) return fail("invalid_request", "Imagem não encontrada.", 400);
  const user = await loadAuthUser();
  if (!user) return fail("unauthenticated", "Entre na sua conta.", 401);
  const db = createAdminClient();
  if (parsed.data !== user.id) {
    const org = await resolveActiveOrg(user);
    if (!org) return fail("not_found", "Imagem não encontrada.", 404);
    const { data } = await db
      .from("user_organizations")
      .select("id")
      .eq("organization_id", org.orgId)
      .eq("user_id", parsed.data)
      .is("revoked_at", null)
      .not("accepted_at", "is", null)
      .maybeSingle();
    if (!data) return fail("not_found", "Imagem não encontrada.", 404);
  }
  const { data: owner } = await db.auth.admin.getUserById(parsed.data);
  const path = owner.user?.user_metadata?.avatar_storage_path;
  if (!avatarPathOwnedBy(path, parsed.data))
    return fail("not_found", "Imagem não encontrada.", 404);
  const { data: file } = await db.storage.from(AVATAR_BUCKET).download(path);
  if (!file) return fail("not_found", "Imagem não encontrada.", 404);
  // Resposta binária: ok() é JSON. Esta é a mesma exceção das rotas de mídia.
  return new Response(file, {
    headers: {
      "Content-Type": file.type,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
