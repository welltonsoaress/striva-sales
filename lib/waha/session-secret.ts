import type { SupabaseClient } from "@supabase/supabase-js";

import { decryptWebhookSecret } from "@/lib/webhooks/secrets";

/** Sessões legadas têm um byte zero, não uma cifra OpenPGP. Não enviar esse
 * marcador ao RPC evita um 500 a cada webhook; a autenticação continua
 * resolvendo o segredo da instalação e exigindo a assinatura conforme sua regra. */
export async function loadWahaSessionSecret(
  admin: SupabaseClient,
  ciphertext: string | null,
): Promise<string | null> {
  if (!ciphertext || ciphertext === "\\x00" || ciphertext === "00") return null;
  try {
    return await decryptWebhookSecret(admin, ciphertext);
  } catch {
    // O caller revalida a assinatura; falha de decrypt nunca equivale a válida.
    return null;
  }
}
