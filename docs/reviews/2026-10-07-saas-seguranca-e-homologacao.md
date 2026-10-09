# IA incluída: segurança e homologação local

Estado em 07/10/2026. Esta revisão acompanha a implementação de
[`saas-ia-incluida.md`](../specs/saas-ia-incluida.md). Não é uma certificação
de segurança nem autorização de publicação. Os gates locais e a jornada visual
foram concluídos; as dependências externas estão discriminadas ao final.

## Entrega local

- Cadastro com IA incluída, três etapas iniciais e catálogo versionado de 15
  segmentos. Informações do negócio ficam na memória canônica; atendimento e
  organizador usam capacidades separadas. Agenda exige disponibilidade real.
- Admin com todas as empresas, origem, filtros, total, período, saldo, consumo,
  pagamentos, saúde e ações com motivo e auditoria. IA e Financeiro têm caminhos
  próprios na navegação.
- Reserva transacional por resposta, limites de teste/assinatura, renovação por
  aniversário, extras e reversões idempotentes. Custo operacional e crédito
  comercial são medidas separadas. Venda real e extras continuam desativados.
- Dashboard, onboarding e admin com hierarquia de ações, cores de estado,
  transições limitadas, redução de movimento e adaptação a celular/tema escuro.
- Isolamento reforçado em banco, acessos administrativos e arquivos privados;
  dados e agentes existentes permanecem legados até migração explícita.

## Ambientes e limites da prova

- Banco efêmero PostgreSQL 15: baseline com 0250 aplicado em INSTALL e
  UPDATE com `ON_ERROR_STOP=1`, sem erros; suíte completa de invariantes verde.
  Depois das guardas adicionais de arquivo, cinco arquivos relevantes foram
  repetidos: 127 testes passaram, com INSTALL e UPDATE novamente verdes.
- Supabase local separado: Auth, PostgREST, Storage e Realtime reais; usuários,
  empresas, mensagens e preços de teste fictícios. As tarifas sintéticas não
  comprovam preços comerciais. Prévia simulada é identificada como fictícia.
- Produção: somente leituras de metadados, advisors e código da Edge Function.
  Nenhuma migration, credencial, publicação de agente ou cobrança foi aplicada.
- Luana: publicação v13 e hash do prompt `795d0aaf9c4cae1ceef75e72275632ac`
  confirmados por leitura. Organizador continua desativado em produção. O catálogo
  novo não atualiza agentes publicados nem migra empresas automaticamente.

## Achados e correções

