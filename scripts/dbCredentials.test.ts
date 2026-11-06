// @vitest-environment node
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { generatePassword, mintRoleToken, scramSha256Verifier } from './db-credentials.mjs';

// Synthetic values only. The JWT secret below is made up for these tests.
const FAKE_JWT_SECRET = 'fake-jwt-secret-for-tests-only-0123456789';
const b64url = (buffer: Buffer | string) => Buffer.from(buffer).toString('base64url');
const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<string, unknown>;
const NOW = new Date('2026-11-06T12:00:00Z');
const DAY_S = 86_400;

describe('generatePassword', () => {
  it('is 32 characters of letters and digits, and two calls differ', () => {
    const first = generatePassword();
    expect(first).toMatch(/^[A-Za-z0-9]{32}$/);
    expect(generatePassword()).not.toBe(first);
  });

  it('uses all of the alphabet over many draws, not a short part of it', () => {
    const seen = new Set(Array.from({ length: 200 }, generatePassword).join(''));
    expect(seen.size).toBeGreaterThan(55);
  });
});

describe('mintRoleToken', () => {
  it('makes an HS256 JWT of three parts with the role, the issuer, and an expiry in the future', () => {
    const token = mintRoleToken({ jwtSecret: FAKE_JWT_SECRET, role: 'news_writer', now: () => NOW });
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    expect(decode(parts[0])).toEqual({ alg: 'HS256', typ: 'JWT' });
    const payload = decode(parts[1]);
    expect(payload).toMatchObject({ role: 'news_writer', iss: 'supabase' });
    const iat = Math.floor(NOW.getTime() / 1000);
    expect(payload.iat).toBe(iat);
    expect(payload.exp as number).toBeGreaterThan(iat);
  });

  it('signs with the secret, and the signature does not match another secret', () => {
    const [header, body, signature] = mintRoleToken({
      jwtSecret: FAKE_JWT_SECRET,
      role: 'news_writer',
      now: () => NOW,
    }).split('.');
    const expected = b64url(createHmac('sha256', FAKE_JWT_SECRET).update(`${header}.${body}`).digest());
    expect(signature).toBe(expected);
    expect(signature).not.toBe(b64url(createHmac('sha256', 'another-secret').update(`${header}.${body}`).digest()));
  });

  it('expires in 365 days by default and in the number of days it is given', () => {
    const iat = Math.floor(NOW.getTime() / 1000);
    const exp = (days?: number) =>
      decode(mintRoleToken({ jwtSecret: FAKE_JWT_SECRET, role: 'news_writer', days, now: () => NOW }).split('.')[1])
        .exp as number;
    expect(exp()).toBe(iat + 365 * DAY_S);
    expect(exp(30)).toBe(iat + 30 * DAY_S);
    expect(exp(1)).toBe(iat + DAY_S);
  });

  it('refuses what is not a short token for the writer role', () => {
    const mint = (options: Record<string, unknown>) => () =>
      mintRoleToken({ jwtSecret: FAKE_JWT_SECRET, role: 'news_writer', ...options } as never);
    expect(mint({ days: 0 })).toThrow();
    expect(mint({ days: -5 })).toThrow();
    expect(mint({ days: 1.5 })).toThrow();
    expect(mint({ days: 'x' })).toThrow();
    expect(mint({ days: 1826 })).toThrow();
    expect(mint({ role: 'service_role' })).toThrow();
    expect(mint({ role: 'anon' })).toThrow();
    expect(mint({ jwtSecret: '' })).toThrow();
    expect(mint({ jwtSecret: 'short' })).toThrow();
  });

  it('never puts the secret in an error', () => {
    try {
      mintRoleToken({ jwtSecret: FAKE_JWT_SECRET, role: 'service_role' as never });
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).not.toContain(FAKE_JWT_SECRET);
    }
  });
});

// The verifier lets the password travel as a hash: `alter role x password '<verifier>'` through /pg/query would otherwise
// put the clear text in a statement that the server may log. The vector was produced by a real PostgreSQL 15
// (password_encryption = scram-sha-256, `alter role ... password 'pencil-vector-1'`, read back from pg_authid), and the
// same verifier was then used for a real SCRAM login through psql.
describe('scramSha256Verifier', () => {
  const SALT = Buffer.from('FBBqSb9AHzSHnLnnEocViw==', 'base64');

  it('matches the verifier that PostgreSQL itself computes for the same password, salt and iterations', () => {
    expect(scramSha256Verifier('pencil-vector-1', 4096, SALT)).toBe(
      'SCRAM-SHA-256$4096:FBBqSb9AHzSHnLnnEocViw==$NWMvVIDPl4kt0kLEGLZtoky17rkF0kVYiXcToATmArE=:N/QyXkvgsOIbAqRoIM+3+MR7B2lScSHSnSWy2IBEJI8=',
    );
  });

  it('has the shape SCRAM-SHA-256$iterations:salt$StoredKey:ServerKey, with a fresh salt each time', () => {
    const first = scramSha256Verifier('a-password');
    expect(first).toMatch(/^SCRAM-SHA-256\$4096:[A-Za-z0-9+/]{22}==\$[A-Za-z0-9+/]{43}=:[A-Za-z0-9+/]{43}=$/);
    expect(scramSha256Verifier('a-password')).not.toBe(first);
    expect(scramSha256Verifier('a-password', 8192)).toMatch(/^SCRAM-SHA-256\$8192:/);
  });

  it('never contains the password, and refuses what it cannot normalise the way PostgreSQL would', () => {
    expect(scramSha256Verifier('pencil-vector-1')).not.toContain('pencil');
    expect(() => scramSha256Verifier('')).toThrow();
    expect(() => scramSha256Verifier('senha-com-acentuação')).toThrow();
    expect(() => scramSha256Verifier('ok', 0)).toThrow();
    expect(() => scramSha256Verifier('ok', 4096.5)).toThrow();
  });
});
