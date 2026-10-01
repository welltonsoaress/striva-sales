# ASSET_MANIFEST — biblioteca visual Striva Sales

Coleta em **01/10/2026**, fuso **America/Fortaleza**, diretamente na instalação [Striva Sales](https://161-97-145-186.sslip.io/app) autenticada. **18 imagens: 8 approved, 9 reference e 1 rejected.**

## Origem e limites da revisão

**CONFIRMADO pela tela:** identidade Striva Sales no logo e título do navegador; rodapé indica versão **1.2.0**. As capturas representam esta instalação na data da coleta. O commit da imagem instalada e sua correspondência com a versão do repositório **não foram medidos**. Nenhuma tela antiga foi reutilizada e nenhuma marca DeskComm/DeskCommCRM foi observada nas imagens entregues.

Havia somente uma organização disponível no seletor, sem indicação de demo. Os contatos e agendamentos foram tratados como reais, mesmo que pudessem ser testes. Capturas com nomes, telefones, e-mail da conta conectada, histórico de conversas ou detalhes clínicos não foram gravadas. A sanitização foi feita por **recortes e filtros da própria interface antes de salvar**; não houve alteração de pixels, reconstrução da interface ou geração de imagens por IA. Não há originais pessoais não sanitizados nesta biblioteca.

O formulário de oportunidade é a única cena com texto fictício preparado nesta coleta: título e descrição foram digitados, capturados e descartados em **Cancelar**. Nenhum lead, tarefa ou compromisso foi criado; nenhuma mensagem foi enviada; não foram alterados agentes, fluxos, publicação, integrações ou credenciais. O botão Fit View foi usado apenas para examinar o enquadramento do editor.

As imagens passaram por inspeção visual. JPEGs foram abertos para conferir formato e dimensões; os hashes completos estão em [assets.json](assets.json). A aprovação aqui é editorial para o **uso recomendado de cada imagem**, não autorização de publicação externa nem prova de funcionamento de integrações.

## Classificação

- **approved:** recorte atual, legível e sem identidade de cliente; pode entrar em material comercial dentro do uso indicado. Não inferir resultado comercial a partir de uma lista ou botão.
- **reference:** material de consulta interna; estado vazio, dados operacionais, conteúdo de um nicho ou enquadramento insuficiente exigem nova captura demo antes de campanha.
- **rejected:** não usar em material comercial; motivo explícito registrado. Mantido separado apenas como evidência da revisão.

Só a pasta **approved/product/** é fonte de imagens de produto para marketing. Não copiar reference/ ou rejected/ para uma pasta pública ou tratar as três categorias como intercambiáveis.

## Estrutura

```text
product/library/
  ASSET_MANIFEST.md
  README.md
  assets.json
  approved/product/   # 8 imagens para os usos autorizados no manifesto
  reference/product/  # 9 referências internas
  rejected/product/   # 1 evidência interna de rejeição
```

[README.md](README.md) oferece prévias das imagens approved. [assets.json](assets.json) contém caminho, status, origem, horário UTC de gravação, dimensões, tamanho e SHA-256 de cada arquivo.

## Cobertura e cenas ainda necessárias

| Área solicitada | Captura entregue | Limite para marketing |
| --- | --- | --- |
| Inbox / WhatsApp | Compositor approved; fila vazia reference | Conversa completa com atendimento IA↔humano precisa de contatos e mensagens fictícios em demo. |
| CRM / Funil | Lista de funis approved; quadro filtrado reference | Kanban preenchido com oportunidades fictícias ainda precisa de demo. |
| Oportunidade | Formulário fictício de cadastro approved | Dossiê de oportunidade existente, histórico e vínculos não foram capturados com dados reais. |
| Follow-up | Lista de fluxos approved; editor reference | Fluxo curto, grafo legível e fila com destinatários fictícios precisam de demo. |
| Radar | Estado operacional sem identificadores reference | Cenário com cartões de risco e próximos passos fictícios ainda precisa de demo. |
| Agenda | Semana livre e grade diária reference | Calendário preenchido e detalhe de compromisso precisam de participantes fictícios em demo. |
| Agentes IA | Lista de agente e hub de recursos approved | Não foram abertos prompts privados nem credenciais. |
| Gestão / Relatórios | Hub approved; painel de desempenho reference | Painel com números demonstrativos identificados precisa de demo; dados atuais não são benchmark. |
| Outras comerciais | Navegação approved; respostas rápidas e tarefas reference; acervo rejected | Substituir conteúdo específico da operação e preparar cenas fictícias antes de campanha. |

A revisão de marca foi observação da interface; não houve auditoria geral do código. **INFERÊNCIA conservadora:** a organização disponível é operacional, porque não estava identificada como demonstração. Não se afirma que os contatos observados sejam pessoas reais, mas a proteção adotada foi a de dados reais.

## Inventário por imagem

### approved

#### Inbox / WhatsApp — compositor

- **Nome / arquivo:** [striva-inbox-compositor-2026-10-01.jpg](approved/product/striva-inbox-compositor-2026-10-01.jpg)
- **Funcionalidade:** Resposta humana, nota interna, anexos, áudio e assistência do agente no compositor.
- **Status:** `approved`
- **Risco:** Baixo. Imagem mostra controles disponíveis; não comprova entrega de mensagem nem conteúdo de atendimento.
- **Uso recomendado:** Detalhe de produto em página comercial ou apresentação: responder e registrar nota no mesmo atendimento.
- **Sanitização e contexto:** Recorte exclusivo do compositor. Nome, telefone, histórico, contato e cabeçalho ficaram fora da imagem. Campo Mensagem vazio; nenhuma sugestão foi gerada e nenhuma mensagem foi enviada.
- **Origem:** `/app/inbox` · 624 × 145 px · JPEG · SHA-256 `72381e58ff75fdee…` (completo no inventário JSON).

#### CRM — lista de funis

- **Nome / arquivo:** [striva-crm-funis-2026-10-01.jpg](approved/product/striva-crm-funis-2026-10-01.jpg)
- **Funcionalidade:** Lista de funis, funil padrão, importação e acesso ao quadro.
- **Status:** `approved`
- **Risco:** Baixo. Os nomes de funis representam a configuração encontrada, não modelos obrigatórios de todo cliente.
- **Uso recomendado:** Tour de CRM e explicação de múltiplos funis. Não usar como exemplo de Kanban preenchido.
- **Sanitização e contexto:** Cabeçalho da organização e usuário excluído. Lista com nomes genéricos de processos; nenhum contato.
- **Origem:** `/app/kanban` · 1242 × 612 px · JPEG · SHA-256 `2d8ec5c45c181354…` (completo no inventário JSON).

#### Oportunidade — formulário demonstrativo

- **Nome / arquivo:** [striva-oportunidade-cadastro-demo-2026-10-01.jpg](approved/product/striva-oportunidade-cadastro-demo-2026-10-01.jpg)
- **Funcionalidade:** Cadastro manual com título, descrição, etapa, valor, fechamento previsto e tags.
- **Status:** `approved`
- **Risco:** Baixo. É formulário de criação, não dossiê de uma oportunidade existente.
- **Uso recomendado:** Explicar como registrar uma oportunidade. Preservar a identificação demonstrativa.
- **Sanitização e contexto:** Modal isolado. Título e descrição explicitamente fictícios digitados apenas no formulário e descartados em Cancelar. Valor e datas não preenchidos; nenhum lead foi criado.
- **Origem:** `/app/pipelines/:pipeline_id` · 512 × 612 px · JPEG · SHA-256 `90f0d4894ce7ae6c…` (completo no inventário JSON).

#### Follow-up — biblioteca de fluxos

- **Nome / arquivo:** [striva-followup-fluxos-2026-10-01.jpg](approved/product/striva-followup-fluxos-2026-10-01.jpg)
- **Funcionalidade:** Lista de automações com status e versão publicada, política de handoff e acesso à fila.
- **Status:** `approved`
- **Risco:** Baixo. Configuração da instalação; status Ativo não prova execução ou resultado comercial.
- **Uso recomendado:** Apresentar a organização dos fluxos de retomada. Evitar promessa de recuperação garantida.
- **Sanitização e contexto:** Cabeçalho excluído. Apenas configuração genérica de fluxo; nenhum destinatário, mensagem de cliente ou credencial.
- **Origem:** `/app/ai/followups` · 1480 × 612 px · JPEG · SHA-256 `c1b0a9ccf7bae87e…` (completo no inventário JSON).

#### Agentes IA — lista e publicação

- **Nome / arquivo:** [striva-agentes-ia-2026-10-01.jpg](approved/product/striva-agentes-ia-2026-10-01.jpg)
- **Funcionalidade:** Assistente configurado, modelo, descrição, tipo e estado Publicado.
- **Status:** `approved`
- **Risco:** Baixo. Modelo, nome e nomenclatura mcp_agent são específicos da configuração retratada.
- **Uso recomendado:** Tour de configuração dos assistentes. Não usar o modelo mostrado como compromisso de disponibilidade futura.
- **Sanitização e contexto:** Cabeçalho excluído. Luana aparece como nome do assistente de IA, não como identidade de um cliente. Nenhum prompt privado, chave ou conversa foi capturado.
- **Origem:** `/app/ai/agents` · 1240 × 612 px · JPEG · SHA-256 `acd5f7c8f7e39d7f…` (completo no inventário JSON).

#### Gestão — hub de análise

- **Nome / arquivo:** [striva-gestao-hub-analise-2026-10-01.jpg](approved/product/striva-gestao-hub-analise-2026-10-01.jpg)
- **Funcionalidade:** Portas para Desempenho, Meta Ads, Atividades, Evolução da IA e Audit Log.
- **Status:** `approved`
- **Risco:** Baixo. A imagem comprova a superfície de navegação; integrações e resultados não foram testados nesta coleta.
- **Uso recomendado:** Visão geral dos recursos de acompanhamento e gestão, sem resultados numéricos.
- **Sanitização e contexto:** Cabeçalho excluído. Apenas navegação e descrições de funções; sem métricas, nomes ou histórico.
- **Origem:** `/app/analise` · 1240 × 612 px · JPEG · SHA-256 `5a7720ec53cb438b…` (completo no inventário JSON).

#### IA — montar e ensinar o assistente

- **Nome / arquivo:** [striva-ia-hub-recursos-2026-10-01.jpg](approved/product/striva-ia-hub-recursos-2026-10-01.jpg)
- **Funcionalidade:** Agentes, Follow-ups, Roteadores, Credenciais, Provedores, Conhecimento, Memória e Skills.
- **Status:** `approved`
- **Risco:** Baixo. Credenciais é apenas um cartão de navegação; nenhuma chave foi aberta ou capturada.
- **Uso recomendado:** Apresentar os recursos para preparar o atendimento. Usar texto comercial que explique os termos técnicos.
- **Sanitização e contexto:** Recorte de duas seções completas do hub; cabeçalho, identificação da organização e cartões inferiores cortados foram excluídos.
- **Origem:** `/app/ai` · 1168 × 490 px · JPEG · SHA-256 `ca18bc7525aa0dd6…` (completo no inventário JSON).

#### Marca Striva Sales — navegação atual

- **Nome / arquivo:** [striva-navegacao-marca-atual-2026-10-01.jpg](approved/product/striva-navegacao-marca-atual-2026-10-01.jpg)
- **Funcionalidade:** Logo atual, navegação do CRM, IA, canais, análise, configurações e versão indicada no rodapé.
- **Status:** `approved`
- **Risco:** Baixo. Sidebar estava rolada: o grupo Atendimento não aparece. A versão visível é uma observação da instalação, não afirmação de última release.
- **Uso recomendado:** Contexto de marca e navegação. Não apresentar como mapa completo de todos os módulos.
- **Sanitização e contexto:** Somente sidebar. Todo conteúdo do tenant, seletor da organização e menu de usuário ficaram fora do recorte.
- **Origem:** `/app/ai` · 240 × 668 px · JPEG · SHA-256 `af4170588a815661…` (completo no inventário JSON).

### reference

#### Inbox — fila vazia

- **Nome / arquivo:** [striva-inbox-fila-vazia-2026-10-01.jpg](reference/product/striva-inbox-fila-vazia-2026-10-01.jpg)
- **Funcionalidade:** Busca, tags, filtros, filas e seleção de conversa.
- **Status:** `reference`
- **Risco:** Baixo de privacidade; alto de inadequação como imagem principal, pois não demonstra atendimento em andamento.
- **Uso recomendado:** Referência interna de layout e estados vazios. Recapturar em organização demo com conversa fictícia antes de campanha.
- **Sanitização e contexto:** Aba Fila sem conversas; cabeçalho excluído. Nenhuma mensagem ou identidade de contato.
- **Origem:** `/app/inbox` · 1242 × 612 px · JPEG · SHA-256 `962006da0495e346…` (completo no inventário JSON).

#### CRM — quadro filtrado sem contatos

- **Nome / arquivo:** [striva-crm-quadro-filtrado-vazio-2026-10-01.jpg](reference/product/striva-crm-quadro-filtrado-vazio-2026-10-01.jpg)
- **Funcionalidade:** Colunas de etapas e filtros de responsável, status, tag e atraso.
- **Status:** `reference`
- **Risco:** Baixo de privacidade; quadro vazio e parcialmente visível, sem evidência visual de movimentação de oportunidades.
- **Uso recomendado:** Referência de estrutura. Para campanha, usar quadro demo preenchido com negócios fictícios e etapas visíveis.
- **Sanitização e contexto:** Filtro Perdidos aplicado pela UI e confirmado sem cards. Nenhuma captura do quadro com contatos reais foi salva.
- **Origem:** `/app/pipelines/:pipeline_id?status=lost` · 1242 × 612 px · JPEG · SHA-256 `ffb2ba3c99267ebc…` (completo no inventário JSON).

#### Follow-up — editor de fluxo publicado

- **Nome / arquivo:** [striva-followup-editor-publicado-2026-10-01.jpg](reference/product/striva-followup-editor-publicado-2026-10-01.jpg)
- **Funcionalidade:** Nós de classificação, mensagem, ação e fim; gatilho e pausa durante handoff.
- **Status:** `reference`
- **Risco:** Médio de uso comercial. Nós pequenos e partes do grafo fora do enquadramento; tempos refletem uma configuração real, não um padrão ou SLA.
- **Uso recomendado:** Referência interna do construtor. Recapturar um fluxo demonstrativo curto e legível para aprovação comercial.
- **Sanitização e contexto:** Recorte do editor, sem destinatários e sem conteúdo dos templates. Nenhuma configuração foi salva ou publicada.
- **Origem:** `/app/ai/followups/:flow_id` · 1240 × 612 px · JPEG · SHA-256 `11b68dc8c944343b…` (completo no inventário JSON).

#### Radar — estado operacional sem identificação

- **Nome / arquivo:** [striva-radar-operacional-2026-10-01.jpg](reference/product/striva-radar-operacional-2026-10-01.jpg)
- **Funcionalidade:** Demandas sem próximo passo e categorias crítico, em risco e em voo.
- **Status:** `reference`
- **Risco:** Médio. Contagem e idade da demanda são dados da operação atual, não exemplos fictícios nem resultados generalizáveis.
- **Uso recomendado:** Referência interna. Recapturar cenário demo claramente identificado para comunicar recuperação de oportunidades.
- **Sanitização e contexto:** Cabeçalho excluído. Linha aparece como Contato sem nome; nenhum telefone, nome, mensagem ou detalhe de atendimento.
- **Origem:** `/app/radar` · 1240 × 612 px · JPEG · SHA-256 `dfc65548b33b2a17…` (completo no inventário JSON).

#### Agenda — semana sem compromissos

- **Nome / arquivo:** [striva-agenda-semana-livre-2026-10-01.jpg](reference/product/striva-agenda-semana-livre-2026-10-01.jpg)
- **Funcionalidade:** Navegação de períodos, criação de agendamento, visão semanal e histórico.
- **Status:** `reference`
- **Risco:** Baixo de privacidade; estado vazio, texto inferior parcialmente cortado e iniciais de filtros. Não mostra rotina de agendamentos.
- **Uso recomendado:** Referência interna de controles. Para campanha, recapturar agenda demo com compromissos fictícios.
- **Sanitização e contexto:** Semana 4–10 de outubro sem eventos. Recorte exclui organização, usuário, conta Google conectada e compromissos anteriores. Apenas iniciais genéricas dos filtros de equipe permanecem.
- **Origem:** `/app/agenda` · 1192 × 498 px · JPEG · SHA-256 `59681e1eae6f2e39…` (completo no inventário JSON).

#### Agenda — grade diária sem compromissos

- **Nome / arquivo:** [striva-agenda-grade-diaria-vazia-2026-10-01.jpg](reference/product/striva-agenda-grade-diaria-vazia-2026-10-01.jpg)
- **Funcionalidade:** Grade de horários do dia 1 de outubro.
- **Status:** `reference`
- **Risco:** Baixo de privacidade; vazio, espaço lateral e ausência de contexto. Não comprova disponibilidade externa ou sincronização Google.
- **Uso recomendado:** Referência da grade de horários. Não publicar como prova de agenda integrada funcionando.
- **Sanitização e contexto:** Visão Dia sem eventos. Somente grade; e-mail, cabeçalhos, filtros de equipe e pacientes fora da captura.
- **Origem:** `/app/agenda` · 1144 × 720 px · JPEG · SHA-256 `19fa3516979637d9…` (completo no inventário JSON).

#### Gestão — desempenho da instalação

- **Nome / arquivo:** [striva-gestao-desempenho-operacional-2026-10-01.jpg](reference/product/striva-gestao-desempenho-operacional-2026-10-01.jpg)
- **Funcionalidade:** Atrito e indicadores de conversão, retornos, descadastros e silêncio.
- **Status:** `reference`
- **Risco:** Médio/alto de uso comercial. Indicadores reais de uma instalação com base pequena; não são demonstração fictícia, benchmark, estudo de caso aprovado ou promessa de resultado.
- **Uso recomendado:** Somente referência interna do painel. Para campanha, usar tenant demo identificado; para case real, obter autorização e contexto estatístico.
- **Sanitização e contexto:** Cabeçalho excluído; filtro Todos os atendentes, sem nomes. Apenas indicadores agregados exibidos pela tela.
- **Origem:** `/app/metrics` · 1240 × 612 px · JPEG · SHA-256 `195fbe164d6207e7…` (completo no inventário JSON).

#### Respostas rápidas — scripts de acompanhamento

- **Nome / arquivo:** [striva-respostas-rapidas-operacionais-2026-10-01.jpg](reference/product/striva-respostas-rapidas-operacionais-2026-10-01.jpg)
- **Funcionalidade:** Templates compartilhados e variável de primeiro nome sem resolução.
- **Status:** `reference`
- **Risco:** Médio. Marca da clínica e procedimentos do nicho estão no texto; não são copy genérica da Striva. Não há dado de paciente.
- **Uso recomendado:** Referência de layout e variáveis. Substituir por templates fictícios de nicho neutro no ambiente demo antes de campanha.
- **Sanitização e contexto:** Cabeçalho excluído; não há destinatário nem valor resolvido de nome. Conteúdo de templates operacionais permanece.
- **Origem:** `/app/templates` · 1240 × 612 px · JPEG · SHA-256 `49a8db6d030e23ba…` (completo no inventário JSON).

#### Tarefas — lista vazia

- **Nome / arquivo:** [striva-tarefas-lista-vazia-2026-10-01.jpg](reference/product/striva-tarefas-lista-vazia-2026-10-01.jpg)
- **Funcionalidade:** Filtros, modos Lista/Calendário, atualização e nova tarefa.
- **Status:** `reference`
- **Risco:** Baixo de privacidade; ausência de tarefa concreta torna a imagem fraca para anúncio.
- **Uso recomendado:** Referência interna. Recapturar lista demo com tarefas fictícias e próximos passos.
- **Sanitização e contexto:** Cabeçalho excluído; lista sem tarefas, nomes, prazos ou vínculos reais.
- **Origem:** `/app/tasks` · 1240 × 612 px · JPEG · SHA-256 `32f1e29060846ac6…` (completo no inventário JSON).

### rejected

#### Conhecimento — material sem vínculo com assistente

- **Nome / arquivo:** [striva-conhecimento-sem-vinculo-2026-10-01.jpg](rejected/product/striva-conhecimento-sem-vinculo-2026-10-01.jpg)
- **Funcionalidade:** Acervo de documentos, preparação, trechos e vínculo de consulta.
- **Status:** `rejected`
- **Risco:** Alto de inadequação comercial: nenhum assistente consulta o material, rótulo de teste e título fora do recorte. Não sustenta anúncio de conhecimento operacional configurado.
- **Uso recomendado:** Não publicar. Preservar somente como evidência interna de rejeição; preparar acervo demo vinculado e recapturar.
- **Sanitização e contexto:** Recorte exclui cabeçalho, organização e usuário. Apenas metadados do material; conteúdo não aberto. TESTE é o rótulo de credencial mostrado pela UI, não o valor de uma chave.
- **Origem:** `/app/ai/knowledge/sources` · 1168 × 520 px · JPEG · SHA-256 `ae5c9ade4cd68368…` (completo no inventário JSON).

## Regra para a próxima captura

Usar uma organização explicitamente demo e contatos, conversas, oportunidades, tarefas e compromissos fictícios. Identificar números como demonstração. Verificar marca atual, legibilidade, carregamento concluído, ausência de toasts e de dados pessoais, e enquadramento completo da função principal. Recapturar após mudanças visuais ou quando a versão visível deixar de representar a instalação a divulgar. Classificar novamente antes de substituir uma imagem; uma referência não vira aprovada apenas por mudar de pasta.
