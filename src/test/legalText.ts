import { createHash } from 'node:crypto';

// What the two legal pages say, as two hashes each. PrivacyPage and LgpdPage are frozen (not one character of their files
// changes: the owner declined to have their layout edited, item Q1 of plan 3), and the frame the routes put around them
// must not change what a visitor reads. Both pairs were measured on the pages alone, with no frame around them, and the
// same values have to come out of the body of the frame (src/pages/legal/LegalFrame.test.tsx) and of the routes
// (legalRoutes.test.tsx). A hash only changes if a word, a link or a title did.
//
// The text hash covers the visible words. The structure hash covers what the words do not: where each link goes, the
// names a screen reader reads from attributes, and the outline of the titles.

/** SHA-256 (hexadecimal) of the visible text of PrivacyPage, white space collapsed. */
export const PRIVACY_TEXT_HASH = '5df0a5bccb2671f08f725332c354a39ec6925a04355816e944907c4ecaf4a9d4';
/** SHA-256 (hexadecimal) of the visible text of LgpdPage, white space collapsed. */
export const LGPD_TEXT_HASH = '15761667d1a69131da3331817fbbb6320d0b95f2726e98da8e2614b8dade89cb';
/** SHA-256 (hexadecimal) of structureOf(PrivacyPage): link targets, labels, alternative texts, titles and the outline. */
export const PRIVACY_STRUCTURE_HASH = '134d1d968756b6615e50f3e7daa93e68e3098aaba9155d58982a406eed0bb28f';
/** SHA-256 (hexadecimal) of structureOf(LgpdPage): link targets, labels, alternative texts, titles and the outline. */
export const LGPD_STRUCTURE_HASH = 'e7f4585264251526106d807cff877c16caed1b9517adcadd3f4a119cd42011b9';
/** SHA-256 (hexadecimal) of attributesOf(PrivacyPage). That page has none of them, so this is the hash of the empty text: it pins that it stays so. */
export const PRIVACY_ATTRIBUTES_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
/** SHA-256 (hexadecimal) of attributesOf(LgpdPage): the attributes that change how a link or a landmark behaves or is read. */
export const LGPD_ATTRIBUTES_HASH = 'd43026845caa238ce6f5d1ef5bc61c0dcea6d3071e1f3d3a917b9e3dab6eeadb';

const WHITE_SPACE = /\s+/g;
const HEADING = /^H[1-6]$/;
// The attributes a person reads or follows without seeing the markup, in the order they are written down for each element.
const READ_ATTRIBUTES = ['aria-label', 'alt', 'title'] as const;

const collapse = (text: string | null): string => (text ?? '').replace(WHITE_SPACE, ' ').trim();

/** What a visitor reads in the element: the text without scripts and styles, white space collapsed to single spaces. */
export function visibleText(element: Element): string {
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('script, style').forEach((node) => node.remove());
  return collapse(copy.textContent);
}

/**
 * What the words of a page do not say, in document order, one line each: where every link goes (the value of its href as
 * written), the aria-label, alt and title of any element, and the outline of the titles (the tag and its text). Ids and
 * tabindex are left out on purpose: the frame adds them to the titles, from the outside.
 */
export function structureOf(element: Element): string {
  const lines: string[] = [];
  for (const node of element.querySelectorAll('*')) {
    if (HEADING.test(node.tagName)) lines.push(`${node.tagName.toLowerCase()}: ${collapse(node.textContent)}`);
    if (node.tagName === 'A' && node.hasAttribute('href')) lines.push(`href: ${node.getAttribute('href')}`);
    for (const name of READ_ATTRIBUTES) {
      if (node.hasAttribute(name)) lines.push(`${name}: ${node.getAttribute(name)}`);
    }
  }
  return lines.join('\n');
}

// The attributes that decide where a link opens and what it is allowed to do, what a screen reader announces or skips, and
// the language of a passage. structureOf does not cover them, and the frame adds none of them.
const BEHAVIOR_ATTRIBUTES = ['target', 'rel', 'role', 'aria-hidden', 'aria-labelledby', 'hidden', 'lang'] as const;

/**
 * Where a link opens and with which rel, the role, aria-hidden, aria-labelledby, hidden and lang of every element, in
 * document order, one line each: the part of the markup a change of layout must not touch and the words do not show.
 */
export function attributesOf(element: Element): string {
  const lines: string[] = [];
  for (const node of element.querySelectorAll('*')) {
    for (const name of BEHAVIOR_ATTRIBUTES) {
      if (node.hasAttribute(name)) lines.push(`${node.tagName.toLowerCase()}[${name}]: ${node.getAttribute(name)}`);
    }
  }
  return lines.join('\n');
}

export function hashOfText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
