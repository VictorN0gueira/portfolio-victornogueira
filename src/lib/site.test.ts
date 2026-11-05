import { describe, expect, it } from 'vitest';
import { SITE, pageTitle } from './site';

const DASH_PATTERN = /[\u2014\u2013]/;
const MAX_DESCRIPTION_LENGTH = 160;

describe('pageTitle', () => {
  it('returns the default site title when no page title is given', () => {
    expect(pageTitle()).toBe('VN One | Automação de processos e agentes de IA sob medida');
  });

  it('suffixes the page title with the brand name', () => {
    expect(pageTitle('Serviços')).toBe('Serviços | VN One');
  });
});

describe('SITE', () => {
  it('keeps the home title inside the 50 to 60 character range, in the pattern "VN One | <proposal>"', () => {
    expect(SITE.title.startsWith('VN One | ')).toBe(true);
    expect(SITE.title.length).toBeGreaterThanOrEqual(50);
    expect(SITE.title.length).toBeLessThanOrEqual(60);
  });

  it('keeps the description within the 160 character snippet limit', () => {
    expect(SITE.description.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
  });

  it('has no em or en dash in any value', () => {
    for (const value of Object.values(SITE)) {
      expect(value).not.toMatch(DASH_PATTERN);
    }
  });

  it('uses absolute https URLs for crawlers', () => {
    expect(SITE.url).toBe('https://vnone.com.br');
    expect(SITE.ogImage).toBe('https://vnone.com.br/og-banner.png?v=3');
  });
});
