# Validação da landing comercial — 30/09/2026

Escopo: raiz pública, componentes de marketing, exportações da marca e demonstrações ilustrativas. Nenhuma mudança em schema, autenticação ou conversas reais.

## Evidência confirmada

- `pnpm typecheck`: concluído sem erros, com limite de heap de 6 GB.
- `pnpm lint`: concluído sem erros; 346 avisos existentes no repositório. ESLint dos arquivos novos e da página: sem ocorrências.
- Gates focados de marca, mapa de arquitetura, cobertura E2E e idioma: 4 arquivos, 153 testes aprovados.
- `pnpm exec playwright test --config tests/marketing/playwright.config.ts`: 4 testes aprovados, 37,3 s na execução final após aquecer a compilação de desenvolvimento.
- Jornada nos três segmentos, escolhas do painel, FAQ, contato comercial, login, menu móvel, ausência de transbordamento e movimento reduzido verificados. Axe WCAG 2 A/AA e 2.1 AA sem violações detectadas.
- Capturas finais: desktop 1440 px e celular 390 px, com estados móveis de qualificação e próximo passo. Dados demonstrativos fictícios. As capturas locais ficam em `.impeccable/review/`, ignorado pelo Git; controles de desenvolvimento presentes não fazem parte da versão de produção.
- Detector Impeccable executado uma vez: nenhuma ocorrência. Na revisão da marca, prompts exatos incorporados nos dois PNGs atuais; varredura de proveniência: nenhum arquivo faltante.
- Revisão independente Impeccable: os dois ajustes solicitados foram classificados como resolvidos na rodada final (`ship` no escopo dos ajustes): leitura das legendas e posição do selo no celular.
- `git diff --check` e conferência do fragmento de release aprovados.

## Limites da prova

O ambiente de prévia é uma cópia temporária sem arquivos `.env`, ligada às dependências locais e configurada com endereços e chaves fictícios. Não envia mensagens nem acessa dados da operação. Abrir o CTA não prova envio de uma solicitação comercial.

A suíte unitária completa não foi concluída: houve esgotamento de recursos e falhas fora do escopo da landing, incluindo dependências de ambiente e scripts de shell no Windows. Isso não constitui resultado verde do repositório inteiro.

O build completo de produção com webpack foi interrompido após mais de dez minutos na compilação, sem resultado conclusivo e sob forte pressão de memória. Não há prova de build de produção nesta entrega. A compilação de desenvolvimento, typecheck e os testes específicos da página foram concluídos.

Docker indisponível: os testes de banco e a suíte E2E integral com Supabase local não foram executados. A landing não altera o banco. A homologação real do assistente de gestão pelo WhatsApp também não foi reexecutada.

Antes de publicação: confirmar domínio comercial, revisar termos/privacidade legados e concluir os gates integrais em ambiente apropriado. A prévia local não publica o site.

## Revisão comercial solicitada pelo proprietário

A nova referência de marca substitui os exports antigos da landing. O conceito foi reescrito como funcionário comercial com IA: atendimento 24/7 configurável, CRM automático, Google Agenda, relatórios diários/semanais e inteligência dos dados da própria operação.

Typecheck e ESLint dos arquivos alterados concluídos sem erros. Os quatro testes Playwright passaram novamente (aproximadamente um minuto), incluindo imagem carregada e alternância dos relatórios. Gates focados: 153 testes aprovados em 4 arquivos, na execução sequencial final. A tentativa anterior de executar esses gates junto ao typecheck esgotou o tempo de inicialização dos workers; a execução com um worker após o typecheck foi concluída.

Capturas atualizadas nos mesmos viewports. Revisão independente confirmou a adequação visual da nova marca, da copy e dos relatórios; solicitou apenas corrigir a documentação de identidade legada em DESIGN.md.

Correção documental concluída em DESIGN.md e no sidecar: marca comercial nova distinguida do fallback autenticado. Na rodada final, o revisor classificou essa única correção como resolvida, com `ship` no escopo documental avaliado. Nenhuma alteração visual posterior às capturas.

## Revisão de follow-up e demonstração comercial

