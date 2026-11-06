import { describe, expect, it } from 'vitest';
import LgpdPage from '../LgpdPage';
import PrivacyPage from '../PrivacyPage';
import { renderWithProviders } from '../../test/render';
import {
  LGPD_ATTRIBUTES_HASH,
  LGPD_STRUCTURE_HASH,
  LGPD_TEXT_HASH,
  PRIVACY_ATTRIBUTES_HASH,
  PRIVACY_STRUCTURE_HASH,
  PRIVACY_TEXT_HASH,
  attributesOf,
  hashOfText,
  structureOf,
  visibleText,
} from '../../test/legalText';

// Characterization of the legal pages: they are rendered alone, with no frame, and the hashes of what they say (the text,
// and the links, labels and titles) are pinned. They were measured on the pages as they are in the repository, which are
// byte identical to the frozen ones, so these tests are green by design (see src/test/legalText.ts).

describe('the legal text, without the frame', () => {
  it('PrivacyPage says what it said when the hash was measured', () => {
    const { container } = renderWithProviders(<PrivacyPage />);

    expect(hashOfText(visibleText(container))).toBe(PRIVACY_TEXT_HASH);
  });

  it('LgpdPage says what it said when the hash was measured', () => {
    const { container } = renderWithProviders(<LgpdPage />);

    expect(hashOfText(visibleText(container))).toBe(LGPD_TEXT_HASH);
  });

  it('PrivacyPage keeps its links, labels and outline', () => {
    const { container } = renderWithProviders(<PrivacyPage />);

    expect(hashOfText(structureOf(container))).toBe(PRIVACY_STRUCTURE_HASH);
  });

  it('LgpdPage keeps its links, labels and outline', () => {
    const { container } = renderWithProviders(<LgpdPage />);

    expect(hashOfText(structureOf(container))).toBe(LGPD_STRUCTURE_HASH);
  });

  it('PrivacyPage keeps the behavior attributes of its elements', () => {
    const { container } = renderWithProviders(<PrivacyPage />);

    expect(hashOfText(attributesOf(container))).toBe(PRIVACY_ATTRIBUTES_HASH);
  });

  it('LgpdPage keeps the behavior attributes of its elements', () => {
    const { container } = renderWithProviders(<LgpdPage />);

    expect(hashOfText(attributesOf(container))).toBe(LGPD_ATTRIBUTES_HASH);
  });

  it('reads real attributes, not an empty list: a link to the other page and the hidden icons are in it', () => {
    const { container } = renderWithProviders(<LgpdPage />);

    expect(attributesOf(container)).toMatch(/aria-hidden|target|rel|role|hidden|lang/);
  });

  it('reads the real structure, not an empty one: the links and the titles are in it', () => {
    const { container } = renderWithProviders(<LgpdPage />);

    expect(structureOf(container)).toContain('href: mailto:contato@vnone.com.br');
    expect(structureOf(container)).toContain('href: /privacidade');
    expect(structureOf(container)).toContain('h1: LGPD');
  });

  it('reads the real text, not an empty page', () => {
    const { container } = renderWithProviders(<PrivacyPage />);

    expect(visibleText(container)).toContain('Quem é o controlador');
    expect(visibleText(container).length).toBeGreaterThan(1500);
  });
});
