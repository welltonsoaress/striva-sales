# Créditos e clínicas — homologação local

Escopo: decisão aprovada em 07/10/2026, aplicada sobre as mudanças locais anteriores. Não houve publicação na VPS, alteração da Luana, compra real ou habilitação de cobrança no ambiente comercial.

## Entregue em código

- `credit_v3`: dez créditos por mensagem lógica; reserva atômica permite franquia + extras. Partes, reenvio, falha definitiva e entrega incerta conservam o fluxo existente.
- Nova gratuidade de sete dias/1.000 créditos; franquias de 1.000/3.000/6.000. Contas/condições anteriores conservam capacidade por conversão versionada, sem reescrever recibos.
- Pacote 1.000/R$49,99 em rascunho; catálogo mínimo, compra autenticada e publicação com motivo/auditoria. Salvar a oferta volta ao rascunho. Sem oferta homologada não há compra disponível.
- Saldo, consumo, renovação e aviso em créditos no dashboard, faturamento e admin. Quantidade de mensagens e custo operacional ficam separados.
- Preços compartilhados: equivalente mensal e total semestral/anual, Pro recomendado e economia anual calculada dos totais cadastrados.
- Homepage com ação de teste e página `/clinicas`, demonstração fictícia, FAQ, metadados e sugestão de segmento editável até o onboarding. Novo template clínico evita coleta clínica desnecessária.
- Migration 0251, apêndice idempotente, MANIFEST e tipos gerados pela CLI contra o banco local isolado.

## Provas executadas

Verificação encerrada em 08/10/2026. Após a orientação para evitar testes desnecessários, a última rodada cobriu os caminhos alterados e as falhas corrigidas; não repetiu a suíte geral inteira.

| Verificação | Estado |
| --- | --- |
| Baseline em instalação e atualização com `ON_ERROR_STOP=1` | Passou na rodada final, incluindo 0251; nenhuma alteração nos arquivos medidos durante a corrida |
| Banco relevante, oito arquivos, um worker | **149 testes passaram**: créditos, SaaS, Hotmart, recibos antigos, isolamento RLS, varreduras de RLS e funções privilegiadas, isolamento do próprio harness |
| Novos testes de créditos | **22 casos passaram**, incluindo concorrência, 1–9 créditos, saldo misto, partes, falha, entrega incerta, reversão, conversão antiga idempotente, contrato/renovação, publicação, isolamento e atualização de aviso antigo sem duplicação |
| Preços, saldo e templates | Passaram nas rodadas focadas e na execução geral; os segmentos não herdam identidade nem regras exclusivas da Advance |
| Marca, checkout, cache por organização e tema | **48 testes passaram** na conferência das correções; checkout novo recusa mensal e preserva semestre/ano com snapshot da régua |
| Traduções após a última revisão de texto | **Cinco testes passaram** |
| Typecheck, lint, restrição de canais e hierarquia de papéis | Passaram na execução de `gov:verify`; lint geral com zero erros e avisos existentes. Últimos textos e auxiliares conferidos novamente por lint focado |
| `gov:verify` completo | Executado: 842 arquivos aprovados, 8.653 testes aprovados, um caso de falha esperada e uma falha de marca. A marca foi corrigida e passou na rodada de 48 testes. Os 21 erros adicionais eram do painel de desenvolvimento carregado pelo auxiliar em `NODE_ENV=development`; corrigido para `test`, os casos afetados passaram sem erros adicionais. **Não houve nova execução completa após essas correções** |
| Build de produção (Turbopack) | **Passou**, incluindo compilação, TypeScript e geração das páginas; `/clinicas` e `/planos` presentes nas rotas |
| E2E relevante contra o build e Supabase local | **Seis jornadas passaram**: preços/escolha preservada no login; checkout e webhooks sintéticos; isolamento via JWT, Storage e Realtime com controles positivos; cadastro pela clínica até onboarding/admin; três páginas comerciais em desktop/celular e acessibilidade; pacote em rascunho, esgotamento, renovação visível e recuperação |
| Evidência visual | Homepage, clínicas, planos, onboarding, faturamento e configuração administrativa de extras, com dados fictícios. Totais visíveis, Pro destacado, ausência de overflow horizontal e auditoria WCAG nas páginas comerciais |

Uma corrida de banco foi descartada porque o ajuste local de workers permitiu dois arquivos simultâneos, incompatível com o reset do banco por arquivo. O auxiliar local foi corrigido para um worker no banco. Não houve mudança na configuração de CI para contornar a falha. Erros SQL de tentativas proibidas em testes negativos são esperados; só o veredito final constitui prova.

