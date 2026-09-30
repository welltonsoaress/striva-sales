# Revisão de operação — 30/09/2026

## Diagnóstico e limites

**CONFIRMADO**, por consultas agregadas e somente leitura em produção: às
09h24–09h25 (UTC−3), dez chamadas `flywheel_judge` avaliaram dez turnos que já
possuíam veredito. Os mesmos turnos apareceram nas rodadas de 03h e 15h. As
chamadas foram registradas como `ok`, sem comprovar que sejam a origem dos
popups vermelhos relatados. A seleção anterior limitava os últimos turnos sem
excluir vereditos; `ON CONFLICT` evitava duplicar a escrita depois de gastar IA.

**CONFIRMADO**, nos logs do Supabase entre 08h53 e 09h00: sete respostas 500
em `fn_decrypt_oauth`, SQLSTATE `39000`. A sessão WAHA possui o marcador
legado de um byte; ambas as rotas tentavam decifrá-lo incondicionalmente.
**INFERIDO:** esse caminho explica o ruído de decrypt; não há correlação
suficiente para afirmar que ele provocou os avisos na interface.

As leituras da interface chamam `showApiError` dentro de consultas que podem
ser repetidas. Avisos sem identidade podiam se empilhar. A correção usa um ID
por status/código, mantendo o último request ID para diagnóstico. Ela não
transforma erro em sucesso nem elimina os avisos de códigos diferentes.

Nas execuções recentes do Operador, houve consultas a funis/etapas sem escrita
confirmada. O contexto agora entrega negócios abertos do contato e destinos
reais; isso reduz a dependência de descobrir IDs por várias consultas. Não
prova que todos os turnos anteriores precisavam de movimento. Os negócios
atuais fechados pela equipe não foram modificados nesta revisão.

## Contratos implementados

- `flywheel/live.ts`: exclui vereditos `live/memory_hygiene` antes do LIMIT e
  antes do modelo; advisory lock serializa rodadas, com queries na mesma
  conexão, inclusive com pool de uma vaga. O gate humano de propostas continua.
- `operator-funnel-context.ts` → `operator-turn.ts`: até seis negócios abertos,
  organização/contato do job e funis da versão publicada; etapas ativas com
  descrição e marcadores. A ferramenta revalida antes de escrever.
- `inbound-turn.ts` → `move-lead-stage.ts` → `agent-stage-sync.ts`: espelhamento
  respeita o escopo publicado, filtra a organização e preserva a trava otimista.
  O evento de etapa leva o status devolvido pelo trigger, inclusive ganho/perda.
- `waha/session-secret.ts` → duas rotas de webhook: marcador vazio não é
  enviado ao decrypt. `authenticateWahaWebhook` continua decidindo assinatura
  e precedência de segredos, sem nova exceção de autenticação.
- `management/report.ts`: texto diário estruturado e semanal comparativo, com
  sugestões baseadas em regras, contagens por organização e régua explícita.
  Falha de leitura não é zero. Não muda dados nem usa outra chamada de IA.

## Living System Checklist

1. **Entrada:** `job_queue`, versões publicadas e tabelas do CRM; relatórios
   usam `management_bindings` e fuso de `organizations`.
2. **Saída:** contexto alimenta o Operador; movimentos alimentam atividades e
   `lead.stage_changed`; relatórios alimentam `management_outbox`.
3. **Registro:** `llm_calls`, vereditos/propostas do flywheel,
   `agent.operator_turn`, `crm_lead_activities`, `event_log` e histórico de envio.
4. **Superfície:** Execuções de IA, Central, timeline/board e WhatsApp do gestor.
5. **Porta:** navegação existente de IA, funis, Radar e Assistente de gestão.
6. **Continuidade:** promessas sem dono continuam na Central; fila gerencial
   preserva desfechos e não reenvia resultado incerto. Leitura de contexto não
   cria demanda independente nem exige mecanismo próprio de expiração.
7. **Configuração:** editor do agente define funis/capacidades; editor de etapas
   define mapeamento; Assistente define horários, inscrições e gestor verificado.
8. **IA↔humano:** handoff e concorrência continuam guardados; o dono revisa
   propostas de melhoria e executa sugestões dos relatórios no seu tempo.
9. **Retorno:** veredito impede nova avaliação paga; correção humana de etapa
   mantém o laço existente do CRM; falhas de processamento/envio gerencial
   aparecem na Central. Sugestões não se autopublicam nem alteram a operação.
10. **Mapas:** `agent-turn.workflow.json`,
    `assistente-gestao-whatsapp.architecture.json` e
    `avaliacao-atendimento.architecture.json` descrevem consumidores reais.

## Validação e publicação

Testes focados cobrem concorrência do flywheel, contexto e escopo do funil,
status no evento, autenticação e marcador WAHA, avisos e formatação/consulta
dos relatórios. Os invariantes novos de banco devem rodar no gate `test:db`:
duas rodadas pagam uma avaliação, pool de uma vaga não trava e contexto não
entrega negócio de outro funil/organização.

Docker local estava indisponível durante a revisão. A jornada em Supabase
fresco e o transporte real do WhatsApp não foram homologados. Uma prévia com
dados fictícios comprova somente a apresentação do relatório.

Esta revisão prepara código; não altera configuração nem dados de clientes
e não publica a landing. Antes de liberar, concluir os gates de banco/E2E,
publicar as imagens pelo CI e seguir o [runbook de deploy](deploy.md).
Após atualizar, uma rodada sem novos turnos elegíveis não deve criar novas
chamadas `flywheel_judge`; confirmar também webhook assinado, movimento de
negócio de teste e recebimento dos relatórios pelo gestor de homologação.
