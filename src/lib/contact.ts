import { isCompleteLocalNumber, toEvolutionFormat, toLocalDigits } from './phone';

// Webhooks n8n de ativação. Disparam a notificação por email e WhatsApp para a VN One
// e são o único caminho pelo qual um lead chega ao dono do negócio.
// NÃO ALTERAR as URLs nem o shape do payload enviado a eles (ver buildContactPayload).
export const WEBHOOKS = {
  email: 'https://n8n.vnone.com.br/webhook/portfolio-vn-email',
  whatsapp: 'https://n8n.vnone.com.br/webhook/portfolio-vn-whatsapp',
} as const;

export type ContactMethod = 'email' | 'whatsapp';

export type ContactFields = {
  nome: string;
  email: string;
  whatsapp: string;
  mensagem: string;
  servico: string;
};

export type ContactErrors = Partial<Record<keyof ContactFields, string>>;

export type ContactPayload = {
  nome: string;
  servico: string;
  mensagem: string;
  timestamp: string;
} & ({ email: string } | { whatsapp: string });

const NAME_MIN_LENGTH = 2;
const MESSAGE_MIN_LENGTH = 10;
/** Caps on what a visitor can send. The inputs stop typing at the same numbers (see ContactFieldControls). */
export const NAME_MAX = 100;
/** The longest e-mail address there is (RFC 5321). */
export const EMAIL_MAX = 254;
export const MESSAGE_MAX = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const CONTACT_ERRORS = {
  nome: 'Conta pra gente seu nome',
  nomeLongo: `Nome muito longo (máximo ${NAME_MAX} caracteres).`,
  email: 'Esse e-mail parece incompleto',
  emailLongo: `E-mail muito longo (máximo ${EMAIL_MAX} caracteres).`,
  whatsapp: 'Coloca o número com DDD, por exemplo 81 99999-9999',
  mensagem: 'Escreve um pouco mais sobre o que você precisa',
  mensagemLonga: `Mensagem muito longa (máximo ${MESSAGE_MAX} caracteres).`,
  servico: 'Escolhe um serviço',
} as const;

function nameError(nome: string): string | undefined {
  if (nome.length < NAME_MIN_LENGTH) return CONTACT_ERRORS.nome;
  return nome.length > NAME_MAX ? CONTACT_ERRORS.nomeLongo : undefined;
}

/** The length is checked first, so a huge paste never reaches the pattern. */
function emailError(email: string): string | undefined {
  if (email.length > EMAIL_MAX) return CONTACT_ERRORS.emailLongo;
  return EMAIL_PATTERN.test(email) ? undefined : CONTACT_ERRORS.email;
}

function messageError(mensagem: string): string | undefined {
  if (mensagem.length < MESSAGE_MIN_LENGTH) return CONTACT_ERRORS.mensagem;
  return mensagem.length > MESSAGE_MAX ? CONTACT_ERRORS.mensagemLonga : undefined;
}

/**
 * Valida só os campos do método escolhido: `email` apenas no método email e
 * `whatsapp` apenas no método whatsapp. O serviço só precisa estar preenchido.
 * Tamanhos são medidos no texto aparado, o mesmo que é enviado.
 */
export function validateContact(f: ContactFields, method: ContactMethod): ContactErrors {
  const errors: ContactErrors = {};

  const nome = nameError(f.nome.trim());
  if (nome) {
    errors.nome = nome;
  }
  const email = method === 'email' ? emailError(f.email.trim()) : undefined;
  if (email) {
    errors.email = email;
  }
  if (method === 'whatsapp' && !isCompleteLocalNumber(toLocalDigits(f.whatsapp))) {
    errors.whatsapp = CONTACT_ERRORS.whatsapp;
  }
  const mensagem = messageError(f.mensagem.trim());
  if (mensagem) {
    errors.mensagem = mensagem;
  }
  if (!f.servico) {
    errors.servico = CONTACT_ERRORS.servico;
  }

  return errors;
}

/**
 * Monta o corpo enviado aos webhooks: campos legados (nome, email ou whatsapp,
 * mensagem, timestamp) mais o `servico` aditivo. Não valida; quem chama valida antes.
 */
export function buildContactPayload(
  f: ContactFields,
  method: ContactMethod,
  now: Date,
): ContactPayload {
  const nome = f.nome.trim();
  const mensagem = f.mensagem.trim();
  const timestamp = now.toISOString();

  if (method === 'email') {
    return { nome, email: f.email.trim(), servico: f.servico, mensagem, timestamp };
  }
  return { nome, whatsapp: toEvolutionFormat(f.whatsapp), servico: f.servico, mensagem, timestamp };
}
