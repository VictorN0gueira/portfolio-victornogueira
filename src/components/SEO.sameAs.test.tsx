import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SEO from './SEO';

// A profile link that is missing (an empty href) must never reach the structured data as "": schema.org readers treat an
// empty sameAs entry as an invalid URL.
vi.mock('../lib/constants', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/constants')>()),
  SOCIAL_LINKS: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/someone' },
    { label: 'GitHub', href: '' },
    { label: 'Instagram', href: '' },
  ],
}));

function organization(): Record<string, unknown> | undefined {
  const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
  return scripts.map((node) => JSON.parse(node.textContent ?? '{}') as Record<string, unknown>).find((schema) => schema['@type'] === 'Organization');
}

describe('SEO sameAs with a missing profile link', () => {
  it('drops the empty entries of the founder and leaves the Organization without a sameAs list', () => {
    render(<SEO />);

    const schema = organization();
    const founder = schema?.founder as { sameAs: string[] };

    expect(founder.sameAs).toEqual(['https://www.linkedin.com/in/someone']);
    expect(schema).not.toHaveProperty('sameAs');
    expect(document.head.innerHTML).not.toContain('""');
  });
});
