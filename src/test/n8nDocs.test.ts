// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');
const DOC_PATH = 'docs/n8n/lead-supabase-insert.md';

function readDoc() {
  return readFileSync(resolve(ROOT, DOC_PATH), 'utf8');
}

/** Extract all ```json blocks from the markdown. */
function extractJsonBlocks(md: string): string[] {
  const blocks: string[] = [];
  const re = /```json\s*([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    blocks.push(m[1].trim());
  }
  return blocks;
}

/** All JSON-shape strings embedded in a text (quoted values 32+ characters that look random). */
function suspiciousStrings(text: string): string[] {
  const found: string[] = [];
  // JWT-shaped tokens
  const jwtRe = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g;
  for (const m of text.matchAll(jwtRe)) {
    found.push(m[0]);
  }
  // 32+ char strings that look like secrets (hex, base64, etc.) but are not expressions (no $ or .)
  const secretRe = /"([A-Za-z0-9+/=_-]{32,})"/g;
  for (const m of text.matchAll(secretRe)) {
    const val = m[1];
    // Skip n8n expression strings ($json.xxx) and known safe IDs
    if (!val.includes('$') && !val.includes('.') && !val.startsWith('n8n-')) {
      found.push(val);
    }
  }
  return found;
}

/** All keys used in the `value` mapping of a node config. */
function mappedKeys(nodeJson: object): string[] {
  const p = (nodeJson as Record<string, unknown>)['parameters'];
  if (typeof p !== 'object' || p === null) return [];
  const cols = (p as Record<string, unknown>)['columns'];
  if (typeof cols !== 'object' || cols === null) return [];
  const val = (cols as Record<string, unknown>)['value'];
  if (typeof val !== 'object' || val === null) return [];
  return Object.keys(val);
}

const FORM_FIELDS = new Set(['nome', 'email', 'whatsapp', 'servico', 'mensagem', 'timestamp']);
const TABLE_COLS = new Set(['protocolo', 'canal', 'nome', 'email', 'whatsapp', 'servico', 'mensagem', 'enviado_em']);

describe('docs/n8n/lead-supabase-insert.md', () => {
  it('the doc file exists and is non-empty', () => {
    const content = readDoc();
    expect(content.length).toBeGreaterThan(100);
  });

  it('contains at least two JSON node blocks', () => {
    const blocks = extractJsonBlocks(readDoc());
    expect(blocks.length).toBeGreaterThanOrEqual(2);
  });

  it('every JSON block parses without error', () => {
    const blocks = extractJsonBlocks(readDoc());
    for (const block of blocks) {
      expect(() => JSON.parse(block), `invalid JSON in block: ${block.slice(0, 60)}`).not.toThrow();
    }
  });

  it('every node has onError: continueRegularOutput', () => {
    const blocks = extractJsonBlocks(readDoc());
    for (const block of blocks) {
      const node = JSON.parse(block) as Record<string, unknown>;
      const params = node['parameters'] as Record<string, unknown> | undefined;
      expect(params?.['onError'], `node "${node['name']}" missing continueRegularOutput`).toBe('continueRegularOutput');
    }
  });

  it('every node targets the leads table in the public schema', () => {
    const blocks = extractJsonBlocks(readDoc());
    for (const block of blocks) {
      const node = JSON.parse(block) as Record<string, unknown>;
      const params = node['parameters'] as Record<string, unknown> | undefined;
      expect(params?.['table']).toBe('leads');
      expect(params?.['schema']).toBe('public');
      expect(params?.['operation']).toBe('insert');
    }
  });

  it('no node has a returnFields that would trigger RETURNING', () => {
    const blocks = extractJsonBlocks(readDoc());
    for (const block of blocks) {
      const node = JSON.parse(block) as Record<string, unknown>;
      const params = node['parameters'] as Record<string, unknown> | undefined;
      const returnFields = params?.['returnFields'];
      expect([undefined, '', null]).toContain(returnFields);
    }
  });

  it('every column mapped comes from the form payload or is a fixed value', () => {
    const blocks = extractJsonBlocks(readDoc());
    for (const block of blocks) {
      const node = JSON.parse(block) as Record<string, unknown>;
      const keys = mappedKeys(node);
      for (const key of keys) {
        expect(TABLE_COLS.has(key), `unexpected column "${key}" in node "${node['name']}"`).toBe(true);
      }
      // All mapped expressions that reference $json must reference only form fields
      const params = node['parameters'] as Record<string, unknown> | undefined;
      const cols = params?.['columns'] as Record<string, unknown> | undefined;
      const value = cols?.['value'] as Record<string, unknown> | undefined;
      if (!value) continue;
      for (const [col, expr] of Object.entries(value)) {
        if (typeof expr !== 'string') continue;
        const matches = [...expr.matchAll(/\$json\.body\.(\w+)/g)].map((m) => m[1]);
        for (const field of matches) {
          expect(FORM_FIELDS.has(field), `column "${col}" references unknown form field "${field}"`).toBe(true);
        }
      }
    }
  });

  it('the doc contains no JWT or secret-like strings', () => {
    const content = readDoc();
    const suspicious = suspiciousStrings(content);
    expect(suspicious).toHaveLength(0);
  });

  it('the credential name appears in every node config', () => {
    const blocks = extractJsonBlocks(readDoc());
    for (const block of blocks) {
      expect(block).toContain('Postgres - VN One leads (n8n_leads)');
    }
  });
});
