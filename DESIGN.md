---
name: Striva Sales
description: Identidade violeta preservada, base operacional legível e extensão comercial de tecnologia premium.
colors:
  primary: "#7c3aed"
  violet-hover: "#6133b8"
  violet-deep: "#4e2d91"
  violet-focus: "#915fff"
  violet-dark-accent: "#a384ff"
  violet-soft: "#eae6ff"
  white: "#ffffff"
  app-bg: "#faf9f6"
  app-elevated: "#f5f3ee"
  app-text: "#1c1a16"
  app-muted: "#5d594f"
  app-border: "#e7e3da"
  app-border-strong: "#d2cdbf"
  app-dark-bg: "#161510"
  app-dark-surface: "#1d1c17"
  app-dark-elevated: "#272620"
  app-dark-text: "#f5f4ef"
  app-dark-muted: "#8e8b7f"
  app-dark-border: "#33312a"
  app-success: "#5a8a5f"
  app-warning: "#b07a2b"
  app-error: "#a94a3c"
  app-info: "#4a7a93"
  commercial-ink: "#25153d"
  commercial-muted: "#645972"
  commercial-lavender: "#ede7fa"
  commercial-line: "#e6e0ef"
  commercial-journey: "#f0ebfb"
  commercial-management: "#3f216d"
  commercial-management-highlight: "#c5b2ff"
  commercial-warm-surface: "#f8f4ed"
  commercial-support-green: "#146b4d"
  commercial-support-amber: "#995b0c"
  commercial-support-blue: "#215da8"
typography:
  app-body:
    fontFamily: "Atkinson Hyperlegible, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontWeight: 400
    fontFeature: '"rlig" 1, "calt" 1, "ss01" 1'
  app-mono:
    fontFamily: "IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace"
  app-title:
    fontFamily: "Atkinson Hyperlegible, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  app-label:
    fontFamily: "Atkinson Hyperlegible, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
  commercial-display:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(46px, 4.5vw, 60px)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.038em"
  commercial-headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "clamp(30px, 3.7vw, 47px)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.032em"
  commercial-title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "18px"
    fontWeight: 650
    lineHeight: 1.65
  commercial-body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  commercial-label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.4
  commercial-caption:
    fontFamily: "Manrope, sans-serif"
    fontSize: "11px"
    lineHeight: 1.65
rounded:
  none: "0px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
  commercial-control: "6px"
  commercial-bubble: "10px"
spacing:
  space-0: "0px"
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "20px"
  space-6: "24px"
  space-8: "32px"
  space-10: "40px"
  space-12: "48px"
  space-16: "64px"
  space-20: "80px"
  space-24: "96px"
  space-32: "128px"
components:
  app-button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    typography: "{typography.app-label}"
    rounded: "{rounded.sm}"
    padding: "0px 16px"
    height: "44px"
  app-button-primary-hover:
    backgroundColor: "{colors.violet-hover}"
  app-button-secondary:
    backgroundColor: "{colors.app-elevated}"
    textColor: "{colors.app-text}"
    typography: "{typography.app-label}"
    rounded: "{rounded.sm}"
    padding: "0px 16px"
    height: "44px"
  app-button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.app-text}"
    typography: "{typography.app-label}"
    rounded: "{rounded.sm}"
    padding: "0px 16px"
    height: "44px"
  app-input:
    backgroundColor: "{colors.app-bg}"
    textColor: "{colors.app-text}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
    height: "40px"
  app-badge:
    backgroundColor: "{colors.violet-soft}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "2px 12px"
  app-card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.app-text}"
    rounded: "{rounded.lg}"
    padding: "24px"
  commercial-button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    typography: "{typography.commercial-label}"
    rounded: "{rounded.md}"
    padding: "17px 23px"
  commercial-button-primary-hover:
    backgroundColor: "{colors.violet-hover}"
  commercial-button-light:
    backgroundColor: "{colors.white}"
    textColor: "{colors.violet-deep}"
    typography: "{typography.commercial-label}"
    rounded: "{rounded.md}"
    padding: "17px 23px"
  commercial-journey:
    backgroundColor: "{colors.commercial-journey}"
    textColor: "{colors.commercial-ink}"
    rounded: "{rounded.xl}"
    padding: "23px 25px 18px"
