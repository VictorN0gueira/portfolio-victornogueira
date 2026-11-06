import { describe, expect, it } from 'vitest';
import LgpdPage from '../LgpdPage';
import PrivacyPage from '../PrivacyPage';
import { renderWithProviders } from '../../test/render';
import { LGPD_TEXT_HASH, PRIVACY_TEXT_HASH, hashOfText, visibleText } from '../../test/legalText';

// Characterization of the legal text: the two pages are rendered alone, with no frame, and the hash of what they say is
// pinned. It was measured before the frame existed, so this test is born green on purpose (see src/test/legalText.ts).

describe('the legal text, without the frame', () => {
  it('PrivacyPage says what it said when the hash was measured', () => {
    const { container } = renderWithProviders(<PrivacyPage />);

    expect(hashOfText(visibleText(container))).toBe(PRIVACY_TEXT_HASH);
  });

  it('LgpdPage says what it said when the hash was measured', () => {
    const { container } = renderWithProviders(<LgpdPage />);

    expect(hashOfText(visibleText(container))).toBe(LGPD_TEXT_HASH);
  });

  it('reads the real text, not an empty page', () => {
    const { container } = renderWithProviders(<PrivacyPage />);

    expect(visibleText(container)).toContain('Quem é o controlador');
    expect(visibleText(container).length).toBeGreaterThan(1500);
  });
});
