# Revisão dos dois planos — 08/10/2026

## Escopo e método

Revisão local das mudanças de SaaS/IA incluída e de créditos/preços/clínicas. O inventário inicial contém **341 arquivos: 187 rastreados alterados e 154 novos**; o fechamento inclui **362 arquivos**, após 21 arquivos adicionais de correção, regressão e documentação. A contagem inclui testes, traduções, documentação, baseline e tipos gerados. Nos arquivos rastreados, o levantamento inicial sem diferenças de espaço encontrou 18.783 inserções e 10.684 remoções; isso não inclui o conteúdo dos arquivos novos.

A revisão acompanha os caminhos completos e suas fronteiras: entrada autenticada, organização, validação, permissão, chamada de IA, reserva, canal, confirmação, histórico e recuperação. Arquivos novos funcionais receberam leitura de conteúdo; diffs existentes foram examinados com contexto. Nos testes, foram conferidos diffs, casos/assertivas e fixtures dos contratos críticos. **Isso não equivale a afirmar leitura literal de toda linha herdada ou formatada.**

[Inventário por arquivo e método](revisao-dois-planos-arquivos.md).

| Frente | Arquivos do inventário inicial | Conferência |
| --- | ---: | --- |
| Segurança/API/autenticação | 37 | Contexto confiável, organização explícita, guards, suporte e Storage |
| IA/workers/automações | 38 | Entradas de IA, contexto por empresa, reserva/envio, limites e custos |
| Banco | 17 | Migrations 0243–0251, apêndices, grants, policies e vínculos compostos |
| Faturamento | 23 | Checkout, snapshots, períodos, saldo, webhooks, reversões e renovação |
| Onboarding/templates | 14 | Provisionamento retomável, memória canônica, segmentos e capacidades |
| UI | 79 | Dashboard/admin/marketing/planos/faturamento e caminhos do usuário |
| Gestão/suporte | 7 | Operações pelo WhatsApp, consulta, propostas, confirmação e histórico |
| Testes | 84 | Contratos, assertivas, controles positivos e cenários adversariais |
| Configuração | 19 | Ambiente público de exemplo, CI, scripts e referências |
| Documentação | 22 | Specs, runbooks, mapas, release e limitações anteriores |
| Tipos gerados | 1 | Estrutura dos contratos; sem edição manual |

As correções e regressões adicionais desta revisão também constam no inventário. O dicionário anterior tem **5.610 chaves com valores próprios iguais ao HEAD**, conferidos por AST; a funcionalidade nova está nos catálogos importados. O baseline foi conferido nos apêndices afetados, sem alegação de releitura integral das partes antigas sem diff.

## Problemas confirmados e corrigidos

| Prioridade | Problema | Correção local |
| --- | --- | --- |
| P1 | `send_ai_message` gerava/enviava IA sem reservar os dez créditos | Reserva antes do modelo; identidade por evento/regra/índice; mesma identidade no canal |
| P1 | Timeout podia liberar crédito e permitir novo envio sem comprovar rejeição | `send_timeout`/`delivery_unknown` permanecem incertos; ledger conserva identidade e não reenvia |
| P1 | Processo interrompido deixava automação sem recuperação segura | Lock de sessão durante execução; replay reconcilia recibos; admin não libera executor vivo |
| P1 | Comando pendente pelo WhatsApp podia modificar CRM após vencimento | Guard comercial antes da proposta e antes da confirmação; falha transitória segue recuperável |
| P1 | Automações com service role alteravam CRM de contrato encerrado | Guard antes de preflight/ações, motivo visível no run e auditoria; contador escopado por empresa |
| P2 | Worker legado podia resolver IA gerenciada durante migração concorrente | Confere também a origem resolvida antes do modelo e encaminha ao runtime gerenciado |
| P1 | Salvar/restaurar agente perdia instruções específicas do organizador | Campo preservado nos contratos, editor, criação e restauração; publicação imutável no banco |
| P1 | Revisar o negócio abria descrição vazia e fuso padrão, sobrescrevendo configuração | Leitura da fonte canônica e fuso salvo; erro impede editar dados desconhecidos; formulário preserva ajustes |
| P2 | Empresa gerenciada ativada continuava em 80% e apontava ao fluxo legado | Progresso de três etapas com ativação explícita; progresso legado conservado |
| P2 | Retentar ativação podia reutilizar token Turnstile consumido | Renovação do token no `finally`, mantendo agente e consentimento |
| P2 | Migração atribuía chamadas legadas anteriores ao teto operacional da plataforma | Origem histórica nos recibos novos; teto exclui origem explicitamente legada e trata origem desconhecida conservadoramente |
| P2 | Pagamento de empresa suspensa registrava franquia que não foi concedida | Extrato alinhado ao saldo efetivamente preservado no ciclo |
| P2 | Evento financeiro com falha aparecia sem caminho de recuperação | Reprocessamento para `failed` e `unmatched`, com autorização de plataforma |
| P2/P3 | Admin descrevia um crédito como mensagem e mostrava ajustes antigos como respostas | Dez créditos por mensagem; ajustes novos identificam régua; auditoria antiga mostra unidades originais |
| P2/P3 | Cards comerciais abriam lista geral e segmentos em espanhol ficavam em português | Filtros nos destinos e traduções dos quinze segmentos |

Mantidas as correções do passe anterior: faturamento renova o ciclo antes de consultar consumo e carrega os checkouts dos contratos exibidos, sem depender do limite de mil linhas da API. O runbook comercial agora usa créditos e distingue a integração publicada anteriormente da implementação local atual.

