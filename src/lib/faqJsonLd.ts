import type { Faq } from '../data/faqs';

/** The FAQPage schema, built from the same list the accordion shows, so the page and its structured data never differ. */
export function buildFaqJsonLd(items: readonly Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}
