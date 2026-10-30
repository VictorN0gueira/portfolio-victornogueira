import { LOCAL_PHONE_LENGTHS, toEvolutionFormat, toLocalDigits } from './phone';

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
/** The longest e-mail address there is (RFC 5321). */
export const EMAIL_MAX = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The pattern only runs on a string that is already short enough, so a huge paste never reaches the regex. */
function isValidEmail(email: string): boolean {
  return email.length <= EMAIL_MAX && EMAIL_PATTERN.test(email);
}

const CONTACT_ERRORS = {
  nome: 'Conta pra gente seu nome',
  email: 'Esse e-mail parece incompleto',
  whatsapp: 'Coloca o número com DDD, por exemplo 81 99999-9999',
  mensagem: 'Escreve um pouco mais sobre o que você precisa',
  servico: 'Escolhe um serviço',
} as const;

/**
 * Valida só os campos do método escolhido: `email` apenas no método email e
 * `whatsapp` apenas no método whatsapp. O serviço só precisa estar preenchido.
 */
export function validateContact(f: ContactFields, method: ContactMethod): ContactErrors {
  const errors: ContactErrors = {};

  if (f.nome.trim().length < NAME_MIN_LENGTH) {
    errors.nome = CONTACT_ERRORS.nome;
  }
  if (method === 'email' && !isValidEmail(f.email.trim())) {
    errors.email = CONTACT_ERRORS.email;
  }
  if (method === 'whatsapp' && !LOCAL_PHONE_LENGTHS.includes(toLocalDigits(f.whatsapp).length)) {
    errors.whatsapp = CONTACT_ERRORS.whatsapp;
  }
  if (f.mensagem.trim().length < MESSAGE_MIN_LENGTH) {
    errors.mensagem = CONTACT_ERRORS.mensagem;
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
