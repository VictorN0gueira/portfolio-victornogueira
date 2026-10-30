import { describe, expect, it } from 'vitest';
import { validateContact } from './contact';

const ok = {
  nome: 'Ana Lima',
  email: 'ana@empresa.com.br',
  whatsapp: '+55 81 9 8445-1243',
  mensagem: 'Quero automatizar notas fiscais',
  servico: 'Automação de processos',
};

const MAX_EMAIL = 254;
const MAX_DURATION_MS = 50;

const emailError = (email: string) => validateContact({ ...ok, email }, 'email').email;

/** An address of exactly `length` characters: a long local part, then @example.com. */
const addressOfLength = (length: number) => `${'a'.repeat(length - '@example.com'.length)}@example.com`;

// What the e-mail pattern accepted and rejected before the length guard. The guard must not move a single row.
const ACCEPTED = [
  'ana@empresa.com.br',
  'a@b.co',
  'a.b+c@d.e.fg',
  'ana@empresa.com',
  '  ana@example.com  ',
  'ANA@EMPRESA.COM',
  'ana_lima-1@sub.dominio.com.br',
  'ana@xn--exmple-cua.com',
  'ana@empresa.c0m',
  'a@b.cd',
  'ana@a..com',
  'ana..lima@empresa.com',
  '"ana"@empresa.com',
  'ana@empresa.photography',
];

const REJECTED = [
  '',
  '   ',
  'ana',
  'ana@',
  '@empresa.com',
  'ana@empresa',
  'ana@empresa.c',
  'ana@.com',
  'ana@@empresa.com',
  'ana@empresa@com.br',
  'ana lima@empresa.com',
  'ana@empresa .com',
  'ana@empresa.com\nb@c.com',
];

describe('e-mail pattern, accepted set', () => {
  it.each(ACCEPTED)('accepts %j', (email) => {
    expect(emailError(email)).toBeUndefined();
  });

  it.each(REJECTED)('rejects %j', (email) => {
    expect(emailError(email)).toBe('Esse e-mail parece incompleto');
  });
});

describe('e-mail length guard', () => {
  it('accepts an address of exactly 254 characters', () => {
    const email = addressOfLength(MAX_EMAIL);
    expect(email).toHaveLength(MAX_EMAIL);
    expect(emailError(email)).toBeUndefined();
  });

  it('rejects an address of 255 characters', () => {
    const email = addressOfLength(MAX_EMAIL + 1);
    expect(email).toHaveLength(MAX_EMAIL + 1);
    expect(emailError(email)).toBeTruthy();
  });

  it('measures the trimmed address, the one that is sent', () => {
    expect(emailError(`  ${addressOfLength(MAX_EMAIL)}  `)).toBeUndefined();
  });

  it.each([
    ['50,000 dots', '.'.repeat(50_000)],
    ['50,000 dots after an @', `a@${'.'.repeat(50_000)}`],
    ['50,000 letters before an @', `${'a'.repeat(50_000)}@`],
    ['50,000 chunks of a.', 'a.'.repeat(25_000)],
    ['50,000 dots then a space', `${'.'.repeat(50_000)} `],
  ])('rejects %s in under 50 ms', (_name, email) => {
    const started = performance.now();
    const error = emailError(email);
    const elapsed = performance.now() - started;

    expect(error).toBeTruthy();
    expect(elapsed).toBeLessThan(MAX_DURATION_MS);
  });
});
