const MILLION = 1_000_000;
const THOUSAND = 1_000;
const NBSP = '\u00A0';
// Abaixo de 10 mil (100 décimos de mil) o valor leva uma casa decimal.
const DECIMAL_LIMIT_TENTHS = 100;
const STAT_PATTERN = /^(\d+(?:[.,]\d+)?)(.*)$/;

/** Moeda pt-BR sem casas decimais, por exemplo 'R$ 1.733' (espaço não separável). */
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

/**
 * Moeda abreviada em pt-BR: 'R$ 1,2 mi' a partir de 1 milhão, 'R$ 1,5 mil' e 'R$ 78 mil' a partir de mil, senão o formato completo.
 * Valor que não é número finito conta como zero.
 * Os espaços não se separam e a casa decimal só aparece quando não é zero ('R$ 1,3 mi', 'R$ 312 mi'). Valores que arredondam para 1000 mil (999.500 em diante) já saem em milhões, como 'R$ 1 mi'.
 */
export function formatBRLCompact(rawValue: number): string {
  const value = Number.isFinite(rawValue) ? rawValue : 0;
  const roundedThousands = Math.round(value / THOUSAND);
  if (value >= MILLION || roundedThousands >= THOUSAND) {
    const millions = (value / MILLION).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    return `R$${NBSP}${millions}${NBSP}mi`;
  }
  if (value >= THOUSAND) {
    return `R$${NBSP}${thousandsText(value)}${NBSP}mil`;
  }
  return formatBRL(value);
}

/** Mil com uma casa até 10 mil ('1,5'), sem casa a partir daí ('16'). Arredonda em décimos inteiros, sem ponto flutuante. */
function thousandsText(value: number): string {
  const tenths = Math.round(value / (THOUSAND / 10));
  if (tenths >= DECIMAL_LIMIT_TENTHS) return String(Math.round(value / THOUSAND));
  const whole = Math.floor(tenths / 10);
  const decimal = tenths % 10;
  return decimal === 0 ? String(whole) : `${whole},${decimal}`;
}

/** Separa o número inicial do sufixo de um stat, por exemplo '500h+' vira { num: 500, suffix: 'h+' }. Aceita decimal com ponto ou vírgula ('1,5x'). */
export function parseStat(value: string): { num: number; suffix: string } | null {
  const match = STAT_PATTERN.exec(value);
  if (!match) return null;
  return { num: Number(match[1].replace(',', '.')), suffix: match[2] };
}
