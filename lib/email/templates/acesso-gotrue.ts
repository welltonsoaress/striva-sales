import { NEUTROS_DE_SAIDA, type MarcaDeSaida } from "@/lib/branding/saida";

/**
 * Os dois e-mails de ACESSO — confirmar conta e redefinir senha — no formato
 * que o GoTrue renderiza.
 *
 * ─── POR QUE ISTO É DIFERENTE DE `invite.ts` ────────────────────────────────
 *
 * O convite de time é montado e ENVIADO por nós. Estes dois não: quem os
 * renderiza e envia é o GoTrue, um processo de terceiro. Nós só entregamos o
 * MOLDE, e ele preenche `{{ .RedirectTo }}` e `{{ .TokenHash }}` na hora do
 * envio. Por isso a saída aqui é uma string de template Go, não um e-mail
 * pronto — e por isso as chaves duplas NÃO passam por escape: elas são sintaxe
 * do renderizador, não dado.
 *
 * ─── POR QUE `token_hash` E NÃO `{{ .ConfirmationURL }}` ────────────────────
 *
 * O modelo PADRÃO do GoTrue linka para `/auth/v1/verify`, que devolve um `code`
 * PKCE. O verificador desse code vive num cookie `SameSite=Strict`
 * (`lib/supabase/server.ts`), e clique vindo de webmail é navegação
 * cross-site: o cookie não viaja, `exchangeCodeForSession` falha, e a conta é
 * confirmada sem que a sessão feche. `token_hash` não depende de cookie nenhum.
 *
 * Medido numa instalação self-hosted em 2026-09-10: com o modelo padrão, o
 * `api_audit_log` registrava `auth.email_link_rejected` com
 * `"PKCE code verifier not found in storage"`; com estes moldes, o mesmo fluxo
 * fecha a sessão.
 *
 * ─── `&`, NUNCA `?` ────────────────────────────────────────────────────────
 *
 * `.RedirectTo` já chega com `?type=` embutido — `signUp.ts` e
 * `requestPasswordReset.ts` o anexam de propósito, porque é o único jeito de o
 * `type` sobreviver ao hop pelo GoTrue no outro formato. Um `?` aqui duplicaria
 * o separador e o parser de URL do browser pararia de reconhecer `token_hash`.
 */

export type ModeloDeAcesso = "confirmation" | "recovery";

export const MODELOS_DE_ACESSO: readonly ModeloDeAcesso[] = ["confirmation", "recovery"];

/** O texto de cada modelo. Assunto entra no `GOTRUE_MAILER_SUBJECTS_*`. */
const COPIA: Record<
  ModeloDeAcesso,
  {
    assunto: (marca: string) => string;
    titulo: string;
    corpo: (marca: string) => string;
    botao: string;
    rodape: string;
    preheader: string;
    orientacao: string;
  }
> = {
  confirmation: {
    assunto: (marca) => `Confirme seu e-mail · ${marca}`,
    titulo: "Seu próximo passo começa aqui",
    corpo: (marca) =>
      `Sua conta no ${marca} está quase pronta. Confirme seu endereço de e-mail para acessar sua área de trabalho e continuar a configuração.`,
    botao: "Confirmar e-mail",
    rodape: "Se você não criou esta conta, ignore este e-mail.",
    preheader: "Confirme seu e-mail e dê o primeiro passo para organizar seu atendimento.",
    orientacao:
      "Depois da confirmação, siga as orientações na tela para preparar sua conta. Você poderá concluir a configuração no seu ritmo.",
  },
  recovery: {
    assunto: (marca) => `Redefinir sua senha · ${marca}`,
    titulo: "Redefinir sua senha",
    corpo: (marca) =>
      `Recebemos um pedido para redefinir a senha da sua conta no ${marca}. Clique no botão abaixo para escolher uma nova.`,
    botao: "Definir nova senha",
    rodape: "Se não foi você quem pediu, ignore este e-mail — sua senha continua a mesma.",
    preheader: "Crie uma nova senha e recupere o acesso à sua área de trabalho.",
    orientacao:
      "Escolha uma senha exclusiva para esta conta. A alteração só acontece depois que você definir e salvar a nova senha.",
  },
};

