import { z } from "zod";

export const CHECKOUT_COOKIE = "commercial_checkout_reference";

/** Preferência de navegação; nunca autoriza empresa, pagamento ou acesso. */
export function selectedPlanHint(value: unknown): string | undefined {
  return z.string().uuid().safeParse(value).success ? value as string : undefined;
}

export function planHintFromDestination(value: string | undefined): string | undefined {
  if (!value?.startsWith("/app/settings/billing?")) return undefined;
  return selectedPlanHint(new URL(value, "https://navigation.invalid").searchParams.get("plan"));
}

export function subscriptionPaywallRequired(
  account: { mode: string; state: string; access_until: string | null; monthly_remaining?: number; extra_remaining?: number; credit_meter?: string } | null,
  now = Date.now(),
): boolean {
  if (!account || account.mode !== "platform" || account.state === "pending" || account.state === "suspended") return false;
  if (account.state === "trial" && account.monthly_remaining !== undefined && account.monthly_remaining < (account.credit_meter === "message_v1" ? 1 : 10)) return true;
  return account.state === "expired" || (["trial", "active"].includes(account.state) &&
    !!account.access_until && Date.parse(account.access_until) <= now);
}