| Achado                                                                       | Impacto potencial                                                            | Correção local                                                                                                                                                | Regressão                                                      |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Gravações com service role dependiam apenas do suporte/RBAC                  | Continuar operando depois do acesso contratado                               | Guarda comercial em APIs, Actions, MCP, ferramentas e retorno OAuth, sempre com organização confiável                                                         | `suporte-guardas`, `tools-commercial`, matriz RBAC             |
| Comprovação do WhatsApp exposta a alteração do navegador                     | Concessão indevida de teste                                                  | Verificação e hash controlados pelo servidor; limite e concessão em transação                                                                                 | `saas-ia-incluida` (banco)                                     |
| Ponteiros sem vínculo composto entre empresas                                | Associar memória ou mensagem ao recurso de outra empresa                     | FK composta com `organization_id` e filtros explícitos                                                                                                        | `saas-ia-incluida` (banco)                                     |
| Caminho de arquivo confiado apenas por pertencer a um registro próprio       | Assinar, baixar ou remover arquivo privado de outra empresa com service role | Guarda compartilhada de namespace canônico antes do Storage em rotas, IA, indexação, notificações e anonimização; fila registra rejeição sem remover o objeto | 64 testes focados e ataque autenticado E2E passaram            |
| Policies ALL nas duas tabelas de suporte                                     | Permissão mais ampla que a intenção de leitura; GRANT já limitava SELECT     | Restrição das policies a SELECT na migration nova                                                                                                             | `rbac-config-ia-canais`                                        |
| Três triggers com `search_path` mutável                                      | Resolução de nomes dependente da sessão                                      | Fixar `search_path` na migration 0248                                                                                                                         | Varredura de funções e invariantes                             |
| IP aceito sem prova do proxy                                                 | Contornar limites ou atribuir origem falsa                                   | Cabeçalho só aceito com prova do proxy configurado; IP isolado não bloqueia contratação                                                                       | `trusted-ip`, `rate-limit`                                     |
| Token Turnstile apenas no cliente seria insuficiente                         | Cadastro/ativação via requisição direta                                      | Siteverify no servidor, hostname/action e falha fechada na ativação                                                                                           | `turnstile`                                                    |
| Uso ou preço ausente tratado como zero                                       | Controle operacional e custo incorretos                                      | Custo nullable, tarifa registrada na mesma leitura e tentativas sem repetição invisível do SDK                                                                | `cost`, `model-price`, telemetria                              |
| Classificador dependia de uma chave global antiga antes de resolver o modelo | IA gerenciada somente com OpenAI pulava a classificação                      | Resolver autorizado decide disponibilidade e preço por finalidade, sem exigir a chave de outro provedor                                                       | `limiar-de-sentimento-vem-do-agente-da-conversa`               |
| Helper de Storage conferia suporte, mas não o período contratado             | Upload direto com JWT continuava possível após vencimento                    | Migration 0249 aplica o período comercial às três policies restritivas de gravação; leitura e saldo zero dentro do período permanecem permitidos              | `saas-ia-incluida` (banco) e cenário Storage E2E               |
| Helper de Storage executável diretamente consultava outra organização        | Revelar indiretamente a disponibilidade comercial de outra empresa           | Migration 0250 confere o vínculo da sessão antes da leitura do período                                                                                        | RPC autenticada E2E e controles positivos/negativos no banco   |
| Atualização da instalação não conferia escopo completo e dívida de MFA       | Administrador de suporte poderia iniciar alteração global                    | Rota exige administração completa vigente, MFA quando necessário e ausência de sessão de acompanhamento                                                       | `system/version/route.test`                                    |
| Cartão de saldo tratava acesso sem data como período válido                  | Interface sugeria atendimento humano sem direito comercial confirmado        | Cartão usa a mesma decisão comercial de acesso; vencimento e data ausente apresentam consulta, exportação e contratação                                       | `ResponseBalance.test`                                         |
| Filtro com `slug::text` no admin                                             | Busca de empresas falha no PostgREST                                         | Filtro `ilike` direto e total consultado separadamente                                                                                                        | Jornada SaaS E2E                                               |
| Consulta de saúde sem recuperação visível                                    | Permanecer em um esqueleto quando a consulta falha                           | Erro visível, última informação preservada quando disponível e ação de tentar novamente                                                                       | Falha sintética de consulta seguida de recuperação real no E2E |

As linhas descrevem riscos identificados no código e correções locais. Não afirmam
que esses riscos foram explorados em produção.

Gravidade potencial avaliada nesta revisão, pelo efeito de um abuso ou de uma
falha, sem afirmar exploração:

- **Alta:** gravações com service role sem guarda comercial, comprovação do
  WhatsApp alterável pelo cliente, vínculos entre empresas, ponteiros privados
  de arquivos e atualização global sem escopo completo/MFA. Envolvem concessão de direito, alteração de recurso
  ou ação privilegiada da instalação.
- **Média:** policies amplas de suporte, search_path mutável, cabeçalhos de IP
  sem prova, validação Turnstile insuficiente, custo desconhecido apresentado
  como zero e gravação no Storage depois do vencimento. São controles de
  autorização, contenção e operação que precisam permanecer efetivos.