## Banco, isolamento e compatibilidade

- Migration nova **0252**, apêndice idempotente correspondente no baseline e MANIFEST atualizado. A instalação e a atualização foram executadas com `ON_ERROR_STOP=1`.
- As alterações de 0252 substituem corpos de funções existentes; não acrescentam colunas, tabelas, parâmetros ou tipos de retorno. Os contratos gerados existentes continuam válidos; `lib/database.types.ts` não foi editado manualmente.
- Helpers financeiros continuam restritos a service role; a função de imutabilidade é trigger, sem EXECUTE público. Não foram abertas policies para silenciar avisos de tabelas internas.
- Conferidos vínculos compostos de memória, checkout/contrato/pagamento, reservas/partes e mensagens/reservas, além das consultas administrativas por organização.
- Organizações legadas conservam credenciais, agentes, publicações e régua anterior até migração explícita. Recibos antigos e auditoria não são recalculados.
- Compartilhar credencial de IA não compartilha memória, conhecimento, histórico, arquivos ou filas; o contexto continua resolvido e consultado por empresa.
- Os testes não encontraram novo acesso cruzado nos caminhos exercitados. Essa conclusão é delimitada pelos cenários descritos; não é certificação absoluta de segurança.

## Validação desta revisão

**Concluído na árvore local:**

- Typecheck integral: **zero erros**.
- ESLint integral: **zero erros**, 347 avisos já presentes na verificação anterior. Checks de canais, papéis e arquitetura são registrados na evidência local complementar.
- **233 testes unitários relevantes**, em execuções focadas: 69 de automação de mensagem, ledger, entrega incerta, editor, validação de agente, custo operacional, progresso/formulário, gestão e motor de automações; mais 164 checks existentes de marca, tradução e mapas de arquitetura, que foram afetados pelas correções.
- **159 testes de banco em nove arquivos**, todos verdes, incluindo instalação e atualização do baseline, regras de créditos, Hotmart, histórico, isolamento/RLS e permissões.
- Regressões novas cobrem dez créditos concorrentes, bloqueio antes do modelo, envio/debito único, falha de modelo, timeout, reserva de outra organização/finalidade, recuperação sem segundo envio, proteção contra reconciliação de executor vivo, organizador publicado imutável, extrato de conta suspensa e origem histórica de custo.
- O caso de capacidade foi fortalecido: duas solicitações competem pela última vaga de usuários e WhatsApps; exatamente uma passa em cada recurso e a contagem final respeita o limite.

Os testes novos revelaram dois problemas de fixture/assertiva, corrigidos antes do resultado final: o editor precisava de uma alteração para habilitar Salvar, e a tarifa calculada em ponto flutuante exige comparação numérica com tolerância. A primeira instalação do apêndice também detectou uma substituição de delimitadores SQL no auxiliar local; foi corrigida, seguida de instalação, atualização e nove arquivos de banco verdes.

**Evidências anteriores reaproveitadas:** build de produção com 61 páginas estáticas; seis jornadas E2E com Supabase isolado, desktop/celular, catálogo, `/clinicas`, cadastro/admin, saldo/recuperação, checkout sintético e controles positivos de Storage/Realtime. Há screenshots fictícios de homepage, clínicas, planos, faturamento e admin em `.superpowers/evidence/saas-ia-incluida/`.

Esses build/E2E não foram repetidos nesta revisão. As correções novas de UI receberam testes focados de comportamento e revisão de fluxo, sem nova certificação visual em navegador. O `gov:verify` anterior teve uma falha de branding e erros ambientais de React/jsdom; a regressão foi corrigida e os testes afetados passaram, mas **não se declara a suíte integral novamente verde**. Não foram repetidas suítes extensas sem mudança relacionada. Packaging não foi alterado neste passe; shell/imagens não foram executados novamente.

Evidência local desta revisão: `.superpowers/review-all/` e `.superpowers/review-ui-unit.txt`. Os logs anteriores permanecem em `.superpowers/credits-*.txt`. Os auxiliares são ignorados pelo Git e não integram o produto.

## Continuidade e operação

As automações recebem o evento autenticado, conferem contrato, reservam saldo e alimentam runtime/canal. Seu resultado aparece na atividade da regra. Falhas de acesso registram motivo e auditoria; falhas de consulta mantêm recuperação no drain. Recibos incertos alimentam `/admin/ai/health`, que reconcilia com evidência real, conservando a reserva quando faltar confirmação. O mapa `saas-ia-incluida.architecture.json` inclui essas ligações e a origem histórica de custos.

O atendimento humano permanece disponível com saldo esgotado durante o período ativo. Expiração mantém consulta, exportação, suporte e contratação; comandos de alteração não usam o acesso administrativo para contornar o contrato. Configurações e limites permanecem nas superfícies administrativas existentes, sem novas escolhas técnicas no cadastro simples.

## Homologação ainda necessária

Antes de publicação comercial: conferir os seis preços/links no checkout real, retorno SCK, renovação e reversões emitidas pela Hotmart; cadastrar/homologar o link do pacote de R$49,99; validar IA e tarifas reais, conexão/envio WAHA e Turnstile no domínio/proxy efetivos. A amostra local de custos não representa toda a fatura do provedor. Origem histórica ausente e custo nulo continuam identificados como desconhecidos.

Esta revisão não publicou na VPS, ativou venda real nem alterou a Luana em produção. Todas as regressões financeiras e jornadas reaproveitadas usam empresas e dados fictícios.
