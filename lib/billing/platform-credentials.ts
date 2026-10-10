import type pg from "pg";
import { createAdminClient } from "@/lib/supabase/admin";
import { byteaToBuffer, decryptKey } from "@/lib/crypto/aes_gcm";
import type { LlmEdgeConfig } from "@/lib/agent-engine/edge/llm/credentials";
import { platformKey, CommercialAiError } from "./managed-ai";

/** A chave global fica cifrada; somente o servidor resolve seu conteúdo. */
export async function platformKeyPg(
  db: Pick<pg.Pool, "query">,
  provider: string,
  cfg: LlmEdgeConfig,
) {
  const { rows } = await db.query<{ ciphertext: Buffer; iv: Buffer; tag: Buffer }>(
    "select ciphertext,iv,tag from platform_ai_credentials where provider=$1",
    [provider],
  );
  if (!rows[0]) return platformKey(provider, cfg);
  try {
    return decryptKey(rows[0]);
  } catch {
    throw new CommercialAiError("ai_platform_credential_unavailable");
  }
}

export async function platformKeyServer(provider: string, cfg: LlmEdgeConfig) {
  const { data, error } = await createAdminClient()
    .from("platform_ai_credentials")
    .select("ciphertext,iv,tag")
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new CommercialAiError("ai_platform_credential_unavailable");
  if (!data) return platformKey(provider, cfg);
  try {
    return decryptKey({
      ciphertext: byteaToBuffer(data.ciphertext),
      iv: byteaToBuffer(data.iv),
      tag: byteaToBuffer(data.tag),
    });
  } catch {
    throw new CommercialAiError("ai_platform_credential_unavailable");
  }
}
