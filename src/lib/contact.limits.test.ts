import { describe, expect, it } from 'vitest';
import { EMAIL_MAX, MESSAGE_MAX, NAME_MAX, buildContactPayload, validateContact } from './contact';

const ok = {
  nome: 'Ana Lima',
  email: 'ana@empresa.com.br',
  whatsapp: '+55 81 9 8445-1243',
  mensagem: 'Quero automatizar notas fiscais',
  servico: 'Automação de processos',
};

const NAME_TOO_LONG = 'Nome muito longo (máximo 100 caracteres).';
const EMAIL_TOO_LONG = 'E-mail muito longo (máximo 254 caracteres).';
const MESSAGE_TOO_LONG = 'Mensagem muito longa (máximo 2000 caracteres).';

describe('contact length caps', () => {
  it('pins the three caps', () => {
    expect([NAME_MAX, EMAIL_MAX, MESSAGE_MAX]).toEqual([100, 254, 2000]);
  });

  it('accepts a name of 100 characters and rejects one of 101', () => {
    expect(validateContact({ ...ok, nome: 'a'.repeat(100) }, 'email').nome).toBeUndefined();
    expect(validateContact({ ...ok, nome: 'a'.repeat(101) }, 'email').nome).toBe(NAME_TOO_LONG);
  });

  it('accepts a message of 2000 characters and rejects one of 2001', () => {
    expect(validateContact({ ...ok, mensagem: 'a'.repeat(2000) }, 'email').mensagem).toBeUndefined();
    expect(validateContact({ ...ok, mensagem: 'a'.repeat(2001) }, 'email').mensagem).toBe(MESSAGE_TOO_LONG);
  });

  it('rejects an e-mail of 255 characters with its own message and accepts 254', () => {
    const address = (length: number) => `${'a'.repeat(length - '@example.com'.length)}@example.com`;
    expect(validateContact({ ...ok, email: address(254) }, 'email').email).toBeUndefined();
    expect(validateContact({ ...ok, email: address(255) }, 'email').email).toBe(EMAIL_TOO_LONG);
  });

  it('measures the trimmed text, the one that is sent', () => {
    expect(validateContact({ ...ok, nome: ` ${'a'.repeat(100)} ` }, 'email').nome).toBeUndefined();
    expect(validateContact({ ...ok, mensagem: ` ${'a'.repeat(2000)} ` }, 'email').mensagem).toBeUndefined();
  });

  it('checks the e-mail cap only on the e-mail method', () => {
    expect(validateContact({ ...ok, email: 'a'.repeat(300) }, 'whatsapp').email).toBeUndefined();
  });

  it('keeps the messages of the rules that already existed', () => {
    expect(validateContact({ ...ok, nome: 'A' }, 'email').nome).toBe('Conta pra gente seu nome');
    expect(validateContact({ ...ok, email: 'ana@' }, 'email').email).toBe('Esse e-mail parece incompleto');
    expect(validateContact({ ...ok, mensagem: 'oi' }, 'email').mensagem).toBe(
      'Escreve um pouco mais sobre o que você precisa',
    );
  });

  it('uses no long dash and no slash in the new messages', () => {
    for (const message of [NAME_TOO_LONG, EMAIL_TOO_LONG, MESSAGE_TOO_LONG]) {
      expect(message).not.toMatch(/[–—/]/u);
    }
  });
});

describe('the largest request body', () => {
  // The request is sent with keepalive, which browsers cap at 64 KiB for the body. A control character is the worst case:
  // one character becomes six bytes of JSON (\u0000), and the cap on each field bounds the rest.
  const KEEPALIVE_LIMIT_BYTES = 64 * 1024;
  const worst = (length: number) => ''.repeat(length);

  it.each(['email', 'whatsapp'] as const)('stays far under the keepalive limit on the %s method', (method) => {
    const payload = buildContactPayload(
      { nome: worst(NAME_MAX), email: worst(EMAIL_MAX), whatsapp: '+55 81 9 8445-1243', mensagem: worst(MESSAGE_MAX), servico: ok.servico },
      method,
      new Date('2026-10-29T12:00:00.000Z'),
    );

    const bytes = new TextEncoder().encode(JSON.stringify(payload)).length;
    expect(bytes).toBeGreaterThan(MESSAGE_MAX * 6);
    expect(bytes).toBeLessThan(KEEPALIVE_LIMIT_BYTES / 2);
  });
});
