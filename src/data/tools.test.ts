// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { toolCategories } from './tools';

// The list is the owner's. These are the literals of Skills.tsx (b439532) with his decision of 2026-11-05: the page lists
// the tools VN One works with, so n8n, Go, Claude (and Supabase, React and TypeScript, already there) are in. "Automação
// de Fluxos" was a generic skill with no brand and no logo, so it is not a tool of the grid.
const EXPECTED = [
  {
    title: 'Automação & IA',
    description: 'Fluxos automáticos e agentes de IA.',
    tools: ['n8n', 'Make', 'Zapier', 'Claude', 'Python'],
  },
  {
    title: 'Desenvolvimento Frontend',
    description: 'Interfaces rápidas e com boa interação.',
    tools: ['React', 'TypeScript', 'Tailwind CSS', 'Vue 3'],
  },
  {
    title: 'Backend & Cloud',
    description: 'Serviços estáveis e infraestrutura para crescer com o uso.',
    tools: ['Node.js', 'Go (Golang)', 'Supabase', 'Docker', 'Google Cloud'],
  },
];

describe('toolCategories', () => {
  it('keeps the three categories, their descriptions and the tools, in this order', () => {
    expect(
      toolCategories.map((category) => ({
        title: category.title,
        description: category.description,
        tools: category.tools.map((tool) => tool.name),
      })),
    ).toEqual(EXPECTED);
  });

  it('has every tool once, with an id of its own', () => {
    const ids = toolCategories.flatMap((category) => category.tools.map((tool) => tool.id));

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(14);
  });

  it('has no dash, no " / " separator and no "chatbot" in any text', () => {
    const texts = toolCategories.flatMap((category) => [category.title, category.description, ...category.tools.map((tool) => tool.name)]);

    expect(texts.filter((text) => /[–—]| \/ |chat[\s-]?bot/i.test(text))).toEqual([]);
  });
});