A abertura agora apresenta “Seu comercial. Sempre presente. 24 horas por dia.” e um funcionário digital que atende, vende e agenda. A tecnologia continua explicada no FAQ. O follow-up após silêncio do contato foi confirmado no fluxo de `lib/followup/silence-sweep.ts`; a comunicação explicita intervalos configurados e continuidade da negociação, sem prometer fechamento.

A conversa ilustrativa ganhou trocas completas, horários, etapa de retomada e atividade do CRM. Os controles ficam acima das mensagens. As capturas desktop, móvel e dos estados Follow-up e Próximo passo foram atualizadas; todos os exemplos usam dados fictícios.

Os quatro testes Playwright da landing passaram na execução final, incluindo retomada, agendamento, controles dos painéis, relatórios, menu móvel e acessibilidade Axe. O desenvolvimento local exigiu espera maior por compilação: a configuração isolada usa 120 segundos e navegação até DOMContentLoaded. A execução de 3,4 minutos não mede latência de produção. Uma falha real encontrada nos testes foi corrigida: seletores e menu aguardam a hidratação antes de aceitar cliques, evitando perda da primeira interação.

Typecheck e ESLint dos arquivos alterados concluídos sem erros. Os quatro gates unitários focados passaram novamente: 153 testes, em execução sequencial com um worker. A conferência do fragmento de release e `git diff --check` passaram. A revisão independente Impeccable classificou esta revisão como `ship`, sem ajustes materiais pendentes. DESIGN.md e o sidecar JSON v2 foram atualizados para refletir a conversa e o posicionamento atuais. Os limites da suíte integral, do banco e do build de produção registrados acima continuam válidos.

## Persuasão comercial e referência Kommo

A análise da página oficial da Kommo Brasil está em `referencia-kommo.md`. A revisão preserva a identidade Striva e a jornada escolhida, reforçando o objetivo comercial e demonstrando o mecanismo com situações exploráveis. A nova seção compara o risco cotidiano à continuidade do atendimento nos cenários Fora do expediente, Contato sem resposta e Proposta em aberto. O painel oferece cinco áreas — Atendimento, Follow-up, Funil, Agenda e Radar — com benefícios e próximos passos contextualizados. O funil ilustrativo alcança uma etapa de negócio fechado; não é resultado medido.

Os exemplos Clínica Aurora, Escritório Horizonte e Conecta Serviços são explicitamente apresentados como empresas fictícias e simulações de uso, sem endosso ou depoimento real. Números, nomes, mensagens e situações de demonstração continuam fictícios.

Os cinco testes Playwright passaram em 31,3 segundos na execução final: jornada e contato comercial, cinco áreas do painel e demais controles, três situações comerciais, navegação móvel/movimento reduzido e acessibilidade Axe. Não foram detectadas violações nos critérios automáticos WCAG 2 A/AA e 2.1 AA exercitados. Isso não substitui avaliação manual integral de acessibilidade.

Capturas finais em 1440 px, 390 px e 1265 px (largura do navegador usado na análise) foram inspecionadas, com recortes dos estados de follow-up, funil e radar. Nenhum transbordamento horizontal foi observado nessas larguras. A primeira inspeção levou a um ajuste de quebra do título e remoção de setas que sugeriam ações inexistentes no Radar demonstrativo. A segunda inspeção confirmou o ajuste.

As capturas tiveram falhas de espera de carregamento e uma reinicialização automática do Next por limite de memória. Após a compilação de desenvolvimento se estabilizar, as capturas restantes e os cinco testes foram concluídos. O servidor local permanece uma prévia isolada, sem conexão à operação real.

Detector Impeccable executado uma vez nesta revisão: zero ocorrências principais e 117 avisos de comparação com tokens documentados (cor, tamanho de fonte e raio). Esses avisos são orientação, não prova de defeito ou de qualidade visual. Nenhuma imagem comercial foi criada ou alterada nesta rodada.