---

# Design System: Striva Sales

## Overview

**Creative North Star:** não foi nomeada uma metáfora global. A direção confirmada pelo proprietário é tecnologia premium, preservando o nome e a afinidade com o violeta, com substituição expressamente autorizada da identidade comercial pela referência enviada. Este documento registra o sistema observado; não acrescenta uma nova doutrina visual.

A base autenticada tem caráter calmo e operacional: tipografia legível, neutros quentes, estados semânticos e densidade aerada. A extensão comercial comunica tecnologia premium com Manrope, grandes títulos, branco, lavanda e texto ameixa. O nome e a afinidade com o violeta fazem a ligação entre as superfícies; a landing agora usa a fita facetada com duas esferas e lettering futurista da referência aprovada, enquanto a operação conserva sua resolução independente de marca própria.

**Proveniência — CONFIRMADO em código:** tokens globais em `app/globals.css`; paleta de referência em `app/design/lib/tokens.ts`; fontes em `app/layout.tsx` e `app/page.tsx`; componentes em `components/ui/`; geometria e cores da marca padrão de fábrica em `lib/branding/desenho.ts`; extensão comercial em `components/marketing/landing.module.css` e `LandingPage.tsx`. A identidade comercial deriva da referência do proprietário `Captura de tela 2026-09-29 071905.png`: `public/brand/nova-logo-claro.png` e `public/brand/novo-simbolo.png` são adaptações transparentes por ImageGen, com prompts incorporados e origem documentada em `public/brand/ORIGEM.md`. Não são vetores oficiais nem exportações da geometria antiga; a referência enviada é a autoridade de identidade comercial. Os valores de frontmatter são a referência extraída dos padrões de fábrica e do CSS comercial, não substituem o CSS executável nem os tokens de marca resolvidos em runtime. A landing tem escopo próprio e `color-scheme: light`; o aplicativo mantém temas claro e escuro. O contrato de composição, a jornada e os relatórios específicos da landing ficam em `.impeccable/surfaces/app-page-tsx.md`. Só os compromissos duráveis de marca de `PRODUCT.md` são transportados aqui. Rampas sintetizadas no sidecar são auxiliares de visualização, não novos tokens do produto.

**Key Characteristics:**

- Nome e afinidade com o violeta preservados; nova identidade comercial aprovada, com fita facetada e duas esferas.
- Base autenticada legível, com neutros quentes e dois temas.
- Extensão comercial clara, com Manrope, lavanda e ameixa.
- Expansão comercial com fotografia ilustrativa, superfície quente e cores de apoio para ícones.
- Demonstração comercial mais detalhada, com horários, retomada e atividade do CRM legíveis.
- Comparações de oportunidade e navegação demonstrativa ligam situações cotidianas à continuidade da operação.
- Hierarquia por tipografia, espaço, contraste tonal e bordas discretas.
- Interações operáveis e foco visível; movimento reduzido conserva o conteúdo.

## Colors

Um mesmo acento violeta conecta uma base operacional de greige à extensão comercial de branco e lavanda. Os nomes abaixo descrevem papéis observados; as cores normativas estão no frontmatter.

### Primary

- **Violeta Striva** (`primary`): ações principais e destaques comerciais; acento padrão do aplicativo claro. A rampa original possui onze paradas em `--color-accent-50` até `--color-accent-950`.
- **Violeta de interação** (`violet-hover`): preenchimento ao passar sobre ações principais.
- **Violeta profundo** (`violet-deep`): texto de ações claras e pequenos elementos de marca da landing.
- **Violeta de foco** (`violet-focus`): indicador de foco global claro e comercial; o aplicativo escuro usa a parada `violet-dark-accent`.
- **Violeta suave** (`violet-soft`): badges e ações discretas do aplicativo claro. No escuro, esse papel usa transparência definida no CSS.
- **Violeta de gestão** (`commercial-management`) e **lavanda de destaque** (`commercial-management-highlight`): contraste da seção comercial escura. São parte desta extensão, não um tema escuro novo do aplicativo.

