const COUNTRY_CODE = '55';
const COUNTRY_PREFIX = '+55';
const MOBILE_NINE = '9';
export const LOCAL_PHONE_LENGTHS: readonly number[] = Object.freeze([10, 11]);
/** DDD, o 9 e oito dígitos. */
const MOBILE_LOCAL_LENGTH = 11;

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
 * O número local está completo? Dez ou onze dígitos, e um de dez dígitos com o 9 como terceiro dígito não conta: o campo
 * sempre mostra o 9 do celular, então "DD 9 + 7 dígitos" é um número com um dígito a menos (ou um celular antigo de oito
 * dígitos), nunca um número completo. Um fixo vem como DD + 8 dígitos, mostrado com o 9 que o campo coloca (11 dígitos).
 */
export function isCompleteLocalNumber(local: string): boolean {
  if (!LOCAL_PHONE_LENGTHS.includes(local.length)) return false;
  return local.length === MOBILE_LOCAL_LENGTH || local[2] !== MOBILE_NINE;
}

/** DDDs em uso no Brasil (ANATEL). */
export const BRAZILIAN_DDDS: ReadonlySet<string> = new Set([
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '21', '22', '24', '27', '28',
  '31', '32', '33', '34', '35', '37', '38',
  '41', '42', '43', '44', '45', '46', '47', '48', '49',
  '51', '53', '54', '55',
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  '71', '73', '74', '75', '77', '79',
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
]);

const TRUNK_ZERO = '0';
const COUNTRY_CODED_MIN_DIGITS = 12;
// Depois de um 55 digitado, um terceiro dígito que nenhum número do DDD 55 tem: fixo começa com 2 a 5 e celular com 9.
// Então o 55 é o código do país e o terceiro dígito já é o primeiro do DDD.
const NOT_A_DDD_55_NUMBER_START: ReadonlySet<string> = new Set(['1', '6', '7', '8']);
// O 9 que o campo coloca aparece como palavra própria: "+55 DD 9 ...". Quem lê o valor sabe qual 9 é esse. O que vem antes
// dele costuma ser o DDD (2 dígitos), mas uma edição no meio do DDD deixa 0, 1 ou 3: apagar ou inserir um dígito do DDD não
// pode empurrar esse 9 para dentro do DDD nem para dentro do número.
// Um dígito digitado entre o espaço e esse 9 ("+55 81 49 ...") é o primeiro dígito do número: o grupo 2. É um só, porque se
// digita uma tecla por vez; um 9 colado depois de vários dígitos ("+55 11 999999989") não é o 9 mostrado.
const SHOWN_NINE = /^\+55 (\d{0,3}) (\d?)9(?= |$)/;
// O 9 mostrado apagado de um número do DDD 55: "+55 55  8002" (dois espaços). Não há código do país nenhum nisso.
const SHOWN_NINE_DELETED = /^\+55 (\d{2})  (\d[\d-]*)$/;
// O número completo do DDD 55 com mais um dígito digitado no fim: "+55 55 9 NNNN-NNNN" + d.
const FULL_DDD_55_PLUS_DIGIT = /^\+55 55 9 (\d{4})-(\d{4})(\d)$/;

const onlyDigits = (text: string): string => text.replace(/\D/g, '');

type TypedNumber = { local: string; hasTypedNine: boolean };

/**
 * Um 55 digitado à mão é o código do país, como quando o número é colado (R61 a R76): com 12 dígitos ou mais, com 11 e o
 * terceiro não sendo o 9 do celular, ou quando o terceiro dígito nenhum número do DDD 55 poderia ter. O DDD 55 (Rio
 * Grande do Sul) fica inteiro: 55 + 8 dígitos de fixo (2 a 5) ou 55 9 + 8 dígitos de celular.
 */
function dropTypedCountryCode(local: string): string {
  if (!local.startsWith(COUNTRY_CODE) || local.length <= COUNTRY_CODE.length) return local;
  const third = local[2];
  const isCountryCoded =
    local.length >= COUNTRY_CODED_MIN_DIGITS ||
    (local.length === MOBILE_LOCAL_LENGTH && third !== MOBILE_NINE) ||
    NOT_A_DDD_55_NUMBER_START.has(third);
  return isCountryCoded ? local.substring(COUNTRY_CODE.length) : local;
}

/**
 * O zero de tronco ("0 81 98445-1243", 081...) não é parte do número: nenhum DDD começa com 0 e o campo o lia como o DDD 08.
 * Sai digitado ou colado, do mesmo jeito. Colado inteiro, um código de operadora de dois dígitos depois do zero
 * ("015 81 98445-1243") também sai: depois do zero, DDD e número têm 10 ou 11 dígitos, então 12 ou 13 só podem ser o código
 * da operadora mais o número. Digitado tecla por tecla o campo só vê um dígito novo por vez e o zero já saiu na primeira
 * tecla, então o código da operadora digitado é lido como DDD (limite conhecido, ver os testes).
 */
