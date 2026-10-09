"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { loadOnboardingState, patchOnboardingState, requireOnboardingCtx } from "./_shared";

export async function dismissOnboarding(): Promise<{ ok: false; error: string }> {
  try {
    const ctx = await requireOnboardingCtx();
    const { state } = await loadOnboardingState(ctx.orgId);
    if (!state.dismissed_at) {
      await patchOnboardingState(ctx.orgId, { dismissed_at: new Date().toISOString() });
      await audit({
        action: "onboarding.deferred",
        actorUserId: ctx.userId,
        organizationId: ctx.orgId,
      });
    }
  } catch {
    logger.warn("onboarding_defer_failed");
    return { ok: false, error: "Não foi possível guardar seu progresso. Tente novamente." };
  }
  revalidatePath("/app", "layout");
  redirect("/app/inicio");
}