### Neutral

- **Branco** (`white`): superfície de cards do aplicativo claro, página comercial e janelas demonstrativas.
- **Papel quente** (`app-bg`, `app-elevated`): fundo e camada tonal do aplicativo claro.
- **Tinta quente** (`app-text`, `app-muted`): texto e metadados do aplicativo claro.
- **Contornos greige** (`app-border`, `app-border-strong`): separação e estado hover de campos.
- **Neutros noturnos** (`app-dark-*`): fundo, superfície, elevação, texto e divisória desenhados separadamente para o aplicativo escuro. Não são inversão automática dos claros.
- **Tinta ameixa** (`commercial-ink`, `commercial-muted`): títulos, leitura e textos auxiliares da landing.
- **Lavanda clara** (`commercial-lavender`, `commercial-journey`): encerramento e contenção dos exemplos comerciais.
- **Contorno lavanda** (`commercial-line`): divisórias, menu e navegação demonstrativa.
- **Superfície quente comercial** (`commercial-warm-surface`): cena fotográfica ampla e hover da opção de dispensar o convite.

### Cores de apoio comerciais

`commercial-support-green` identifica atendimento e controle; `commercial-support-amber`, follow-up; `commercial-support-blue`, agenda e contexto. Esses papéis contrastam os ícones e saídas da expansão comercial; o CTA continua violeta. Não substituem os estados semânticos ou as trilhas da agenda autenticada. As fontes executáveis são `--support-green`, `--support-amber`, `--support-blue` e `--warm-surface` no escopo da landing.

### Estados semânticos

`app-success`, `app-warning`, `app-error` e `app-info` vêm dos estados do aplicativo claro. O CSS possui fundos, frentes e equivalentes escuros para cada estado; reutilize esses papéis existentes. Não promova cores locais da demonstração a novos estados globais.

A marca autenticada pode resolver outro acento pelo banco e injetar CSS em runtime. Reutilize `var(--color-accent)` e os componentes canônicos nesse contexto, em vez de fixar os valores de fábrica catalogados aqui. A identidade comercial atual usa o nome do produto e os PNGs transparentes aprovados; os SVGs da geometria antiga não são sua fonte.

## Typography

**Aplicativo:** Atkinson Hyperlegible para interface e IBM Plex Mono para código e dados monoespaçados. `app/layout.tsx` carrega Atkinson nos pesos 400/700 e IBM Plex Mono nos pesos 400/500. O CSS mantém números tabulares nos elementos de código. As declarações de peso dos componentes continuam as observadas em código, mesmo quando a fonte carregada só fornece os dois pesos mencionados.

**Comercial:** Manrope variável, carregada apenas em `app/page.tsx` por `--font-commercial`. Ela se aplica à landing inteira, incluindo exemplos; não substitui as fontes do aplicativo. A hierarquia é fluida, sem uma razão de escala tipográfica única declarada.

### Hierarchy

- **App body:** fonte e recursos OpenType globais, sem impor um tamanho novo a todas as telas.
- **App title:** título do card canônico; texto compacto e firme, com entrelinha curta.
- **App label:** controles operacionais; escala em rem baseada nas utilidades observadas.
- **Commercial display:** título principal amplo, peso médio e tracking fechado. Em até 1100px passa a 54px; até 820px usa `clamp(42px, 7.7vw, 66px)`; até 520px usa `clamp(35px, 9vw, 47px)`.
- **Commercial headline:** títulos de seção; até 520px ficam em 30px. A seção de gestão usa uma variante maior, definida localmente no CSS.
- **Commercial title:** títulos de recursos e itens da equipe.
- **Commercial body:** base da landing; o parágrafo introdutório usa 17px, entrelinha 1.85 e largura máxima de 460px no desktop.
- **Commercial label:** texto de ação principal; a variante pequena usa 13px no desktop.
- **Commercial caption:** identificação dos exemplos em 11px, inclusive no celular. A demonstração contém metadados menores próprios; não são uma escala recomendada para conteúdo operacional novo.