const CARRIER_CODE_LENGTH = 2;
const WITH_CARRIER_CODE_LENGTHS: readonly number[] = [12, 13];
function dropTrunkZero(local: string): string {
  if (!local.startsWith(TRUNK_ZERO)) return local;
  const withoutZero = local.substring(TRUNK_ZERO.length);
  return WITH_CARRIER_CODE_LENGTHS.includes(withoutZero.length) ? withoutZero.substring(CARRIER_CODE_LENGTH) : withoutZero;
}

/** Tira o 9 do celular digitado depois do DDD (o campo o mostra sozinho, como palavra própria). */
function readTypedDigits(local: string): TypedNumber {
  if (local.length > 2 && local[2] === MOBILE_NINE) {
    return { local: local.substring(0, 2) + local.substring(3), hasTypedNine: true };
  }
  return { local, hasTypedNine: false };
}

/**
 * O número completo do DDD 55 mais um dígito digitado no fim pode ser um engano (um dígito a mais), "55 8x ..." (um
 * código do país digitado que o campo já tinha lido como DDD 55 + número) ou "55 9d ..." (o 9 do DDD 9d lido como o 9 do
 * celular). Os dígitos mostrados são os mesmos nos três casos, então decide a estrutura: um primeiro dígito 1, 6, 7, 8 ou
 * 9 só pode vir de "55 9d" (um "55 1x" já teria virado DDD 1x); com 2 a 5, vale o DDD que existe (2x, 3x, 4x, 5x) e, se
 * ele não existir, o "9d" quando o dígito seguinte é de fixo (2 a 5) ou o 9 do celular. Sobra um caso ambíguo, o DDD 92 a
 * 95 digitado com o código do país cujo número também forma um DDD 2x a 5x; o número colado, com todos os dígitos, vale.
 */
function readFullDdd55PlusDigit(rest: string, digit: string): TypedNumber {
  const [first, second] = [rest[0], rest[1]];
  const looksLikeNineD = !'2345'.includes(first) || (!BRAZILIAN_DDDS.has(first + second) && '23459'.includes(second));
  const typed = looksLikeNineD ? `${COUNTRY_CODE}${MOBILE_NINE}${rest}${digit}` : `${COUNTRY_CODE}${rest}${digit}`;
  return readTypedDigits(dropTypedCountryCode(typed));
}

/**
 * Um valor que já é um número mostrado pelo campo ("+55 DD " e pelo menos seis dígitos depois do prefixo): o DDD 55 ali é o
 * DDD, não um código do país digitado. Um código do país digitado à mão aparece nos primeiros dígitos ("+55 55 8"), antes
 * de o campo ter mostrado número nenhum.
 */
const DISPLAY_AFTER_PREFIX = /^\+55 \d{2} /;
const LONG_DISPLAY_MIN_DIGITS = 6;
function isLongDisplay(raw: string): boolean {
  return DISPLAY_AFTER_PREFIX.test(raw) && onlyDigits(raw).length - COUNTRY_CODE.length >= LONG_DISPLAY_MIN_DIGITS;
}

function readLocalDigits(raw: string): TypedNumber {
  const deleted = SHOWN_NINE_DELETED.exec(raw);
  if (deleted) return readTypedDigits(deleted[1] + onlyDigits(deleted[2]));

  const match = SHOWN_NINE.exec(raw);
  // Um dígito antes do 9 só vale depois de um DDD inteiro: "+55 0 19 9 ..." (um número colado com o zero de tronco) não é isso.
  const shown = match && (match[2] === '' || match[1].length === 2) ? match : null;
  if (!shown) {
    const local = dropTrunkZero(toLocalDigits(raw));
    // Com o "+55" do campo na frente, o que vem depois pode ser um 55 digitado à mão (o código do país). Sem ele, o texto
    // inteiro é o número e o código do país, se havia um, já foi tirado por toLocalDigits.
    const mayHaveTypedCountryCode = raw.trimStart().startsWith(COUNTRY_PREFIX) && !isLongDisplay(raw);
    return readTypedDigits(mayHaveTypedCountryCode ? dropTypedCountryCode(local) : local);
  }

  const extra = FULL_DDD_55_PLUS_DIGIT.exec(raw);
  if (extra) return readFullDdd55PlusDigit(extra[1] + extra[2], extra[3]);

  // O 9 mostrado já foi lido: os dígitos depois dele são do número, e o terceiro deles não é mais um terceiro dígito digitado.
  return { local: shown[1] + shown[2] + onlyDigits(raw.slice(shown[0].length)), hasTypedNine: true };
}

/**
 * Formata para exibição: +55 DD 9 NNNN-NNNN
 * O +55 e o 9 são inseridos automaticamente. Usuário digita apenas DDD + 8 dígitos.
 */
export function formatWhatsappDisplay(raw: string): string {
  const { hasTypedNine, local: typed } = readLocalDigits(raw);

  // Limita a 10 dígitos (DDD 2 + número 8)
  const local = typed.slice(0, 10);

  if (local.length === 0) return '+55 ';
  // DDD e o 9 digitados, ainda sem nenhum dígito do número: o 9 continua visível. Sem isso o 9 sumiria e o próximo 9
  // digitado seria lido de novo como esse 9 (81 9 + 9xxx-xxxx perdia todos os 9 logo depois do DDD).
  if (local.length === 2 && hasTypedNine) return `+55 ${local} ${MOBILE_NINE}`;
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