- **Baixa:** exposição indireta do estado comercial pelo helper, resolução
  prematura do classificador, texto incorreto do cartão de saldo, filtro inválido
  do admin e ausência de recuperação da consulta. A classificação baixa não
  dispensa a correção nem seus controles positivos e negativos.

## Funções privilegiadas

A medição local do baseline encontrou **zero SECURITY DEFINER executáveis por
anon**, **28 executáveis por authenticated** e **zero SECURITY DEFINER com
search_path ausente**. A última métrica não cobre funções SECURITY INVOKER;
os três nomes apontados pelo advisor são verificados separadamente.

O aviso de execução autenticada requer classificação, não revogação automática:
essas funções sustentam policies, autorização e operações com invariantes.

| Classe             | Funções                                                                                                                                                                                | Limite verificado na definição                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Identidade e papel | `fn_is_platform_admin`, `fn_member_role_in_org`, `fn_role_at_least`, `fn_user_org_ids`, `fn_user_role_in`, `fn_user_role_in_org`, `fn_support_context`                                 | Identidade autenticada, vínculos da organização e contexto da sessão; consultar papel de outro usuário exige vínculo na empresa       |
| Visibilidade       | `fn_can_view_conversation`, `fn_can_view_lead`                                                                                                                                         | Resultado booleano usado pelas policies; não retorna registros do recurso                                                             |
| Suporte            | `fn_support_storage_write_allowed`, `fn_support_write_allowed`                                                                                                                         | Sessão, vínculo, validade e modo; Storage confere também o período comercial e complementa a policy de caminho, sem autorizar sozinho |
| Eventos            | `emit_event`, `fn_log_event`                                                                                                                                                           | Organização/vínculo, suporte e campos reservados; eventos internos de entrada e origem de serviço não são input público               |
| Conhecimento       | `fn_buscar_trechos_das_fontes`, `retrieve_top_k_chunks`                                                                                                                                | Organização autorizada e recursos da mesma empresa                                                                                    |
| Agenda e Google    | `fn_agenda_settings`, `fn_appointment_change`, `fn_google_counts_for_conflicts`, `fn_google_coverage`, `fn_google_resolve`, `fn_google_selection`, `fn_meet_action`, `fn_reply_action` | Papel, organização, revisões e, nas operações de usuário que exigem, titularidade/MFA; helpers de conflito retornam booleanos         |
| CRM e canais       | `fn_conversation_assign`, `fn_mesclar_contatos`, `fn_reserve_channel_connection`, `fn_set_channel_routing`                                                                             | Papel, organização e vínculos dos recursos; reservas serializadas, escopo e revisão conforme operação                                 |
| Direito do titular | `fn_lgpd_anonymize_contact`                                                                                                                                                            | Autorização da organização; rota dedicada de LGPD continua disponível                                                                 |

As novas RPCs de saldo, teste, provisionamento e ações financeiras não recebem
EXECUTE de anon/authenticated. A chave administrativa fica no servidor. As
leituras de API do tenant expõem seu saldo; custos detalhados ficam no admin.

## Advisor de produção, somente leitura

O advisor em 07/10/2026 ainda apresenta os três avisos de search_path, pois a
migration local não foi publicada. Apresenta também 28 funções privilegiadas,
13 tabelas internas com RLS sem policy, três extensões em public e proteção de
senhas comprometidas desativada no Auth. Não foram abertas policies para apagar
avisos. Mover extensões exige revisão de dependências; o ajuste de proteção de
senhas pertence à configuração do Supabase operado.

