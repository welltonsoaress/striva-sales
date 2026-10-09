import pg from "pg";
import { receiveHotmart } from "./lib/receive-hotmart.ts";

// O deploy empacota os módulos canônicos de lib/billing. Não há cópia mantida
// à mão nem segunda regra de vínculo. SUPABASE_DB_URL é injetada pelo runtime.
const pool = new pg.Pool({
  connectionString: Deno.env.get("SUPABASE_DB_URL"),
  max: 2,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});
let windowStart = Date.now();
let requests = 0;
const headers = { "content-type": "application/json", "cache-control": "no-store" };
function ok(data: unknown) {
  return Response.json({ data }, { headers });
}
function fail(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status, headers });
}

Deno.serve((request: Request) =>
  receiveHotmart(request, {
    hottok: Deno.env.get("HOTMART_HOTTOK") ?? "",
    pool: () => {
      if (!Deno.env.get("SUPABASE_DB_URL")) throw new Error("database_not_configured");
      return pool;
    },
    // Limite por isolate; o Next mantém o limite distribuído pelo Upstash.
    // Ausência de token nunca consome o balde.
    rateLimit: async () => {
      if (Date.now() - windowStart >= 60_000) {
        requests = 0;
        windowStart = Date.now();
      }
      return ++requests <= 300;
    },
    ok,
    fail,
    audit: async (organizationId, eventId, cancellation) => {
      try {
        await pool.query(
          `insert into public.api_audit_log (organization_id,action,resource_type,metadata,bypassed_rls)
         values ($1,$2,'hotmart_event',$3::jsonb,true)`,
          [
            organizationId,
            cancellation ? "billing.subscription_updated" : "billing.payment_recorded",
            JSON.stringify({ event_id: eventId }),
          ],
        );
      } catch {
        console.error(JSON.stringify({ event: "billing_hotmart_audit_failed" }));
      }
    },
    onFailure: () => console.error(JSON.stringify({ event: "billing_hotmart_processing_failed" })),
  }),
);
