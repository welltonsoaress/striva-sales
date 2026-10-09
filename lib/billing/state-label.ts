export const COMMERCIAL_STATE_LABELS: Record<string, string> = {
  pending: "Preparando atendimento",
  trial: "Em teste",
  active: "Assinatura ativa",
  expired: "Período encerrado",
  suspended: "Suspensa",
};
export function commercialStateLabel(state: string, until?: string | null) {
  if (["trial", "active"].includes(state) && until && Date.parse(until) <= Date.now())
    return "Período encerrado";
  return COMMERCIAL_STATE_LABELS[state] ?? "Situação não identificada";
}
export const CREDIT_KIND_LABELS: Record<string, string> = {
  trial: "Teste gratuito",
  subscription: "Assinatura",
  renewal: "Renovação da franquia",
  extra: "Pacote extra",
  adjustment: "Ajuste administrativo",
  debit: "Créditos consumidos",
  refund: "Estorno",
};