Referências: [search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable),
[funções privilegiadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable),
[tabelas internas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
O [Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
é necessário para conferir o token de ativação. O PostgREST
[não permite cast no filtro horizontal](https://docs.postgrest.org/en/stable/references/api/tables_views.html#casting-columns).

## Hotmart publicado e local

`handle-payment-webhook` publicado está na versão 2. A leitura do pacote mostra
processadores anteriores ao cálculo local de período pago e ao tratamento de
estorno recebido antes da aprovação. O local preserva identidade de transação,
processa eventos fora de ordem e alimenta os direitos comerciais pelo banco.
Publicar somente o Next não atualiza a Edge já publicada: o pacote deve ser
preparado pelo script versionado e homologado antes da ativação real.

O pacote final foi regenerado em `.superpowers/saas-hotmart-edge` com os quatro
módulos canônicos de faturamento. `deno check --frozen` passou com exit code 0,
usando o mapa de importação e o lock existentes. É uma validação estática;
nenhuma conexão ao banco, implantação da função ou entrega Hotmart real foi
executada por esse comando.

## Verificações executadas

Registro das execuções concluídas. Os testes usam `STRIVA_TEST_ISOLATED=1`, sem
carregar arquivos de credenciais do operador. O build e a jornada usam valores
sintéticos e o Supabase local separado.

`gov:verify` final terminou com **exit code 0**: typecheck, lint, gates de canal
e papel e suíte unitária completa. **842 arquivos passaram; 8.647 testes
passaram e houve uma falha esperada**, sem falha inesperada. O lint registra
zero erros e 347 avisos; não é uma execução sem avisos. O build final e os dez
cenários E2E também terminaram com exit code 0.

| Verificação                                 | Resultado confirmado                            | Limite                                                                                                                                              |
| ------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                                   | Exit code 0 após as últimas guardas de arquivos | Também aprovado pelo build final                                                                                                                    |
| Lint e gates de canal/papel                 | Zero erros; 347 avisos no lint geral            | Canal e papel passaram; os avisos não são classificados aqui como todos anteriores à alteração                                                      |
| Administração global e moeda                | 40 testes passaram em dois arquivos             | Conferem escopo completo, suporte, MFA e a organização resolvida                                                                                    |
| Alteração de papéis                         | Cinco testes passaram                           | Fixtures legadas explícitas; regras de último administrador preservadas                                                                             |
| Saldo e direito de operação                 | Cinco testes passaram                           | Incluem ausência de período, vencimento e saldo zero com atendimento humano                                                                         |
| Classificador, espanhol e ícones            | 14 testes passaram                              | Inclui resolução gerenciada com OpenAI sem chave Anthropic                                                                                          |
| Fragmento, escopo E2E e textos dinâmicos    | 37 testes passaram                              | Não substitui a jornada de navegador                                                                                                                |
| Onboarding legado e OpenRouter              | 39 testes passaram em dois arquivos             | Guarda comercial real com fixtures legadas e escopo explícito                                                                                       |
| Banco completo com 0250                     | 195 arquivos passaram; exit code 0              | 1.569 testes passaram, um caso de falha esperada e um ignorado; execução anterior às últimas guardas de arquivos                                    |
| Baseline com 0250                           | INSTALL e UPDATE passaram com `ON_ERROR_STOP=1` | As duas aplicações integram a execução verde de `test:db`                                                                                           |
| Propriedade dos arquivos privados           | 64 testes passaram em nove arquivos             | Controles positivos e rejeição de ponteiros vizinhos em mídia, IA, avatar, conhecimento e anonimização; ataque com sessão real comprovado no E2E    |
| Banco focado após guardas de arquivos       | 127 testes passaram em cinco arquivos           | SaaS, isolamento, varredura RLS, avatar LGPD e acervo; baseline em INSTALL e UPDATE passou novamente                                                |
| Supabase real: Storage, Realtime e cadastro | Dois cenários passaram em 14,5 s                | JWTs distintos, upload próprio, negação de acesso vizinho, leitura após vencimento, eventos próprios e cadastro pelo site com confirmação de e-mail |
| Redis local via SDK Upstash                 | Incremento e leitura retornaram 1               | Redis e adaptador HTTP reais, efêmeros e separados da instalação; não comprova o proxy/Redis da VPS                                                 |

Logs locais ficam em `.superpowers/`, ignorado pelo Git. Resultados de execuções
focadas não são somados como se fossem uma única suíte, nem substituem
`gov:verify`, build ou E2E completos. Tentativas de E2E interrompidas pela
compilação lenta não comprovam a jornada ou a interface.

A primeira tentativa de Storage esperava leitura direta em `whatsapp-media`,
que não possui policy permissiva para usuários: a mídia é servida por rotas
autenticadas. A prova foi corrigida para o bucket `ai-policy`, que oferece
leitura e upload por JWT. Nenhuma permissão foi aberta para fazer o teste passar.
Outra tentativa encontrou variáveis obrigatórias ausentes no auxiliar local;
foram configurados valores sintéticos e Redis real, sem afrouxar a validação
do aplicativo em produção.

A primeira execução geral foi interrompida durante os ajustes finais. Ela
mostrou também um teste de figurinha dependente da antiga classe de animação;
a asserção passou a conferir a presença e remoção do placeholder e a animação
condicionada à preferência do usuário. A repetição geral usa dois workers e
limites de 90 segundos para testes/hooks devido aos recursos da máquina local.

## Build e prova visual final

O build de produção com Next/Turbopack terminou com exit code 0, incluindo
TypeScript e as 61 páginas estáticas. Durante o build o banco descartável estava
parado; a marca usou o fallback previsto, sem interromper a compilação. A jornada
foi executada depois com Auth, banco, Storage, Realtime e Redis locais reais.

Os dez cenários dos dois arquivos E2E passaram juntos em 1,7 minuto na versão
final do aplicativo. Os quatro de `saas-ia-incluida.spec.ts` incluem cadastro
pelo site e confirmação no e-mail local, registro
automático no admin, contexto canônico do negócio, ausência de campos de chave/
modelo/provedor, escopo de saldo e Storage, eventos Realtime e recuperação da
consulta de saúde após uma falha sintética. A ativação real continua bloqueada
sem configuração Turnstile. A prévia de conversa é um dublê identificado.

A tentativa de acesso ao avatar usa uma sessão real e duas empresas no Supabase
local. O objeto próprio retorna 307 e a URL assinada devolve a imagem. O contato
vizinho retorna 404. O JWT do cliente consegue alterar o ponteiro do contato
próprio para o caminho do arquivo vizinho, mas a rota retorna 404 sem Location.
Isso comprova a necessidade de conferir também a propriedade do arquivo; a
policy da linha, sozinha, não protege o uso posterior de service role.

Os seis cenários de `inicio-primeiros-passos.spec.ts` passaram nessa mesma
execução, após ajustar a asserção financeira ao evento específico. Incluem retomada sem falsa
conclusão, manual, avatar, suporte com resposta humana, catálogo, edição de
rascunho, checkout interceptado, aprovação/cancelamento sintéticos, repetição de
webhook e consumo. Não houve compra ou chamada à Hotmart real. A restauração dos
dados fictícios omite a coluna calculada `checkout_available`.

Axe verificou o `main` da revisão do agente nos temas claro e escuro sem
violações WCAG A/AA nos critérios configurados. Isso não é uma auditoria de
acessibilidade de todas as telas. Foram verificados largura de celular,
redução de movimento, nomes longos e captura após carregamento dos indicadores.
O cadastro novo não apresenta o aviso herdado de falta de chave de IA.

Evidências locais, com dados fictícios e fora do Git:

| Tela                         | Desktop                                                                                                                                                | Celular                                                                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Seu negócio                  | [claro](../../.superpowers/evidence/saas-ia-incluida/negocio-desktop.png)                                                                              | [claro](../../.superpowers/evidence/saas-ia-incluida/negocio-mobile.png)                                                                               |
| Seu agente pronto            | [claro](../../.superpowers/evidence/saas-ia-incluida/agente-desktop.png)                                                                               | [claro](../../.superpowers/evidence/saas-ia-incluida/agente-mobile.png), [escuro](../../.superpowers/evidence/saas-ia-incluida/agente-dark-mobile.png) |
| Empresas no admin            | [claro](../../.superpowers/evidence/saas-ia-incluida/empresas-desktop.png)                                                                             | [claro](../../.superpowers/evidence/saas-ia-incluida/empresas-mobile.png)                                                                              |
| Operação SaaS                | [claro](../../.superpowers/evidence/saas-ia-incluida/admin-desktop.png), [escuro](../../.superpowers/evidence/saas-ia-incluida/admin-dark-desktop.png) | [claro](../../.superpowers/evidence/saas-ia-incluida/admin-mobile.png)                                                                                 |
| Início                       | [claro](../../.superpowers/evidence/saas-ia-incluida/inicio-desktop.png)                                                                               | [claro](../../.superpowers/evidence/saas-ia-incluida/inicio-mobile.png), [escuro](../../.superpowers/evidence/saas-ia-incluida/inicio-dark-mobile.png) |
| Faturamento e consumo legado | [claro](../../.superpowers/evidence/inicio-primeiros-passos/faturamento-consumo-cancelamento.png)                                                      | [claro](../../.superpowers/evidence/inicio-primeiros-passos/faturamento-consumo-mobile.png)                                                            |

## Living System Checklist

1. **Entrada:** cadastro autenticado, confirmação Auth, canal verificado e eventos
   Hotmart validados; nenhuma organização financeira vem do body do cliente.
2. **Saída:** conta comercial alimenta `managedSettings`, reserva de resposta,
   dashboard, Faturamento e ficha da empresa no admin.
3. **Registro:** `ai_credit_ledger`, reservas/partes, `llm_calls` com tarifa,
   `billing_webhook_events` e `api_audit_log` com motivo administrativo;
   rejeição de remoção fora do escopo permanece em `storage_redaction_queue`.
4. **Tela:** `ResponseBalance`, `SaasOverview`, `CompanyAiAccount`, telas IA e
   Financeiro e avisos `commercial_ai_paused` na Central.
5. **Porta:** navegação registrada em `lib/navigation/registry.ts`, sidebar do
   admin e caminho inicial `/onboarding/setup-ai`.
6. **Próximo passo:** pausa indica Faturamento/ajuste; envio incerto conserva a
   reserva e oferece reconciliação administrativa; erro de consulta oferece retry.
7. **Configuração:** IA e tarifas em `/admin/ai`, franquias em planos, templates
   versionados e configurações avançadas fora do caminho inicial.
8. **Continuidade:** saldo esgotado pausa IA, preservando humano no período válido;
   organizador separado e handoff com contexto; plano encerrado preserva consulta,
   exportação, suporte e contratação.
9. **Retorno:** contratação/ajuste pode resolver a pausa; reconciliação confirma
   ou libera a reserva com motivo; telemetria desconhecida exige verificar tarifa,
   sem apresentar custo fictício.
10. **Mapa:** `saas-ia-incluida.architecture.json` registra consumidores e registros
    concretos, com entrada e saída de cada peça.

## Integrações que a prova local não substitui

Os artefatos locais estão preparados para revisão e homologação: código,
migrations 0248 a 0250, baseline reaplicável, MANIFEST, tipos gerados, pacote
Edge conferido, fragmento de release e runbooks. `release:conferir` e
`git diff --check` passaram; não houve corte de release, commit ou publicação.
Dockerfiles, compose e kit de instalação não foram alterados nesta etapa;
builds das imagens e `test:shell` não foram repetidos. O baseline foi exercitado
em instalação e atualização pelo gate de banco.

Ainda exigem homologação externa: pareamento e envio real WAHA, entrega incerta
do provedor, token Turnstile real com domínio/proxy/Redis do operador, chamada
paga e preços confirmados do provedor de IA, webhooks Hotmart reais e atualização
da instalação na VPS. A prévia fictícia não prova atendimento real. Nenhuma
dessas integrações é ativada pela criação dos artefatos locais.
