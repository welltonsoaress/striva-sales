/** Atalhos de leitura: não interpretam nem executam mutações do CRM. */
export function managementQuickCommand(
  question: string,
): "help" | "daily" | "weekly" | "cases" | null {
  const text = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[.!?\s]+$/, "");
  if (/^(ajuda|comandos|menu|o que posso pedir)$/.test(text)) return "help";
  if (/^(listar |mostrar |me mostre )?casos( pendentes)?$/.test(text)) return "cases";
  const request = text
    .replace(/^(faca |me (de|mostre) )?(um )?/, "")
    .replace(/ (na clinica|da clinica|da empresa)$/, "");
  if (/^(resumo do dia|relatorio diario|relatorio do dia)$/.test(request)) return "daily";
  if (/^(resumo da semana|relatorio semanal|comparativo semanal)$/.test(request)) return "weekly";
  return null;
}

export function managementCommandHelp(actionsEnabled: boolean): string {
  return [
    "*O que você pode pedir por aqui*",
    "• Relatório diário: atividade de hoje e pendências no momento da consulta.",
    "• Relatório semanal: comparativo dos últimos períodos, com datas e fuso da empresa.",
    "• Casos pendentes: até cinco pendências aguardando orientação humana, das mais antigas para as mais recentes.",
    "• Consulte oportunidades, agenda e negócios em risco.",
    "",
    actionsEnabled
      ? "Você também pode pedir para mover uma oportunidade, criar tarefa, agendar, transferir atendimento, pausar ou retomar a IA. Confira a proposta e responda com o código de confirmação antes da execução."
      : "As ações de gestão por WhatsApp estão desativadas. Quem administra pode conferir essa opção nas configurações do assistente de gestão.",
    actionsEnabled
      ? "Para orientar a IA, informe o caso e sua decisão. Confira o texto proposto e confirme com o código. Sua orientação volta à IA para continuar o atendimento; não é enviada diretamente ao cliente."
      : "Para orientar a IA em um caso, abra Casos no sistema e responda à pendência. Sua orientação volta à IA para continuar o atendimento.",
    "Para parar os avisos automáticos, envie: pausar avisos.",
  ].join("\n");
}