A revisão independente pediu duas correções: remover etiquetas superiores redundantes na comparação e reconciliar a documentação da rampa de títulos/padrões novos. Ambas foram aplicadas. O revisor pontuou as duas como resolvidas na rodada de veredito (`ship` no escopo dessas correções), validou as treze capturas e não identificou regressão do lote corrigido. DESIGN.md e o sidecar JSON v2 têm os padrões atuais e treze snippets; tokens autenticados e identidade aprovada foram preservados.

Após as correções, os cinco testes Playwright passaram novamente (49,6 segundos). Typecheck e ESLint dos arquivos alterados passaram na execução final. Os quatro gates unitários focados passaram com 153 testes; a conferência do fragmento de release e `git diff --check` também passaram. Os limites da suíte integral, banco e build de produção descritos anteriormente permanecem; estes resultados não constituem homologação de produção ou medição de conversão.

## Fotografia, composição e convite de demonstração

Expansão visual solicitada pelo proprietário: cena editorial de empresária com conversa sobreposta, celular e mão fotográficos na gestão, superfície quente e verde/azul/âmbar de apoio aos ícones. Dois PNGs produzidos pelo ImageGen integrado estão em `public/marketing/`; prompts exatos e origem em `prompts-imagens.md`. Fotografias, conversas e números continuam explicitamente ilustrativos. Tela e mensagens são HTML; não há dados reais de clientes. Alpha nativo do celular preservado. A conferência de proveniência encontrou quatro rasters em `public/brand/` e `public/marketing/`, nenhum sem prompt incorporado.

A conversa sobre a fotografia se compõe uma vez ao entrar no viewport; todas as informações são visíveis por padrão e o movimento reduzido é respeitado. Um convite não modal aparece após 40 segundos de aba visível, uma vez por sessão. Não rouba foco nem bloqueia a página; permite X, Agora não e Escape. Uma CTA comercial acionada antes cancela o convite. Não registra dados pessoais nem envia mensagem automaticamente.

Onze capturas válidas: páginas completas em 1440, 390 e 1265 px, abertura, composição fotográfica, gestão e convite em desktop e móvel. A primeira inspeção encontrou recorte indevido do conteúdo da gestão em tela estreita, corrigido com trilhas de grid sem mínimo intrínseco. A revisão independente pediu que o recorte da mão alcançasse a borda real da seção. O lote corrigido preserva o alinhamento entre aparelho e tela HTML, com clipping na seção. O mesmo revisor classificou essa única correção como resolvida, sem regressão material do lote: `ship` no escopo pontuado. Não havia card de qualidade ou comp de decisão persistido; a revisão foi contra o bar fornecido e o contrato de refinamento em código.

Os seis testes Playwright passaram após as correções (1,3 minuto na prévia de desenvolvimento): jornada, cinco áreas do painel, situações comerciais, celular sem transbordamento, imagens carregadas e convite, acessibilidade Axe. O convite foi exercitado em 390 px, inclusive foco preservado, Escape e dispensa mantida após recarregar. Os critérios automáticos WCAG 2 A/AA e 2.1 AA exercitados não registraram violações. Isso não substitui avaliação manual integral nem mede latência de produção.

Typecheck e ESLint dos arquivos alterados passaram. Dos quatro gates unitários focados, 152 testes passaram na primeira execução e a catraca de marca apontou a chave de sessionStorage com marca fixa. O identificador foi trocado por uma chave comercial genérica; todos os 29 testes desse arquivo passaram na reexecução, completando os 153 testes focados. Conferência do fragmento de release e `git diff --check` passaram. Detector executado uma vez, direcionado ao TSX: lista vazia; o CSS foi conferido visualmente, não por uma segunda execução do detector.

Os limites já registrados para suíte integral, banco e build de produção permanecem. O servidor em localhost continua uma prévia isolada para análise do proprietário, sem publicação ou contato com canais reais.

Handoff documental concluído apenas em DESIGN.md e no sidecar: tokens comerciais de apoio, fotografia, conversas HTML, movimento e convite reconciliados, com schema v2 e 14 snippets. Referências e propriedades foram validadas pelo documenter, sem alteração dos tokens autenticados. A checagem final de schema, diferenças e proveniência continuou válida.
