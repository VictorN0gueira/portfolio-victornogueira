const MILLION = 1_000_000;
const THOUSAND = 1_000;
const STAT_PATTERN = /^(\d+(?:[.,]\d+)?)(.*)$/;

/** Moeda pt-BR sem casas decimais, por exemplo 'R$ 1.733' (espaço não separável). */
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

/**
 * Moeda abreviada: 'R$ 1.2M' a partir de 1 milhão, 'R$ 78K' a partir de mil, senão o formato completo.
 * Valores que arredondam para 1000K (999.500 em diante) já saem em milhões, como 'R$ 1.0M'.
 */
export function formatBRLCompact(value: number): string {
  const roundedThousands = Math.round(value / THOUSAND);
  if (value >= MILLION || roundedThousands >= THOUSAND) {
    return `R$ ${(value / MILLION).toFixed(1)}M`;
  }
  if (value >= THOUSAND) {
    return `R$ ${roundedThousands}K`;
  }
  return formatBRL(value);
}

/** Separa o número inicial do sufixo de um stat, por exemplo '500h+' vira { num: 500, suffix: 'h+' }. Aceita decimal com ponto ou vírgula ('1,5x'). */
export function parseStat(value: string): { num: number; suffix: string } | null {
  const match = STAT_PATTERN.exec(value);
  if (!match) return null;
  return { num: Number(match[1].replace(',', '.')), suffix: match[2] };
}
