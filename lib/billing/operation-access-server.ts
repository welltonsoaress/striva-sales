import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api/types";
import { tenantOperationAllowed } from "./operation-access";
import { randomUUID } from "node:crypto";

/** Também protege integrações com bearer: organizationId vem do token validado. */
export async function assertTenantOperation(db: SupabaseClient, organizationId: string) {
  const { data, error } = await db
    .from("organization_ai_accounts")
    .select("mode,state,access_until")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error || !data)
    throw new ApiError(
      503,
      "upstream_unavailable",
      undefined,
      randomUUID(),
      "Não foi possível confirmar o período contratado.",
    );
  if (!tenantOperationAllowed(data))
    throw new ApiError(
      403,
      "forbidden",
      undefined,
      randomUUID(),
      "O período contratado terminou. Consulta, exportação, suporte e contratação continuam disponíveis.",
    );
}
