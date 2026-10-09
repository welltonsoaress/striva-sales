# Inventário da revisão dos dois planos

08/10/2026. 341 arquivos no inventário inicial, incluindo arquivos novos não rastreados. A leitura foi por mudança funcional, com fontes dos caminhos críticos; não se afirma leitura literal de todas as linhas herdadas/formatadas. A lista não substitui o relatório de resultados.

| Arquivo | Frente | Método de revisão |
| --- | --- | --- |
| `.env.example` | config | Diff funcional, configuração e referências reais |
| `.github/workflows/e2e.yml` | config | Diff funcional, configuração e referências reais |
| `.impeccable/surfaces/app-page-tsx.md` | docs | Diff/conteúdo dos contratos e documentação |
| `PRODUCT.md` | docs | Diff/conteúdo dos contratos e documentação |
| `app/(public)/signup/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/actions/auth/signUp.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/actions/integrations/connectNuvemshop.ts` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/actions/integrations/disconnectNuvemshop.ts` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/actions/onboarding/_shared.ts` | onboarding | Conteúdo/diff, provisionamento e consumidores reais |
| `app/actions/onboarding/acceptWelcome.ts` | onboarding | Conteúdo/diff, provisionamento e consumidores reais |
| `app/actions/onboarding/finishOnboarding.ts` | onboarding | Conteúdo/diff, provisionamento e consumidores reais |
| `app/actions/settings/updateAdInsightsConnection.ts` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/actions/settings/updateAdPlatformConnection.ts` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/actions/settings/updateMarcaDaOrganizacao.ts` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/actions/settings/updatePipelineConfig.ts` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/actions/settings/updateProfile.ts` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/actions/settings/updateTenant.ts` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/admin/(protected)/dashboard/_client.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/admin/(protected)/dashboard/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/admin/(protected)/tenants/[id]/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/admin/(protected)/tenants/_client.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/api/v1/admin/tenants/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/ai/agents/[id]/versions/[vid]/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/ai/agents/[id]/versions/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/ai/agents/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/ai/cases/[id]/reply/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/ai/knowledge/sources/upload/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/channel-sessions/[id]/reconnect/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/channel-sessions/[id]/route.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `app/api/v1/channel-sessions/[id]/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/contacts/[id]/avatar/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/cron/data-retention/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/lgpd/anonymize/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/lgpd/requests/[id]/approve/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/lgpd/requests/[id]/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/messages/[id]/media/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/messages/_handler.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/system/update/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/system/version/route.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `app/app/_components/AppShell.test.tsx` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `app/app/_components/AppShell.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/app/ai/agents/[id]/_actions.ts` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/app/ai/agents/[id]/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/app/ai/providers/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/app/layout.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/app/settings/billing/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/app/settings/profile/_form.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/onboarding/_components/SkipToEnd.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/onboarding/layout.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/onboarding/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/onboarding/setup-ai/_form.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/onboarding/setup-ai/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/onboarding/welcome/_form.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/onboarding/welcome/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/admin/AdminSidebar.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/admin/PlatformModeBanner.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/admin/dashboard/KPICards.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/admin/tenants/HealthCard.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/admin/tenants/TenantsFilters.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/admin/tenants/TenantsTable.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/auth/SignupForm.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/marketing/LandingPage.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/marketing/landing.module.css` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/shell/TopBar.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/ui/button.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/ui/skeleton.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `docs/architecture/README.md` | docs | Diff/conteúdo dos contratos e documentação |
| `docs/index.md` | docs | Diff/conteúdo dos contratos e documentação |
| `docs/threat-model.md` | docs | Diff/conteúdo dos contratos e documentação |
| `hooks/useAdminTenants.ts` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `lib/agent-engine/agent/agent-config.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/agent-engine/agent/inbound-turn.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/agent-engine/agent/media-parts.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/agent-engine/agent/media-parts.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/agent-engine/agent/operator-turn.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/agent-engine/agent/org-memory.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/agent-engine/agent/skill-references.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/agent-engine/agent/split-message.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/agent-engine/channel-adapter.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/agent-engine/db/repository.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/agent-engine/edge/crm/send-message.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/agent-engine/edge/llm/run-model-call.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/agent-inbox-copy.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/agents/duplicate.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/cost.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/credentials.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/embed.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/ai/embed.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/embeddings/chave.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/gateway-binding.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/inbox-destino.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/log-invocation.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/pontos/registro.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/rag/ingest/documento.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/rag/ingest/policy.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/runtime/agent.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/runtime/cost.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/runtime/finalize.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/runtime/handoff.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/runtime/tools.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/api/handlers/types.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `lib/audit/actions.ts` | config | Diff funcional, configuração e referências reais |
| `lib/auth/provision.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `lib/auth/public-paths.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `lib/auth/rate-limit.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/auth/rate-limit.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `lib/auth/schemas.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `lib/auth/server.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `lib/automation/actions/send-ai-message.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/database.types.ts` | generated | Estrutura dos contratos gerados; não editado manualmente |
| `lib/email/resend.ts` | config | Diff funcional, configuração e referências reais |
| `lib/email/templates/acesso-gotrue.ts` | config | Diff funcional, configuração e referências reais |
| `lib/env.ts` | config | Diff funcional, configuração e referências reais |
| `lib/http/ip-do-cliente.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `lib/i18n/dicionario.ts` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `lib/impersonate/support.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `lib/lgpd/redact-cascade.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `lib/lgpd/storage-redaction-queue.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `lib/management/actions.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/management/actions.ts` | operations | Diff integral e fonte das operações/consumidores |
| `lib/management/consultation.ts` | operations | Diff integral e fonte das operações/consumidores |
| `lib/mcp/server.ts` | config | Diff funcional, configuração e referências reais |
| `lib/messaging/media/transcription.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/messaging/media/upload-validation.ts` | config | Diff funcional, configuração e referências reais |
| `lib/navigation/catalogo.ts` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `lib/navigation/interface.ts` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `lib/navigation/registry.ts` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `lib/notifications/push.handler.ts` | config | Diff funcional, configuração e referências reais |
| `lib/onboarding/passos.ts` | onboarding | Conteúdo/diff, provisionamento e consumidores reais |
| `lib/schemas/onboarding.ts` | onboarding | Conteúdo/diff, provisionamento e consumidores reais |
| `lib/schemas/settings.ts` | onboarding | Conteúdo/diff, provisionamento e consumidores reais |
| `lib/theme.test.tsx` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `playwright.config.ts` | config | Diff funcional, configuração e referências reais |
| `scripts/test-db.sh` | config | Diff funcional, configuração e referências reais |
| `supabase/baseline.sql` | database | Migrations integrais, apêndices, grants/policies e contratos |
| `supabase/config.toml` | database | Migrations integrais, apêndices, grants/policies e contratos |
| `supabase/migrations/MANIFEST.md` | database | Migrations integrais, apêndices, grants/policies e contratos |
| `supabase/templates/confirmation.html` | database | Migrations integrais, apêndices, grants/policies e contratos |
| `supabase/templates/recovery.html` | database | Migrations integrais, apêndices, grants/policies e contratos |
| `tests/e2e/wizard-do-funcionario.spec.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/invariants/rls-completude-varredura.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/setup/vitest.setup.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/agent-media-parts.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/agent-split-send.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/ai-knowledge-sources-post.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/canal-arquivado-caminho-de-volta.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/command-palette.test.tsx` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/contato-avatar-cache.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/evidencia-citada.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/gateway-binding.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/handoff-por-orcamento.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/heranca-de-provider-nos-pontos-auxiliares.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/i18n-espanhol-cobre-a-tela.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/inbox-media-image.test.tsx` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/inbox-unread-send.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/interface-por-vinculo.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/leads-import-route.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/lgpd-pdf-meet.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/lgpd-pdf-replies.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/lgpd-redact-avatar.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/limiar-de-sentimento-vem-do-agente-da-conversa.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/llm-calls-registra-falha.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/mcp-retencao-tools.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/media-derive-worker.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/messages-handler-canal-intermediado.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/messages-handler-desfechos.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/messages-handler-eco-duplicado.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/moeda-da-organizacao-se-escolhe-na-tela.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/navegacao-completude.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/onboarding-agente-nao-publicado.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/openrouter-alcanca-o-produto-inteiro.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/orcamento-gate-executa-o-veredito.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/performed-at-um-relogio-so.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/rbac-matrix.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/seam-respeita-o-binding.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/sidebar-grupos.test.tsx` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/suporte-guardas.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/team-role-change.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/telemetria-diz-o-modelo-do-painel.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tsconfig.json` | config | Diff funcional, configuração e referências reais |
| `tsconfig.typecheck.json` | config | Diff funcional, configuração e referências reais |
| `workers/agent-worker/main.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `workers/ai-response-worker.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `workers/ai-sentiment-worker.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `workers/media-derive-worker.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `workers/rag-indexer.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `.changes/creditos-e-clinicas.md` | docs | Diff/conteúdo dos contratos e documentação |
| `.changes/inicio-planos-suporte.md` | docs | Diff/conteúdo dos contratos e documentação |
| `.changes/saas-ia-incluida.md` | docs | Diff/conteúdo dos contratos e documentação |
| `app/actions/admin/hotmart.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `app/actions/admin/managedAi.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `app/actions/admin/updateCommercialPlan.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `app/actions/onboarding/business-agent.ts` | onboarding | Conteúdo/diff, provisionamento e consumidores reais |
| `app/actions/onboarding/dismissOnboarding.ts` | onboarding | Conteúdo/diff, provisionamento e consumidores reais |
| `app/admin/(protected)/ai/_client.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/admin/(protected)/ai/health/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/admin/(protected)/ai/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/admin/(protected)/ai/usage/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/admin/(protected)/finance/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/admin/(protected)/plans/_client.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/admin/(protected)/plans/_hotmart.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/admin/(protected)/plans/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/admin/(protected)/support/_client.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/admin/(protected)/support/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/api/v1/admin/support/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/billing/checkout/route.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `app/api/v1/profile/avatar/[userId]/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/profile/avatar/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/support/route.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `app/api/v1/webhooks/hotmart/route.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `app/app/ajuda/_client.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/app/ajuda/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/app/inicio/_client.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/app/inicio/inicio.module.css` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/app/inicio/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/clinicas/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/onboarding/setup-ai/_managed.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `app/planos/page.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/admin/AiAccountActions.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/admin/CompanyAiAccount.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/admin/ReconcileResponse.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/admin/SaasOverview.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/auth/Turnstile.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/billing/CheckoutButton.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/billing/CreditPacks.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/billing/RefreshUsage.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/billing/ResponseBalance.test.tsx` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `components/billing/ResponseBalance.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/help/SupportChat.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/marketing/ClinicLanding.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/marketing/PricingSection.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/marketing/clinics.module.css` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `components/profile/AvatarPicker.tsx` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `docs/architecture/inicio-suporte.architecture.json` | docs | Diff/conteúdo dos contratos e documentação |
| `docs/architecture/saas-ia-incluida.architecture.json` | docs | Diff/conteúdo dos contratos e documentação |
| `docs/design/inicio-canais-vendas.md` | docs | Diff/conteúdo dos contratos e documentação |
| `docs/reviews/2026-10-05-emails-fluxos-e-telas.md` | docs | Diff/conteúdo dos contratos e documentação |
| `docs/reviews/2026-10-05-revisao-evolucao-striva.md` | docs | Diff/conteúdo dos contratos e documentação |
| `docs/reviews/2026-10-07-saas-seguranca-e-homologacao.md` | docs | Diff/conteúdo dos contratos e documentação |
| `docs/reviews/creditos-e-clinicas.md` | docs | Diff/conteúdo dos contratos e documentação |
| `docs/runbooks/hotmart.md` | docs | Diff/conteúdo dos contratos e documentação |
| `docs/runbooks/publicar-atualizacao.md` | docs | Diff/conteúdo dos contratos e documentação |
| `docs/runbooks/saas-ia-incluida.md` | docs | Diff/conteúdo dos contratos e documentação |
| `docs/runbooks/validacao-inicio-suporte.md` | docs | Diff/conteúdo dos contratos e documentação |
| `docs/specs/creditos-e-clinicas.md` | docs | Diff/conteúdo dos contratos e documentação |
| `docs/specs/inicio-planos-suporte.md` | docs | Diff/conteúdo dos contratos e documentação |
| `docs/specs/saas-ia-incluida.md` | docs | Diff/conteúdo dos contratos e documentação |
| `lib/agent-engine/agent/human-case-reply.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/agent-engine/agent/human-case-reply.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/cost.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/ai/model-price.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/ai/model-price.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/operational-call.ts` | ai | Diff funcional e caminhos de execução, envio, custo e contexto |
| `lib/ai/runtime/tools-commercial.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/api/request-origin.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/api/request-origin.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `lib/auth/trial-identity.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `lib/auth/trusted-ip.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/auth/trusted-ip.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `lib/auth/turnstile.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/auth/turnstile.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `lib/billing/account.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/billing/account.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/billing/admin.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/billing/catalog.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/billing/checkout-guards.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/billing/credit-packs.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/billing/credits.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/billing/cycle.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/billing/cycle.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/billing/hotmart.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/billing/hotmart.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/billing/managed-ai-server.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/billing/managed-ai.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/billing/managed-ai.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/billing/operation-access-server.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/billing/operation-access.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/billing/operation-access.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/billing/plans.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/billing/pricing.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/billing/pricing.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/billing/process-hotmart-cancellation.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/billing/process-hotmart.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/billing/receive-hotmart.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/billing/receive-hotmart.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/billing/response-usage.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/billing/response-usage.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/billing/state-label.ts` | billing | Conteúdo/diff e caminhos financeiros/acesso |
| `lib/help/manual.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/help/manual.ts` | operations | Diff integral e fonte das operações/consumidores |
| `lib/help/support-store.ts` | operations | Diff integral e fonte das operações/consumidores |
| `lib/help/support.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/help/support.ts` | operations | Diff integral e fonte das operações/consumidores |
| `lib/i18n/inicio-suporte.ts` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `lib/i18n/saas.ts` | ui | Diff funcional e fontes dos fluxos; dicionário antigo comparado por AST |
| `lib/management/cases.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/management/cases.ts` | operations | Diff integral e fonte das operações/consumidores |
| `lib/management/quick-commands.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/management/quick-commands.ts` | operations | Diff integral e fonte das operações/consumidores |
| `lib/onboarding/area-de-trabalho.ts` | onboarding | Conteúdo/diff, provisionamento e consumidores reais |
| `lib/onboarding/business-templates.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/onboarding/business-templates.ts` | onboarding | Conteúdo/diff, provisionamento e consumidores reais |
| `lib/onboarding/operacao-inicial.ts` | onboarding | Conteúdo/diff, provisionamento e consumidores reais |
| `lib/onboarding/progresso-inicial.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/onboarding/progresso-inicial.ts` | onboarding | Conteúdo/diff, provisionamento e consumidores reais |
| `lib/onboarding/segment-hint.ts` | onboarding | Conteúdo/diff, provisionamento e consumidores reais |
| `lib/onboarding/simple-agenda.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/onboarding/simple-agenda.ts` | onboarding | Conteúdo/diff, provisionamento e consumidores reais |
| `lib/profile/avatars.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/profile/avatars.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `lib/storage/path-ownership.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `lib/storage/path-ownership.ts` | security | Diff funcional e código nas fronteiras de autenticação/organização |
| `public/avatars/ambar.svg` | config | Diff funcional, configuração e referências reais |
| `public/avatars/azul.svg` | config | Diff funcional, configuração e referências reais |
| `public/avatars/verde.svg` | config | Diff funcional, configuração e referências reais |
| `public/avatars/violeta.svg` | config | Diff funcional, configuração e referências reais |
| `public/marketing/inicio-canais-vendas.png` | config | Diff funcional, configuração e referências reais |
| `scripts/prepare-hotmart-edge.mjs` | config | Diff funcional, configuração e referências reais |
| `supabase/functions/handle-payment-webhook/deno.json` | database | Migrations integrais, apêndices, grants/policies e contratos |
| `supabase/functions/handle-payment-webhook/deno.lock` | database | Migrations integrais, apêndices, grants/policies e contratos |
| `supabase/functions/handle-payment-webhook/index.ts` | database | Migrations integrais, apêndices, grants/policies e contratos |
| `supabase/migrations/20261005120000_0243_inicio_planos_suporte_avatares.sql` | database | Migrations integrais, apêndices, grants/policies e contratos |
| `supabase/migrations/20261005150000_0244_hotmart_e_orientacao_de_casos.sql` | database | Migrations integrais, apêndices, grants/policies e contratos |
| `supabase/migrations/20261005180000_0245_respostas_ia_e_cancelamento_hotmart.sql` | database | Migrations integrais, apêndices, grants/policies e contratos |
| `supabase/migrations/20261005190000_0246_origem_ia_imutavel.sql` | database | Migrations integrais, apêndices, grants/policies e contratos |
| `supabase/migrations/20261005220709_0247_ofertas_hotmart_semestral_anual.sql` | database | Migrations integrais, apêndices, grants/policies e contratos |
| `supabase/migrations/20261006135900_0248_saas_ia_e_templates.sql` | database | Migrations integrais, apêndices, grants/policies e contratos |
| `supabase/migrations/20261007132500_0249_storage_periodo_comercial.sql` | database | Migrations integrais, apêndices, grants/policies e contratos |
| `supabase/migrations/20261007141500_0250_storage_helper_escopo.sql` | database | Migrations integrais, apêndices, grants/policies e contratos |
| `supabase/migrations/20261007225042_0251_creditos_comerciais.sql` | database | Migrations integrais, apêndices, grants/policies e contratos |
| `tests/e2e/inicio-primeiros-passos.spec.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/e2e/saas-ia-incluida.spec.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/invariants/creditos-comerciais.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/invariants/hotmart-faturamento.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/invariants/orientacao-caso-fila.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/invariants/respostas-ia-consumo.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/invariants/saas-ia-incluida.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/invariants/suporte-da-plataforma.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/planos-rascunho-edicao.test.tsx` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |
| `tests/unit/storage-consumers-scope.test.ts` | tests | Diff, casos/assertivas e fixtures; aprofundamento dos contratos críticos |

## Arquivos adicionais desta revisão

Incluem correções, regressões e documentação nova.

- `app/app/ai/agents/[id]/_components/AgentForm.tsx`
- `hooks/ai/useAgentVersions.ts`
- `lib/agent-engine/agent/abordagem-de-formulario.ts`
- `lib/agent-engine/edge/crm/send-ledger.ts`
- `lib/ai/agents/validation.ts`
- `lib/automation/actions/send-ai-message.test.ts`
- `lib/automation/engine.ts`
- `lib/automation/types.ts`
- `tests/unit/editor-de-agente-salva-o-cadastro.test.tsx`
- `tests/unit/followup-send-ledger.test.ts`
- `.changes/revisao-comercial.md`
- `docs/reviews/revisao-dois-planos-arquivos.md`
- `docs/reviews/revisao-dois-planos.md`
- `lib/ai/operational-call.test.ts`
- `lib/automation/engine.test.ts`
- `lib/billing/automation-response.ts`
- `lib/channels/delivery-uncertainty.test.ts`
- `lib/channels/delivery-uncertainty.ts`
- `supabase/migrations/20261008183000_0252_revisao_creditos_e_versoes.sql`
- `tests/invariants/revisao-comercial.test.ts`
- `tests/unit/onboarding-welcome-retomavel.test.tsx`

## Ruído e geração

- `lib/i18n/dicionario.ts`: 5.610 chaves anteriores comparadas por AST, sem alteração dos valores próprios; imports dos novos catálogos inspecionados.
- `lib/database.types.ts`: estrutura dos novos contratos conferida; geração existente preservada. A migration0252 só substitui corpos de RPCs/triggers, sem novos argumentos, retornos, tabelas ou colunas.
- `supabase/baseline.sql`: os apêndices afetados foram revisados e comparados com migrations; partes legadas sem diff não são declaradas como releitura integral.
- Testes novos: casos/assertivas e fixtures críticas conferidos; não se trata de alegação de leitura manual de cada linha auxiliar.
