// @vitest-environment node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// The lead channel and the two legal pages are frozen: not one character changes without the owner's ok (items Q1 and Q2
// of plan 3). The hashes were measured on commit b439532 (the live site) from `git show b439532:<path>`, with the line
// ends normalized to \n, and they are the first 16 hexadecimal characters of the SHA-256. If a hash is changed on
// purpose (Victor approved the layout only edit of the legal pages, Task L5 of the plan), this table changes in that
// same commit, and nowhere else.

const ROOT = resolve(__dirname, '../..');
const HASH_LENGTH = 16;

const FROZEN_FILES: ReadonlyArray<readonly [path: string, hash: string]> = [
  ['src/lib/contact.ts', '7224769b2ca5959f'],
  ['src/lib/phone.ts', '15c48e7d4a563a7a'],
  ['src/components/contact/useContactForm.ts', '249f1613a2809e1c'],
  ['src/components/contact/ContactConsent.tsx', 'a56d78cab2dc0b7f'],
  ['src/components/contact/ContactErrorAlert.tsx', '65e6dd3d2be81df8'],
  ['src/components/contact/whatsappInput.ts', 'bbfe1b0be288632b'],
  ['src/components/contact/pastedNumber.ts', '7b121f203f9e9332'],
  ['src/components/ContactForm.tsx', '2baa7af3fbbf4445'],
  ['src/pages/PrivacyPage.tsx', 'd83e3625c5d67024'],
  ['src/pages/LgpdPage.tsx', '4f27f8c5b4959bca'],
];

/** The first 16 characters of the SHA-256 of the text, with Windows line ends read as Unix ones. */
function hashOf(text: string): string {
  return createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex').slice(0, HASH_LENGTH);
}

const hashOfFile = (path: string): string => hashOf(readFileSync(resolve(ROOT, path), 'utf8'));

describe('frozen files', () => {
  it.each(FROZEN_FILES)(
    '%s keeps the hash measured on the live site',
    (path, hash) => {
      expect(
        hashOfFile(path),
        `arquivo congelado: precisa do ok do Victor para mudar (ver Q1 e Q2 do plano 3): ${path}`,
      ).toBe(hash);
    },
  );

  it('guards the seven files of the lead channel, the form and the two legal pages', () => {
    expect(FROZEN_FILES.map(([path]) => path)).toEqual(
      expect.arrayContaining([
        'src/lib/contact.ts',
        'src/lib/phone.ts',
        'src/components/contact/useContactForm.ts',
        'src/components/contact/ContactConsent.tsx',
        'src/components/contact/ContactErrorAlert.tsx',
        'src/components/contact/whatsappInput.ts',
        'src/components/contact/pastedNumber.ts',
        'src/components/ContactForm.tsx',
        'src/pages/PrivacyPage.tsx',
        'src/pages/LgpdPage.tsx',
      ]),
    );
    expect(FROZEN_FILES).toHaveLength(10);
  });

  it('reads the hash as 16 lowercase hexadecimal characters', () => {
    for (const [, hash] of FROZEN_FILES) expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('tells a changed file from an untouched one, and ignores the kind of line end', () => {
    expect(hashOf('a\nb\n')).toBe(hashOf('a\r\nb\r\n'));
    expect(hashOf('a\nb\n')).not.toBe(hashOf('a\nb \n'));
    expect(hashOf('')).toHaveLength(HASH_LENGTH);
  });
});