export function assuntoDoModelo(modelo: ModeloDeAcesso, marca: MarcaDeSaida): string {
  return COPIA[modelo].assunto(marca.nome);
}

/**
 * O molde, com a marca da INSTALAÇÃO já aplicada.
 *
 * Estilo inline apenas e zero asset externo além do logo, pelas mesmas razões
 * de `invite.ts` — inclusive a dimensão no atributo, que o Outlook desktop
 * exige porque descarta `height` de style em imagem.
 */
export function montarTemplateDeAcesso(modelo: ModeloDeAcesso, marca: MarcaDeSaida): string {
  const t = COPIA[modelo];
  const nome = escapeHtml(marca.nome);

  const logo = marca.logoUrl
    ? `<p style="margin:0 0 24px"><img src="${escapeHtml(marca.logoUrl)}" alt="${nome}" height="40" style="height:40px;width:auto;max-width:200px;border:0;display:block"></p>`
    : "";

  // As chaves duplas ficam CRUAS de propósito: o GoTrue as substitui.
  const destino = "{{ .RedirectTo }}&token_hash={{ .TokenHash }}";

  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(t.titulo)}</title></head>
<body style="margin:0;padding:0;background:${NEUTROS_DE_SAIDA.fundo};font-family:Arial,Helvetica,sans-serif;color:${NEUTROS_DE_SAIDA.texto}">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all">${escapeHtml(t.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid ${NEUTROS_DE_SAIDA.linha};border-radius:12px">
        <tr><td style="padding:32px 28px 20px;border-bottom:1px solid ${NEUTROS_DE_SAIDA.linha}">
          ${logo}
          <p style="margin:0;font-size:20px;line-height:1.4;font-weight:700;color:${NEUTROS_DE_SAIDA.texto}">${nome}</p>
          <p style="margin:6px 0 0;font-size:12px;line-height:1.5;letter-spacing:1px;color:${NEUTROS_DE_SAIDA.suave}">SUA ÁREA DE TRABALHO</p>
        </td></tr>
        <tr><td style="padding:28px">
          <h1 style="font-size:26px;line-height:1.25;margin:0 0 16px;color:${NEUTROS_DE_SAIDA.texto}">${escapeHtml(t.titulo)}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.7">${escapeHtml(t.corpo(marca.nome))}</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="border-radius:6px;background:${marca.accent}">
            <a href="${destino}" style="display:inline-block;padding:14px 24px;background:${marca.accent};color:${marca.accentFg};border-radius:6px;text-decoration:none;font-size:15px;line-height:1.4;font-weight:700">${escapeHtml(t.botao)}</a>
          </td></tr></table>
          <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:${NEUTROS_DE_SAIDA.suave}">${escapeHtml(t.orientacao)}</p>
          <p style="margin:24px 0 8px;padding-top:20px;border-top:1px solid ${NEUTROS_DE_SAIDA.linha};font-size:12px;line-height:1.6;color:${NEUTROS_DE_SAIDA.suave}">Se o botão não abrir, copie e cole este link no navegador:</p>
          <p style="margin:0;font-size:12px;line-height:1.6;word-break:break-all;overflow-wrap:anywhere;color:${NEUTROS_DE_SAIDA.suave}">${destino}</p>
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px"><tr><td style="padding:20px 12px;font-size:12px;line-height:1.7;color:${NEUTROS_DE_SAIDA.suave}">
        <p style="margin:0 0 8px">O link é pessoal e de uso único. Não o compartilhe.</p>
        <p style="margin:0 0 8px">${escapeHtml(t.rodape)}</p>
        <p style="margin:0">Mensagem automática de ${nome}.</p>
      </td></tr></table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
