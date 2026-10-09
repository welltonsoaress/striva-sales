# E-mails, acesso e principais telas

Verificação em 05/10/2026. CONFIRMADO por leitura do código, execução local e capturas com dados fictícios. Esta rodada não publicou aplicação, templates ou configurações externas e não enviou e-mails reais.

## E-mails

| Tipo | Implementação confirmada | Situação |
|---|---|---|
| Confirmação de cadastro | Supabase Auth; modelo em `lib/email/templates/acesso-gotrue.ts` e cópia em `supabase/templates/confirmation.html` | Modelo atualizado localmente. Falta aplicar no ambiente publicado. |
| Recuperação de senha | Supabase Auth; modelo canônico compartilhado e `supabase/templates/recovery.html` | Modelo atualizado localmente. Falta aplicar no ambiente publicado. |
| Convite de equipe | Modelo `lib/email/templates/invite.ts`, envio pela aplicação via Resend | Implementado; entrega real não foi verificada nesta rodada. |
| Entrega de exportação LGPD e alerta de prazo LGPD | Conteúdo HTML/texto nos módulos de LGPD; envio via Resend | Implementados; entrega real não foi verificada nesta rodada. |
| Alerta de orçamento da IA | Modelo `lib/email/templates/ai-budget-alarm.tsx` | Existe template, mas não foi localizado um chamador de envio em execução. |
| Cobrança, vencimento e compra de créditos | Sem fluxo de envio implementado identificado | Pendentes. |

A aplicação usa `lib/email/resend.ts`. O Supabase Auth possui configuração SMTP própria; configurar Resend na aplicação não configura automaticamente o envio do Supabase. O remetente/domínio efetivo do Supabase não foi inspecionado nesta rodada. A entrega continua pendente da etapa do domínio e da configuração do provedor.

Os dois modelos de acesso ganharam layout com tabelas e estilos inline, cabeçalho da marca, preheader, botão destacado, link alternativo e orientação de segurança. Respeitam a marca resolvida pelo sistema. O destino `{{ .RedirectTo }}&token_hash={{ .TokenHash }}` permanece intacto para preservar o acesso pelo link do e-mail.

Referências oficiais: [templates do Supabase Auth](https://supabase.com/docs/guides/auth/auth-email-templates) e [configuração SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Cadastro e pagamento

- Cadastro com confirmação de e-mail habilitada: aguarda confirmação. O link confirmado provisiona a organização e encaminha o administrador aos primeiros passos (`/onboarding/welcome`).
- Concluir ou escolher **Configurar depois** encaminha ao dashboard (`/app/inicio`). Adiar registra o adiamento, sem registrar conclusão.
- Membros convidados seguem o fluxo de aceite de convite para a área de trabalho; não precisam configurar a organização novamente.
- O receptor Hotmart registra contratos e pagamentos, mas não navega o navegador do comprador. O retorno automático do checkout e a ativação das permissões pelo pagamento ainda não estão concluídos/homologados. O checkout real continua desativado.
- As correções financeiras da revisão anterior continuam locais; a função externa previamente publicada não foi atualizada nesta rodada.

## Progresso inicial

O dashboard acompanha cinco etapas de 20%: negócio, WhatsApp conectado, agente preparado, funil e conversa de teste respondida. Convites de equipe aparecem como etapa adicional do assistente e não entram nessa porcentagem.

O cálculo usa o estado salvo da organização e os recursos já existentes. Pular não cria uma conclusão artificial. O funil criado automaticamente explica os 20% da empresa de teste; preencher o negócio elevou a medida a 40%. As cinco etapas concluídas representam 100%. Preparar o agente conta como configuração; a porcentagem, isoladamente, não comprova agente publicado ou operação real.

## Validação desta rodada

- 17 testes de templates e da rota pública de modelos passaram.
- Build de produção, incluindo TypeScript: passou.
- ESLint dos arquivos TypeScript alterados: passou.
- Dois cenários existentes de interface passaram: adiamento/retomada com progresso e manual/faturamento/avatar, incluindo upload privado e retorno ao avatar padrão.
- Renderização do kit: marca aplicada e variáveis de autenticação preservadas.
- Templates de e-mail conferidos em desktop e celular, sem transbordamento horizontal a 390px.

O teste visual foi repetido apenas para capturar o perfil após terminar o salvamento e mostrar a configuração do agente em desktop. Não houve execução da suíte completa, compra real, envio real, conexão real de WhatsApp ou chamada real de IA.

## Capturas

Todas as capturas abaixo usam dados de teste. Os e-mails são prévias renderizadas, não capturas de uma mensagem recebida.

| Tela | Captura |
|---|---|
| Configuração inicial | Abrir: `.superpowers/evidence/inicio-primeiros-passos/configuracao-inicial.png` (registro local) |
| Dashboard desktop | Abrir: `.superpowers/evidence/inicio-primeiros-passos/inicio-desktop.png` (registro local) |
| Dashboard celular | Abrir: `.superpowers/evidence/inicio-primeiros-passos/inicio-mobile.png` (registro local) |
| Progresso após preencher o negócio | Abrir: `.superpowers/evidence/inicio-primeiros-passos/progresso-configuracao.png` (registro local) |
| Configuração do agente | Abrir: `.superpowers/evidence/inicio-primeiros-passos/configuracao-agente.png` (registro local) |
| Perfil e avatares | Abrir: `.superpowers/evidence/inicio-primeiros-passos/perfil-avatares.png` (registro local) |
| E-mail de confirmação | Abrir: `.superpowers/evidence/inicio-primeiros-passos/email-confirmation.png` (registro local) |
| E-mail de recuperação | Abrir: `.superpowers/evidence/inicio-primeiros-passos/email-recovery.png` (registro local) |

Outras capturas anteriores, vinculadas ao relatório de revisão, documentam planos, faturamento e suporte. A galeria acima foi produzida nesta rodada.

As capturas mencionadas nesta revisão são registros locais fora do versionamento, não arquivos entregues pelo clone. Para evidência reproduzível da release, consulte os artefatos de E2E do [PR #18](https://github.com/welltonsoaress/striva-sales/pull/18).
