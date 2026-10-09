import type { Pool } from "pg";
import {
  hotmartEnvelopeSchema,
  parseHotmartCancellation,
  parseHotmartPurchase,
  validHotmartToken,
} from "./hotmart";
import { processHotmartPurchase } from "./process-hotmart";
import { processHotmartCancellation } from "./process-hotmart-cancellation";

type Receiver = {
  hottok: string;
  pool: () => Pool;
  rateLimit: () => Promise<boolean>;
  ok: (data: unknown) => Response;
  fail: (code: string, message: string, status: number) => Response;
  audit: (organizationId: string | null, eventId: string, cancellation: boolean) => Promise<void>;
  onFailure: () => void;
};

/** Mesmo contrato e processadores no Next e na Edge Function, sem dependência
 * do framework. A credencial sempre precede a leitura do corpo e o banco. */
export async function receiveHotmart(request: Request, deps: Receiver): Promise<Response> {
  const { ok, fail } = deps;
  if (request.method !== "POST")
    return fail("invalid_request", "Use POST para enviar eventos.", 405);
  if (!deps.hottok) return fail("unavailable", "Recepção de pagamentos não configurada.", 503);
  if (!validHotmartToken(request.headers.get("x-hotmart-hottok"), deps.hottok))
    return fail("unauthenticated", "Credencial inválida.", 401);
  if (!(await deps.rateLimit())) return fail("rate_limited", "Tente novamente em um momento.", 429);
  let input: unknown;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > 100_000)
      return fail("invalid_request", "Evento excede o tamanho permitido.", 413);
    input = JSON.parse(body);
  } catch {
    return fail("invalid_request", "Evento inválido.", 400);
  }
  const envelope = hotmartEnvelopeSchema.safeParse(input);
  if (!envelope.success) return fail("validation_failed", "Formato de evento inválido.", 422);
  if (envelope.data.creation_date > Date.now() + 5 * 60_000)
    return fail("validation_failed", "Data de evento inválida.", 422);
  let purchase;
  let cancellation;
  try {
    purchase = parseHotmartPurchase(input);
    cancellation = parseHotmartCancellation(input);
  } catch {
    return fail("validation_failed", "Dados do evento inválidos.", 422);
  }
  try {
    const pool = deps.pool();
    if (!purchase && !cancellation) {
      await pool.query(
        `insert into billing_webhook_events(event_id,event,occurred_at,state,reason,normalized)
         values ($1,$2,$3,'unsupported','event_not_supported','{}') on conflict (event_id) do nothing`,
        [
          envelope.data.id,
          envelope.data.event,
          new Date(envelope.data.creation_date).toISOString(),
        ],
      );
      return ok({ received: true, state: "unsupported" });
    }
    const result = cancellation
      ? await processHotmartCancellation(pool, cancellation)
      : await processHotmartPurchase(pool, purchase!);
    if (result.state === "applied")
      await deps.audit(result.organizationId, envelope.data.id, !!cancellation);
    return ok({ received: true, state: result.state });
  } catch {
    // Recibo normalizado sem PII, fora da transação revertida. Nunca substituir
    // um evento já aplicado ou uma identidade persistida por outra requisição.
    const normalized = cancellation ?? purchase;
    if (normalized) {
      try {
        await deps.pool().query(
          `insert into billing_webhook_events(event_id,event,occurred_at,state,reason,normalized)
           values ($1,$2,$3,'failed','processing_failed',$4::jsonb)
           on conflict (event_id) do update set state='failed',reason='processing_failed'
           where billing_webhook_events.state in('received','failed')
             and billing_webhook_events.normalized=excluded.normalized`,
          [normalized.event_id,normalized.event,normalized.occurred_at,JSON.stringify(normalized)],
        );
      } catch { /* A resposta 503 mantém o reenvio do provedor quando o banco está indisponível. */ }
    }
    deps.onFailure();
    return fail("unavailable", "Não foi possível registrar o evento. Tente novamente.", 503);
  }
}
