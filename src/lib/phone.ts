const COUNTRY_CODE = '55';
const COUNTRY_PREFIX = '+55';
const MOBILE_NINE = '9';
export const LOCAL_PHONE_LENGTHS: readonly number[] = [10, 11];

/**
 * Dígitos locais (DDD + número), sem o código do país.
 *
 * Um 55 inicial só é o código do país quando o valor traz o prefixo "+55" (o campo
 * sempre mostra esse prefixo) ou quando não parece um número local completo, isto é,
 * tem 12 dígitos ou mais, ou é uma digitação parcial com menos de 10 dígitos
 * ("5581" continua sendo "+55 81"). Um número de 10 ou 11 dígitos sem "+55" que
 * começa com 55 tem o DDD 55 (Rio Grande do Sul) e fica inteiro.
 */
export function toLocalDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits.startsWith(COUNTRY_CODE)) return digits;

  const hasCountryPrefix = raw.trimStart().startsWith(COUNTRY_PREFIX);
  const looksLikeLocalNumber = LOCAL_PHONE_LENGTHS.includes(digits.length);
  return hasCountryPrefix || !looksLikeLocalNumber ? digits.substring(COUNTRY_CODE.length) : digits;
}

/**
 * Formata para exibição: +55 DD 9 NNNN-NNNN
 * O +55 e o 9 são inseridos automaticamente. Usuário digita apenas DDD + 8 dígitos.
 */
export function formatWhatsappDisplay(raw: string): string {
  // Remove o 55 inicial se for o código do país
  let local = toLocalDigits(raw);

  // Remove o 9 se o usuário digitou após o DDD (será adicionado automaticamente)
  if (local.length > 2 && local[2] === MOBILE_NINE) {
    local = local.substring(0, 2) + local.substring(3);
  }

  // Limita a 10 dígitos (DDD 2 + número 8)
  local = local.slice(0, 10);

  if (local.length === 0) return '+55 ';
  if (local.length <= 2) return `+55 ${local}`;
  if (local.length <= 6) return `+55 ${local.slice(0, 2)} 9 ${local.slice(2)}`;
  return `+55 ${local.slice(0, 2)} 9 ${local.slice(2, 6)}-${local.slice(6, 10)}`;
}

/**
 * Converte para o formato padrão da Evolution API: 558195493732
 * Remove o 9 extra do celular (11 dígitos locais viram 10) para compatibilidade;
 * se o terceiro dígito não for 9, os dígitos ficam como estão.
 */
export function toEvolutionFormat(raw: string): string {
  let num = toLocalDigits(raw);

  // Se tem 11 dígitos e o terceiro é o 9 do celular, remove o 9 (índice 2)
  if (num.length === 11 && num[2] === MOBILE_NINE) {
    num = num.substring(0, 2) + num.substring(3);
  }

  return COUNTRY_CODE + num;
}
