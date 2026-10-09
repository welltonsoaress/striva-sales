"use server";

/**
 * Server Action: finalize onboarding — stamps `onboarded_at`, audits, and
 * emits the `tenant.onboarded` domain event. Idempotent: only fires the
 * event the first time `onboarded_at` flips from NULL.
 */
import { redirect } from "next/navigation";

import { audit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOnboardingCtx, OnboardingError } from "./_shared";

export type FinishOnboardingResult =
  | { ok: true; alreadyOnboarded: boolean }
  | { ok: false; error: "auth_required" | "no_active_org" | "db_error" | "activation_required"; details?: unknown };

export async function finishOnboarding(): Promise<FinishOnboardingResult> {
  let ctx;
  try {
    ctx = await requireOnboardingCtx();
  } catch (err) {
    if (err instanceof OnboardingError) return { ok: false, error: err.code as never };
    throw err;
  }

  const admin = createAdminClient();
  const { data: account, error: accountError } = await admin.from("organization_ai_accounts").select("mode,state").eq("organization_id",ctx.orgId).maybeSingle();
  if(accountError)return {ok:false,error:"db_error"};
  if(account?.mode==='platform'&&account.state==='pending')return {ok:false,error:'activation_required'};

  const { data: existing } = await admin
    .from("organizations")
    .select("onboarded_at")
    .eq("id", ctx.orgId)
    .maybeSingle();

  const alreadyOnboarded = Boolean(existing?.onboarded_at);

  if (!alreadyOnboarded) {
    const { error } = await admin
      .from("organizations")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("id", ctx.orgId)
      .is("onboarded_at", null);
    if (error) return { ok: false, error: "db_error", details: error.message };

    await admin.from("event_log").insert({
      organization_id: ctx.orgId,
      event_type: "tenant.onboarded",
      payload: { completed_by: ctx.userId },
    });

    await audit({
      action: "onboarding.completed",
      actorUserId: ctx.userId,
      organizationId: ctx.orgId,
    });
    await audit({
      action: "tenant.onboarded",
      actorUserId: ctx.userId,
      organizationId: ctx.orgId,
    });
  }

  redirect("/app/inicio");
}
