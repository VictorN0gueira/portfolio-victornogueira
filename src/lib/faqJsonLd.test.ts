import { describe, expect, it } from 'vitest';
import { faqs } from '../data/faqs';
import { buildFaqJsonLd } from './faqJsonLd';

describe('buildFaqJsonLd', () => {
  it('is a FAQPage with one Question and one Answer per faq, in order', () => {
    const schema = buildFaqJsonLd(faqs);

    expect(schema['@context']).toBe('https://schema.org');
    expect(schema['@type']).toBe('FAQPage');
    expect(schema.mainEntity).toHaveLength(faqs.length);
    expect(schema.mainEntity.map((entry) => entry.name)).toEqual(faqs.map((faq) => faq.question));
    expect(schema.mainEntity.map((entry) => entry.acceptedAnswer.text)).toEqual(faqs.map((faq) => faq.answer));
    expect(schema.mainEntity.every((entry) => entry['@type'] === 'Question' && entry.acceptedAnswer['@type'] === 'Answer')).toBe(true);
  });

  it('is an empty list for no faqs', () => {
    expect(buildFaqJsonLd([]).mainEntity).toEqual([]);
  });
});