## Layout

**Base autenticada:** escala de espaço com base de 4px, tokens `--space-*`, densidade `Aerada` (`--density-row: 56px`, gap 24px, padding horizontal 20px e vertical 16px). A barra lateral ocupa o fluxo com posicionamento sticky, largura expandida 240px e recolhida 64px. Tabelas, funis e outros conteúdos largos contêm a própria rolagem; a página tem proteção contra overflow horizontal.

**Extensão comercial:** header e hero têm largura máxima de 1320px; seções comuns e footer, 1240px. Os recuos laterais comuns são 48px no desktop, 32px até 1100px, 28px até 820px e 22px até 520px. O hero começa com duas colunas (`1.12fr 1fr`) e gap de 58px, tornando-se uma coluna até 820px. Seções comuns usam 100px de respiro vertical no desktop, 65px até 820px e 55px até 520px; existem ajustes locais por seção.

O menu comercial recolhe em 820px. A navegação demonstrativa vira uma linha de controles com quebra nesse corte; até 520px, as cinco opções usam uma grade de três colunas, enquanto conversa e funil empilham. Os seletores da jornada ficam acima das mensagens, sem selo de marca flutuante. Esses cortes descrevem a landing; não substituem os breakpoints do shell autenticado. A sequência, quantidade de seções e trajetória da demonstração pertencem ao contrato da superfície.

A seção comercial de relatórios usa duas colunas iguais, gap de 80px e alinhamento central; até 820px empilha com gap de 35px. O preview tem padding de 24px, reduzido para 20px até 520px. A marca horizontal usa largura de 190px no header desktop, 130px no celular e tamanhos locais no preview; imagens preservam a proporção com `object-fit: contain`.

A comparação comercial de oportunidades usa colunas de proporção `0.9fr 1.1fr`, gap de 48px e padding superior de 34px. A resposta ocupa uma superfície lavanda com raio de 12px e padding de 28px 32px; o risco fica sobre o fundo da página. Até 820px o gap cai para 26px; até 520px as colunas empilham com gap de 18px. O preview do funil comercial tem quatro colunas no desktop; esse número descreve os dados fictícios da demonstração, não fixa a configuração dos funis reais.

A expansão fotográfica comercial alterna a superfície quente e a composição assimétrica com os painéis anteriores. A cena tem máximo de 1320px, padding de 48px, gap de 48px e colunas `0.85fr 1.65fr`; até 820px empilha. A fotografia tem altura de 470px no desktop, com chat HTML de 270px sobreposto; até 520px a foto fica com 290px e o chat entra no fluxo com overlap de 30px, mantendo legenda e leitura acessíveis.

Na gestão, a fotografia transparente de mão e celular ocupa 510px por 638px e sangra até a borda real da seção. A tela HTML de 241px por 470px sobrepõe o aparelho, sem girar o texto; até 820px a composição fica centralizada. O contêiner reserva a altura integral de 638px da fotografia e a seção limita o sangramento horizontal; a correção removeu o recorte interno vertical da mão. Esses valores descrevem a montagem do asset atual, não uma escala global de dispositivos.

## Elevation & Depth

A base autenticada combina camadas tonais, bordas greige e sombras neutras de baixa intensidade. O vocabulário global vai de `--shadow-xs` a `--shadow-xl`, com versões próprias para tema escuro. O card e a ação primária canônicos usam a sombra mínima. A landing usa lavanda para conter exemplos, janelas brancas com sombra violeta discreta e menu elevado. Na expansão, a fotografia fornece profundidade ao celular; o chat fotográfico e o convite têm sombras próprias, enquanto o antigo frame de telefone desenhado em CSS foi substituído. Isso não autoriza aplicar sombras comerciais à operação inteira.

Os valores completos estão em `extensions.shadows` do sidecar. Movimento global usa durações de 120/200/320ms e curvas existentes. Na landing, transições de controles usam principalmente 160–220ms; a cena da jornada abre em 450ms sem rotação automática. `prefers-reduced-motion` elimina animações e transições comerciais, preservando cada estado acessível. Foco não depende de animação; o modo de cores forçadas mantém o outline de sistema.

