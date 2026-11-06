// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { assertLocalDatabase } from './run-rls-tests.mjs';

// The RLS runner applies migrations and role stand-ins: it must never be pointed at a real database by accident.
describe('assertLocalDatabase', () => {
  it.each([
    'postgres://postgres:test@localhost:55432/postgres',
    'postgresql://postgres:test@127.0.0.1:5432/postgres',
    'postgres://postgres:test@[::1]:5432/postgres',
  ])('accepts the local address %s', (url) => {
    expect(() => assertLocalDatabase(url)).not.toThrow();
  });

  it.each([
    'postgres://postgres:test@db.example.test:5432/postgres',
    'postgres://postgres:test@10.0.0.5:5432/postgres',
    'postgres://postgres:test@localhost.example.test:5432/postgres',
    'postgres://postgres:test@utilitarios-supabase-pooler:6543/postgres',
    'https://localhost/postgres',
    'not an address',
    '',
    undefined,
  ])('refuses %s', (url) => {
    expect(() => assertLocalDatabase(url)).toThrow();
  });

  it('never repeats the password of the address in the error', () => {
    try {
      assertLocalDatabase('postgres://postgres:secret-pass@db.example.test:5432/postgres');
      expect.unreachable();
    } catch (error) {
      expect((error as Error).message).not.toContain('secret-pass');
    }
  });
});
