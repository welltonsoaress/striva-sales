import type { SupabaseClient } from "@supabase/supabase-js";

/** Compara a revisão mantida pelo trigger do banco, sem colocar o JSON na URL. */
export async function savePipelineSettings(
  db: SupabaseClient,
  input: { organizationId: string; pipelineId: string; expectedUpdatedAt: string; settings: Record<string, unknown>; vocabulary?: Record<string, unknown> },
) {
  const query = db.from("crm_pipelines")
    .update({ settings: input.settings, ...(input.vocabulary ? { vocabulary: input.vocabulary } : {}) })
    .eq("organization_id", input.organizationId)
    .eq("id", input.pipelineId)
    .eq("is_archived", false)
    .eq("updated_at", input.expectedUpdatedAt);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
}