A conversa sobre a fotografia usa `conversationArrives`: clip e deslocamento vertical de 16px em 650ms, com próximo passo atrasado em 160ms. O evento dispara uma única vez ao entrar no viewport; o conteúdo já existe antes dele. O convite usa a mesma linguagem em 300ms. Movimento reduzido conserva toda a fotografia, conversa e ações sem animação. Essa entrada pontual pertence à expansão comercial, sem movimento contínuo nem alteração do ritmo operacional autenticado.

## Shapes

Na base autenticada, controles têm curvas pequenas (`sm`), cards têm curvas mais abertas (`lg`) e badges são cápsulas (`full`). A escala global permanece a existente. Na landing, ações têm curvas médias (`md`), a jornada tem contorno mais amplo (`xl`), janelas usam `lg`, seletores usam `commercial-control` e balões usam `commercial-bubble` com um canto inferior de 2px para indicar direção. Avatares são circulares. Na gestão, o contorno físico do telefone vem da fotografia; a tela HTML tem cantos inferiores locais de 24px para acompanhar o aparelho, sem promover esse raio à escala global.

A marca padrão de fábrica do aplicativo conserva a fita contínua em S e o módulo quadrado separado de `lib/branding/desenho.ts`; essa fonte autenticada permanece intacta. A identidade comercial foi substituída, por decisão explícita do proprietário, pela fita violeta facetada com duas esferas e lettering futurista. Na landing, reutilize o logo horizontal e o símbolo isolado aprovados, sem reconstruir a marca antiga. Os PNGs comerciais são adaptações da referência, não um arquivo-mestre vetorial; o lettering faz parte da imagem e não é uma nova fonte tipográfica da interface.

## Components

### Buttons

**Aplicativo — claros e operacionais.** O componente canônico fornece primary, secondary, ghost, destructive, outline e link; default é alias de primary. Raio pequeno, altura padrão de 44px abaixo de 1024px e 36px a partir desse corte. O pequeno fica em 32px no desktop; o grande mantém 44px. Primary usa accent dinâmico; secondary usa superfície elevada e borda; ghost ganha fundo suave no hover. Foco usa anel de 2px com offset de 2px; disabled perde interação e reduz opacidade. Active desloca 1px para baixo.

**Comercial — ações firmes e abertas.** Ação preenchida violeta, raio médio, altura mínima de 54px, padding observado no frontmatter e seta de 19px. Hover escurece e sobe 2px; seta avança 3px. A variante pequena tem mínimo de 46px, padding 13px 18px e gap 14px. A variante clara usa branco com texto violeta profundo e hover lavanda. O foco comercial usa outline de 3px com offset de 5px. Os ajustes até 520px vêm do CSS comercial.

### Chips

Badges do aplicativo são cápsulas de 12px com entrelinha de 20px e padding 2px 12px. Variantes ligam cor de estado, frente e fundo semântico. As etiquetas de setor da landing são texto com ícone; não são campos, filtros ou badges interativos.

### Cards / Containers

O card autenticado usa superfície dinâmica, borda discreta, raio `lg` e `shadow-xs`; o header tem padding de 24px e conteúdo/footer removem o padding superior. A landing distingue o contêiner lavanda da jornada, a janela branca da conversa e o preview da operação com borda. O preview comercial é uma adaptação ilustrativa, não uma captura exata do aplicativo.

### Inputs / Fields

O input autenticado tem altura de 40px, raio pequeno, fundo da página e contorno discreto. Hover reforça a borda; foco troca a borda para accent-500 e acrescenta anel suave de 2px. `aria-invalid` usa erro semântico; disabled reduz opacidade e mostra cursor apropriado. A landing atual não tem formulário: o compositor desenhado no telefone é ilustrativo e não deve ser documentado como campo funcional.

### Navigation

No aplicativo, a navegação lateral integra o shell, ocupa espaço no fluxo e permite recolhimento. Na landing, links de 14px e peso 600 usam ameixa com hover violeta. A navegação comercial inclui acesso a Gestão; no menu móvel, o rótulo é Gestão e relatórios. No celular, o botão declara `aria-expanded` e controla um painel branco com borda, sombra e ações empilhadas. Foco permanece visível nos links, botões e summary do FAQ.

