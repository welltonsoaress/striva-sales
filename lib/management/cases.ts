import type { createAdminClient } from "@/lib/supabase/admin";

/** Apenas pendências com o humano. Não mistura casos que esperam o cliente. */
export async function managementPendingCases(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
) {
  const result = await admin
    .from("agent_cases")
    .select("id, title, blocker", { count: "exact" })
    .eq("organization_id", organizationId)
    .eq("status", "awaiting_human")
    .order("awaiting_human_at", { ascending: true, nullsFirst: false })
    .order("opened_at", { ascending: true })
    .order("id")
    .limit(5);
  if (result.error || result.count === null) throw new Error("management_cases_unavailable");
  const rows = result.data ?? [];
  const compact = (text: string, max: number) => text.replace(/\s+/g, " ").slice(0, max);
  return [
    `*Casos aguardando orientação: ${result.count}*`,
    `Consulta em ${new Date().toISOString()} (UTC).`,
    ...rows.map(
      (row, index) =>
        `${index + 1}. ${compact(row.title, 100)}\nPendência: ${compact(row.blocker, 200)}\nCaso: ${row.id}`,
    ),
    rows.length
      ? "Informe o caso e a orientação para a IA. Quando os comandos estiverem habilitados, você receberá uma proposta para confirmar."
      : "Nenhum caso aguarda orientação humana neste momento.",
    ...(result.count > rows.length
      ? ["A lista mostra os cinco mais antigos. Veja os demais em Casos no sistema."]
      : []),
  ].join("\n\n");
}
