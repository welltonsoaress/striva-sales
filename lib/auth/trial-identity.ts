import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/** Comparadores protegidos e separados por finalidade; não guardar telefone/IP bruto. */
export function trialHash(kind: string, value: string): string {
  if (!env.INTERNAL_SECRET) throw new Error("trial_identity_secret_missing");
  return createHmac("sha256", env.INTERNAL_SECRET).update(`${kind}:${value.trim().toLowerCase()}`).digest("hex");
}
export async function deviceIdentity(): Promise<string> {
  const jar = await cookies();
  const signed = jar.get("app_device")?.value ?? "";
  const [id, signature] = signed.split(".");
  if (id && signature && /^[a-f0-9-]{36}$/.test(id)) {
    const expected = Buffer.from(trialHash("device_cookie", id)), actual = Buffer.from(signature);
    if (expected.length === actual.length && timingSafeEqual(expected, actual)) return trialHash("device", id);
  }
  const created = randomUUID();
  jar.set("app_device", `${created}.${trialHash("device_cookie", created)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 365 * 86400 });
  return trialHash("device", created);
}