### Jornada ilustrativa comercial

Na landing atual, “Mais vendas. Menos oportunidades perdidas.” apresenta o objetivo desejado antes da tecnologia; a inteligência artificial é explicada no FAQ. O objetivo não é um resultado medido nem uma garantia. Essa escolha de comunicação pertence ao contrato da superfície, sem mudar a identidade ou a linguagem da interface autenticada.

Os seletores de negócio e das etapas Atendimento, Follow-up e Próximo passo ficam acima da conversa e usam `aria-pressed`; os resultados anunciam mudanças com `aria-live`. A seleção branca distingue o negócio dentro da lavanda; a etapa selecionada usa preenchimento violeta e texto branco. Nenhum estado avança sozinho. Atendimento e Follow-up mostram quatro mensagens; a retomada explicita o intervalo configurado sem resposta, sem fixar um SLA ou prometer fechamento. A etapa seguinte mostra a continuidade até agendamento ou proposta.

Balões usam padding de 9px 12px e entrelinha 1.55. Os horários têm 10px; a indicação de intervalo e o rodapé de atividade do CRM têm 11px. A cena tem gap de 10px e altura mínima de 340px no desktop, reduzida para 325px até 520px. O rodapé informa a atualização do CRM ou o envio automático do follow-up, mantendo o resultado conectado à conversa. O antigo selo flutuante e o card de qualificação isolado foram removidos dessa demonstração.

Os controles interativos da landing permanecem desabilitados somente até a hidratação do cliente; então se tornam operáveis. O estado inicial já apresenta conteúdo. Dados fictícios são identificados em texto visível, com legenda de 11px inclusive no celular. Esses padrões são específicos da demonstração da landing, com composição descrita no contrato da superfície; não alteram os componentes operacionais autenticados.

### Comparação ilustrativa de oportunidades

Três situações selecionáveis — Fora do expediente, Contato sem resposta e Proposta em aberto — usam `aria-pressed` e atualizam a comparação anunciada por `aria-live`. A opção selecionada tem texto e linha inferior violeta; as demais mantêm texto auxiliar sobre fundo transparente. Cada comparação começa diretamente pelo título da situação e pelo título da resposta, sem etiquetas superiores redundantes. A resposta lavanda contém três ações e uma conclusão separada por borda discreta. Títulos usam 25px, peso 650 e entrelinha 1.35; não têm margem superior. A nota de 11px identifica as situações como ilustrativas e condiciona atendimento e acompanhamento às regras configuradas. Esse padrão descreve a landing, sem impor uma nova estrutura às telas operacionais.

### Preview comercial da operação

Atendimento, Follow-up, Funil, Agenda e Radar são cinco views de uma mesma demonstração. A seleção muda a explicação de benefício acima do painel, o conteúdo e a conclusão contextual no rodapé. O benefício usa título violeta de 23px, peso 650 e entrelinha 1.4; a conclusão usa fundo suave, texto de 12px e borda superior. A navegação do preview mantém seleção tonal lavanda e estados de foco existentes.

O Follow-up ilustra silêncio, retomada e resposta em uma timeline; o Radar mostra motivos e próximas ações. O Funil apresenta Novo contato, Em negociação, Agendado e Fechado com quatro pessoas fictícias. “Fechado” é parte da simulação, não evidência de receita ou uma etapa obrigatória do produto. A profundidade da demonstração responde à referência Kommo Brasil solicitada pelo proprietário; a paleta, a marca e a jornada continuam Striva, sem importar a identidade ou inventar recursos do concorrente.

### Cenários comerciais por segmento

Clínica Aurora, Escritório Horizonte e Conecta Serviços são empresas fictícias em exemplos selecionáveis. O bloco lavanda distingue pedido, desafio e próximo passo. A identificação “empresa fictícia” e a nota “Simulação de uso. Não é depoimento ou resultado de um cliente real.” permanecem visíveis; não há citação de cliente nem formato de endosso. Esses nomes pertencem ao conteúdo ilustrativo da landing, sem se tornarem marca ou prova do sistema.

