/** Geometria vetorial compartilhada pelo logo do produto e pelo favicon. */
export const SIMBOLO = {
  viewBox: "0 0 100 100",
  transform: "translate(0 0)",
  // Uma única linha central define a fita; as pontas fecham o traço na mesma
  // espessura e acompanham a direção de cada extremidade.
  d: "M73 13 C55 24 30 42 11 58 C4 64 18 72 26 66 C38 57 62 58 82 58 C88 58 92 62 88 67 C84 72 54 74 42 84",
  larguraDaFita: 14,
  pontaSuperior: "M80 2 75.8 19.5 68.5 7.6Z",
  pontaInferior: "M33 98 38.3 78 47.2 88.8Z",
  pontoSuperior: { cx: 90, cy: 15, r: 8 },
  pontoInferior: { cx: 14, cy: 87, r: 7.5 },
} as const;

/** Posições da assinatura horizontal mostrada nas principais telas do produto. */
export const LOGOTIPO = {
  viewBox: "0 0 300 100",
  simbolo: {
    transform: "translate(2 5) scale(0.9)",
    d: SIMBOLO.d,
    larguraDaFita: SIMBOLO.larguraDaFita,
    pontaSuperior: SIMBOLO.pontaSuperior,
    pontaInferior: SIMBOLO.pontaInferior,
    pontoSuperior: SIMBOLO.pontoSuperior,
    pontoInferior: SIMBOLO.pontoInferior,
  },
  divisor: { x1: 104, y1: 18, x2: 104, y2: 82 },
  nome: { x: 124, y: 54, fontSize: 46, letterSpacing: -1.2 },
  sufixo: { x: 190, y: 78, fontSize: 12, letterSpacing: 8.2 },
} as const;

/** Cores da assinatura nos temas claro e escuro. */
export const CORES_DA_MARCA = {
  claro: {
    simbolo: "#7c3aed",
    ponta: "#7c3aed",
    ponto: "#a78bfa",
    nome: "#1c1a16",
    sufixo: "#7c3aed",
  },
  escuro: {
    simbolo: "#a78bfa",
    ponta: "#a78bfa",
    ponto: "#7c3aed",
    nome: "#f5f4ef",
    sufixo: "#a78bfa",
  },
} as const;
