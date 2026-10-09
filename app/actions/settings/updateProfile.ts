"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import {
  profileSchema,
  SEM_PREFERENCIA_DE_IDIOMA,
  type ProfileInput,
} from "@/lib/schemas/settings";
import { resolveActiveOrg, loadAuthUser } from "@/lib/auth/server";
import { AVATAR_BUCKET, avatarPathOwnedBy, AVATAR_URLS } from "@/lib/profile/avatars";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export type UpdateProfileResult = { ok: true } | { ok: false; error: string; details?: unknown };

export async function updateProfile(input: ProfileInput): Promise<UpdateProfileResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation_failed", details: parsed.error.flatten() };
  }

  const authUser = await loadAuthUser();
  if (!authUser) return { ok: false, error: "unauthenticated" };
  if (authUser.support) return { ok: false, error: "forbidden" };

  const supabase = await createClient();
  const hdrs = await headers();
  const requestId = hdrs.get("x-request-id");
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = hdrs.get("user-agent") ?? null;

  const resetAvatar =
    parsed.data.avatar_url == null || AVATAR_URLS.includes(parsed.data.avatar_url);
  const previous = resetAvatar
    ? (await supabase.auth.getUser()).data.user?.user_metadata?.avatar_storage_path
    : null;
  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: parsed.data.full_name ?? null,
      // `null` é o que faz a cadeia seguir para a organização: o resolvedor
      // de idioma lê a preferência primeiro e só cai na empresa se ela faltar.
      locale: parsed.data.locale === SEM_PREFERENCIA_DE_IDIOMA ? null : parsed.data.locale,
      timezone: parsed.data.timezone,
      avatar_url: parsed.data.avatar_url ?? null,
      ...(resetAvatar ? { avatar_storage_path: null } : {}),
    },
  });
  if (error) {
    return { ok: false, error: error.message };
  }

  const activeOrg = await resolveActiveOrg(authUser);
  if (resetAvatar && avatarPathOwnedBy(previous, authUser.id)) {
    const { error: cleanup } = await createAdminClient()
      .storage.from(AVATAR_BUCKET)
      .remove([previous]);
    if (cleanup) logger.warn("avatar_cleanup_failed", { user_id: authUser.id });
  }

  await audit({
    action: "profile.updated",
    actorUserId: authUser.id,
    organizationId: activeOrg?.orgId ?? null,
    resourceType: "user",
    resourceId: authUser.id,
    requestId,
    ip,
    userAgent,
    metadata: {
      locale: parsed.data.locale,
      timezone: parsed.data.timezone,
    },
  });

  // Best-effort emit (event_log is org-scoped; skip if no org).
  if (activeOrg) {
    await supabase
      .rpc("emit_event", {
        p_event_type: "user.profile_updated",
        p_entity_kind: "user",
        p_entity_id: authUser.id,
        p_payload: { user_id: authUser.id },
        p_metadata: { request_id: requestId },
        p_organization_id: activeOrg.orgId,
      })
      .then(({ error: e }) => {
        if (e) logger.warn("profile_event_emit_failed", { user_id: authUser.id });
      });
  }

  revalidatePath("/app", "layout");
  return { ok: true };
}
