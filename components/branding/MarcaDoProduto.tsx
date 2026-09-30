import { LOGOTIPO, SIMBOLO } from "@/lib/branding/desenho";
import { cn } from "@/lib/utils";

/**
 * A marca do PRODUTO desenhada em SVG inline — o que a tela mostra quando
 * ninguém configurou marca própria (`marcaEhADoProduto`, em `lib/branding.ts`).
 *
 * Inline, e não `<img src="/algo.svg">`, porque as cores acompanham o tema e
 * um SVG estático em `public/` vazaria para instalações white-label. O mesmo
 * desenho é usado na fachada, na navegação e no ícone padrão da aba.
 */

type Props = {
  readonly nome: string;
  readonly className?: string;
  /** `true` quando o texto ao lado já nomeia a marca — evita ler duas vezes. */
  readonly decorativo?: boolean;
};

const SIMBOLO_CLARO_ESCURO = "stroke-[#7c3aed] dark:stroke-[#a78bfa]";
const PONTA_CLARO_ESCURO = "fill-[#7c3aed] dark:fill-[#a78bfa]";
const PONTO_CLARO_ESCURO = "fill-[#a78bfa] dark:fill-[#7c3aed]";
const NOME_CLARO_ESCURO = "fill-[#1c1a16] dark:fill-[#f5f4ef]";
const SUFIXO_CLARO_ESCURO = "fill-[#7c3aed] dark:fill-[#a78bfa]";
const DIVISOR_CLARO_ESCURO = "stroke-[#d2cdbf] dark:stroke-[#46433b]";

// Os hexes literais alimentam o Tailwind; `marca-do-produto.test.tsx` confere
// que continuem sincronizados com `CORES_DA_MARCA`.
export const CLASSES_DE_COR = {
  simbolo: SIMBOLO_CLARO_ESCURO,
  ponta: PONTA_CLARO_ESCURO,
  ponto: PONTO_CLARO_ESCURO,
  nome: NOME_CLARO_ESCURO,
  sufixo: SUFIXO_CLARO_ESCURO,
} as const;

function acessibilidade(nome: string, decorativo: boolean) {
  return decorativo
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": nome } as const);
}

function MarcaVetorial({ transform }: { readonly transform?: string }) {
  return (
    <g transform={transform}>
      <path
        d={SIMBOLO.d}
        fill="none"
        strokeWidth={SIMBOLO.larguraDaFita}
        strokeLinecap="butt"
        strokeLinejoin="round"
        className={SIMBOLO_CLARO_ESCURO}
      />
      <path d={SIMBOLO.pontaSuperior} className={PONTA_CLARO_ESCURO} />
      <path d={SIMBOLO.pontaInferior} className={PONTA_CLARO_ESCURO} />
      <circle {...SIMBOLO.pontoSuperior} className={PONTO_CLARO_ESCURO} />
      <circle {...SIMBOLO.pontoInferior} className={SIMBOLO_CLARO_ESCURO} />
    </g>
  );
}

/** O símbolo sozinho — para a barra recolhida, avatar e cantos apertados. */
export function SimboloDoProduto({ nome, className, decorativo = false }: Props) {
  return (
    <svg
      viewBox={SIMBOLO.viewBox}
      className={cn("shrink-0", className)}
      {...acessibilidade(nome, decorativo)}
    >
      <MarcaVetorial />
    </svg>
  );
}

/** Símbolo + divisor + nome — assinatura horizontal das telas principais. */
export function LogotipoDoProduto({ nome, className, decorativo = false }: Props) {
  return (
    <svg
      viewBox={LOGOTIPO.viewBox}
      className={cn("shrink-0", className)}
      {...acessibilidade(nome, decorativo)}
    >
      <MarcaVetorial transform={LOGOTIPO.simbolo.transform} />
      <line {...LOGOTIPO.divisor} className={DIVISOR_CLARO_ESCURO} strokeWidth={1.25} />
      <text
        x={LOGOTIPO.nome.x}
        y={LOGOTIPO.nome.y}
        fontFamily="var(--font-atkinson), Arial, sans-serif"
        fontSize={LOGOTIPO.nome.fontSize}
        fontWeight={700}
        letterSpacing={LOGOTIPO.nome.letterSpacing}
        className={NOME_CLARO_ESCURO}
      >
        Striva
      </text>
      <text
        x={LOGOTIPO.sufixo.x}
        y={LOGOTIPO.sufixo.y}
        textAnchor="middle"
        fontFamily="var(--font-atkinson), Arial, sans-serif"
        fontSize={LOGOTIPO.sufixo.fontSize}
        fontWeight={700}
        letterSpacing={LOGOTIPO.sufixo.letterSpacing}
        className={SUFIXO_CLARO_ESCURO}
      >
        SALES
      </text>
    </svg>
  );
}
