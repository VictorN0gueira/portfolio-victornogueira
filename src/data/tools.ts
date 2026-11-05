export type ToolId =
  | 'n8n'
  | 'make'
  | 'zapier'
  | 'claude'
  | 'python'
  | 'react'
  | 'typescript'
  | 'tailwind'
  | 'vue'
  | 'nodejs'
  | 'go'
  | 'supabase'
  | 'docker'
  | 'googlecloud';

interface Tool {
  id: ToolId;
  /** The name shown, and the accessible name of the tool. */
  name: string;
}

interface ToolCategory {
  title: string;
  description: string;
  tools: readonly Tool[];
}

/**
 * The tools VN One works with, by category. The categories and their lines are the ones the site already had; the
 * list of tools is the owner's (2026-11-05). The marks and brand colors are in src/sections/about/toolMarks.ts.
 */
export const toolCategories: readonly ToolCategory[] = [
  {
    title: 'Automação & IA',
    description: 'Fluxos automáticos e agentes de IA.',
    tools: [
      { id: 'n8n', name: 'n8n' },
      { id: 'make', name: 'Make' },
      { id: 'zapier', name: 'Zapier' },
      { id: 'claude', name: 'Claude' },
      { id: 'python', name: 'Python' },
    ],
  },
  {
    title: 'Desenvolvimento Frontend',
    description: 'Interfaces rápidas e com boa interação.',
    tools: [
      { id: 'react', name: 'React' },
      { id: 'typescript', name: 'TypeScript' },
      { id: 'tailwind', name: 'Tailwind CSS' },
      { id: 'vue', name: 'Vue 3' },
    ],
  },
  {
    title: 'Backend & Cloud',
    description: 'Serviços estáveis e infraestrutura para crescer com o uso.',
    tools: [
      { id: 'nodejs', name: 'Node.js' },
      { id: 'go', name: 'Go (Golang)' },
      { id: 'supabase', name: 'Supabase' },
      { id: 'docker', name: 'Docker' },
      { id: 'googlecloud', name: 'Google Cloud' },
    ],
  },
];
