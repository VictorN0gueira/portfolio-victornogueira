// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { services } from './services';

const ROOT = resolve(__dirname, '../..');
const SKIPPED_FOLDERS = new Set([
  'node_modules',
  'dist',
  'coverage',
  'test-results',
  'playwright-report',
  '.git',
  '.claude',
  '__shots__',
]);
const TEXT_FILE = /\.(ts|tsx|css|html|md|xml|txt|json|mjs|cjs|js)$/;
// Built from pieces so this file does not match itself.
const REMOVED_SERVICE = new RegExp(['landing', 'page', 'complexa'].join('[ -]'), 'i');

function walk(path: string): string[] {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return TEXT_FILE.test(path) ? [path] : [];
  return readdirSync(path).flatMap((entry) => (SKIPPED_FOLDERS.has(entry) ? [] : walk(join(path, entry))));
}

describe('the service list with Super Agente', () => {
  it('lists exactly six services, in this order, with unique slugs', () => {
    expect(services.map((service) => service.nome)).toEqual([
      'Automação Essencial',
      'Automação Avançada',
      'Agente de IA Sob Medida',
      'Super Agente',
      'Landing Page ou Site',
      'Sistema Web Sob Medida',
    ]);
    expect(services.map((service) => service.slug)).toEqual([
      'automacao-essencial',
      'automacao-avancada',
      'agente-de-ia-sob-medida',
      'super-agente',
      'landing-page-ou-site',
      'sistema-web-sob-medida',
    ]);
    expect(new Set(services.map((service) => service.slug)).size).toBe(6);
  });

  it('groups the services by category in the order the footer and the home read them', () => {
    expect(services.map((service) => service.categoria)).toEqual([
      'Automação',
      'Automação',
      'Inteligência Artificial',
      'Inteligência Artificial',
      'Desenvolvimento Web',
      'Desenvolvimento Web',
    ]);
  });

  it('gives Super Agente four bullets and no fixed deadline: the 30 minute conversation defines it', () => {
    const superAgente = services.find((service) => service.slug === 'super-agente');

    expect(superAgente?.inclui).toHaveLength(4);
    expect(superAgente?.prazo).toBe('definido na conversa de 30 minutos');
    expect(superAgente?.prazo).not.toMatch(/\d+ (semana|mes|dia)/i);
  });

  it('keeps the word chatbot out of every service', () => {
    const copy = services.flatMap((service) => [service.nome, service.descricao, ...service.inclui]).join(' | ');

    expect(copy).not.toMatch(/chat-?bots?/i);
  });

  it('mentions the removed service nowhere in the source, the e2e specs, the public files or the docs', () => {
    const files = ['src', 'e2e', 'public', 'docs', 'README.md', 'index.html'].flatMap((entry) =>
      walk(join(ROOT, entry)),
    );
    const offenders = files
      .filter((file) => REMOVED_SERVICE.test(readFileSync(file, 'utf8')))
      .map((file) => relative(ROOT, file).split(sep).join('/'));

    expect(offenders).toEqual([]);
  });
});
