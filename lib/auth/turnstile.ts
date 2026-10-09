import { env } from "@/lib/env";

export async function verifyTurnstile(token: unknown, action: string, ip: string | null, required = false): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return !required && !env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) return false;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json() as { success?: boolean; hostname?: string; action?: string };
    return response.ok && result.success === true && result.hostname === new URL(env.NEXT_PUBLIC_APP_URL).hostname && result.action === action;
  } catch { return false; }
}