### Relatório ilustrativo comercial

O seletor Diário/Semanal usa `aria-pressed` e altera o resultado anunciado por `aria-live`. O contêiner claro tem fundo local `#f8f6fd`, borda lavanda, raio de 12px e padding responsivo descrito em Layout. A seleção usa o violeta existente e texto branco; a opção não selecionada tem fundo transparente e texto auxiliar. Números de 22px, peso 700 e algarismos tabulares se alinham à direita; títulos usam 18px e peso 650. Comparativos, envio configurável e identificação de dados fictícios usam texto auxiliar de 11px. Esse relatório demonstra dados da operação, sem promover seus números fictícios a indicadores reais ou criar uma nova paleta global.

### Composição fotográfica comercial

`public/marketing/comercial-em-movimento.png` retrata uma empresária em situação ilustrativa; `public/marketing/gestao-no-celular.png` é a mão e o aparelho transparentes da seção de gestão. Os prompts exatos e o caráter ilustrativo estão em `docs/comercial/prompts-imagens.md`; metadados de proveniência acompanham os PNGs. As fotografias não são clientes, colaboradores ou endosso. Conversas, horários e controles são HTML acessível sobre os assets, não texto gravado nas imagens.

O chat da fotografia combina header branco, corpo suave verde e próximo passo azul. Balões têm texto de 11px no desktop e 12px no celular, padding de 9px 11px e horários de 9px; a legenda explicita “Imagem e conversa ilustrativas.” A gestão mantém sua conversa demonstrativa e confirmação de alterações dentro da tela real do aparelho. Não se confunde a aparência fotográfica com envio, resposta ou resultado real do produto.

### Convite comercial temporizado

O convite é um `aside` não modal, com fundo branco, raio de 12px, padding de 25px e largura de 350px limitada pelo viewport. Fica no canto inferior direito, com altura máxima e rolagem interna para manter suas ações alcançáveis; no celular usa recuo de 16px. Aparece após 40 segundos acumulados com a aba visível, uma vez por sessão, usando chave genérica de sessionStorage e piso em memória quando o armazenamento não está disponível.

Abrir o convite não rouba foco nem bloqueia a página. X, Agora não e Escape dispensam; quando o foco estava dentro do convite, a ação devolve-o ao elemento anterior. Clicar numa CTA comercial antes da aparição cancela o convite. A CTA abre a demonstração no WhatsApp confirmado, sem captura de dados ou envio automático. O tempo e esse padrão pertencem à landing aprovada, não a uma regra global de popups.

Evidência desta expansão: capturas em `.impeccable/review/` de desktop, mobile, user-1265, hero, imagery, management e invitation; prompts em `docs/comercial/prompts-imagens.md`. A correção do recorte vertical da mão foi validada no verdict da revisão independente. O registro descreve a composição final e não canoniza o recorte como comportamento aceitável.

## Do's and Don'ts

### Do:

- **Do** preserve o nome e use a nova identidade comercial aprovada, conforme o compromisso atualizado em PRODUCT.md e a origem em public/brand/ORIGEM.md.
- **Do** mantenha os tokens e componentes autenticados ligados ao tema e à marca resolvida em runtime.
- **Do** aplique Manrope e a paleta comercial dentro do escopo da landing.
- **Do** conserve foco visível, operação por teclado e os mesmos estados com movimento reduzido.
- **Do** identifique demonstrações e dados fictícios com texto legível.

### Don't:

- **Don't** substitua Atkinson Hyperlegible ou IBM Plex Mono globalmente por causa da landing.
- **Don't** transforme a composição ou a trajetória comercial em regra para todas as telas.
- **Don't** recoloque na landing a geometria antiga de fábrica ou trate a troca comercial autorizada como uma migração automática da marca autenticada.
- **Don't** apresente previews ilustrativos como prova de clientes, resultados ou métricas reais.
- **Don't** trate rampas sintetizadas do sidecar como cores aprovadas para novos componentes.