As tentativas iniciais de build/E2E foram interrompidas durante disputa de memória. A execução final separou build, navegador e banco e concluiu os três. O teste de tema ganhou somente um prazo maior na preparação por importação fria medida acima dos dez segundos; não houve relaxamento dos assertions de SSR/hidratação nem dos timeouts gerais de produto.

Evidências locais (ignoradas pelo Git, sem dados de clientes):

- [Clínicas em desktop](../../.superpowers/evidence/saas-ia-incluida/clinicas-desktop.png) e [celular](../../.superpowers/evidence/saas-ia-incluida/clinicas-mobile.png).
- [Planos em desktop](../../.superpowers/evidence/inicio-primeiros-passos/planos-landing-desktop.png) e [celular](../../.superpowers/evidence/inicio-primeiros-passos/planos-landing-mobile.png).
- [Saldo e extras no faturamento](../../.superpowers/evidence/saas-ia-incluida/creditos-faturamento-desktop.png) e [configuração dos extras no admin](../../.superpowers/evidence/saas-ia-incluida/creditos-admin-desktop.png).
- Logs finais em `.superpowers/credits-build-final.txt`, `credits-db-relevant-final.txt`, `credits-e2e-final.txt`, `credits-foc-final.txt`, `credits-i18n-final.txt` e `credits-lint-final.txt`.

## Revisão adicional — 08/10/2026

Revisão de código por risco sobre cobrança e compatibilidade, reservas e bloqueios de IA, escopos de organização e Storage, suporte administrativo, cadastro/antifraude, templates e apresentação dos planos. Foram aproveitadas as provas de banco e E2E já registradas acima.

Dois problemas concretos foram corrigidos:

- **Consumo na renovação:** o faturamento carregava o consumo antes de renovar o ciclo. Na primeira abertura após o aniversário, podia combinar saldo novo com consumo antigo. A leitura agora aguarda a renovação e usa a mesma referência de tempo; falha de renovação não apresenta um resumo aparentemente válido.
- **Contrato recente em histórico longo:** a identificação do plano consultava todos os checkouts, sujeita ao limite de linhas da API. Agora busca somente os checkouts dos contratos exibidos, sempre com filtro explícito da empresa. Isso evita perder o nome do plano recente e reduz a consulta.

Quatro testes focados passaram, cobrindo virada do ciclo, falha na renovação, histórico com mais de mil checkouts e período UTC. Typecheck e lint dos cinco arquivos alterados passaram sem erros. Não houve alteração de schema, políticas RLS, preços ou apresentação visual nesta revisão. Banco, build e E2E não foram repetidos. Logs: `.superpowers/credits-review-unit.txt`, `credits-review-typecheck.txt` e `credits-review-lint.txt`.

## Integrações externas pendentes

Conferir os seis links de planos contra o catálogo antes de publicar. A revisão comercial não conseguiu acessar os checkouts públicos; nenhuma condição de parcelamento foi inventada. Criar e homologar a oferta de extras de R$49,99, incluindo compra, duplicação, reembolso e chargeback entregues pelo provedor real. Confirmar WAHA, IA, e-mail, proxy e Turnstile no ambiente homologado.

O banco local e eventos sintéticos comprovam regras e isolamento nos caminhos testados. Não comprovam entrega real ao WhatsApp, margem financeira, tarifas comerciais ou cobrança real.

Ativação real com Turnstile, número verificado e fornecedor de IA continua pendente de integração. A jornada de tela validou a configuração e a indisponibilidade explicada quando essas dependências não existem; não simulou isso como atendimento real homologado. A execução geral de banco interrompida não é apresentada como verde: o resultado final é da seleção relevante de oito arquivos. O ambiente descartável e o servidor de conferência foram encerrados após a validação; serviços já existentes do usuário foram preservados.

## Operação e recuperação

Cliente pago sem dez créditos vê a renovação e o caminho de extras; durante teste encerrado vê contratação. Saldo recomposto resolve a pendência de créditos, sem transferir conversas humanas. Oferta incompleta fica explicada no faturamento. Publicação fica no admin de IA e exige motivo; recibos e eventos permanecem acessíveis para reconciliação.

Contrato e checklist de Sistema Vivo: [spec](../specs/creditos-e-clinicas.md). Fluxo de configuração: [runbook](../runbooks/saas-ia-incluida.md). Arquitetura: `docs/architecture/saas-ia-incluida.architecture.json`.
