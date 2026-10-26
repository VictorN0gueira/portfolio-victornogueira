/**
 * Formata para exibição: +55 DD 9 NNNN-NNNN
 * O +55 e o 9 são inseridos automaticamente. Usuário digita apenas DDD + 8 dígitos.
 */
export function formatWhatsappDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  // Remove o 55 inicial se o usuário digitou
  let local = digits.startsWith('55') ? digits.substring(2) : digits;

  // Remove o 9 se o usuário digitou após o DDD (será adicionado automaticamente)
  if (local.length > 2 && local[2] === '9') {
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
 * Remove o 9 extra (11 dígitos locais viram 10) para compatibilidade.
 */
export function toEvolutionFormat(raw: string): string {
  let num = raw.replace(/\D/g, '');

  if (num.startsWith('55') && num.length >= 12) {
    num = num.substring(2);
  }

  // Se tem 11 dígitos (com o 9), remove o 9 (índice 2)
  if (num.length === 11) {
    num = num.substring(0, 2) + num.substring(3);
  }

  return '55' + num;
}
