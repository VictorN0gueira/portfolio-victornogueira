import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { m } from 'motion/react';
import { SEO } from '../components/SEO';
import { SectionSkeleton } from '../components/ui/SectionSkeleton';
import { revealProps } from '../lib/reveal';
import { useScrollToHash } from '../hooks/useScrollToHash';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { scrollToIdWhenMounted } from '../lib/scrollToIdWhenMounted';
import { faqs } from '../data/faqs';
import { buildFaqJsonLd } from '../lib/faqJsonLd';

// lazyWithRetry, not React.lazy: a chunk that a deploy deleted is retried and then reaches the error boundary (see lazyWithRetry).
const ROICalculator = lazyWithRetry(() => import('../components/ROICalculator'));
const Contact = lazyWithRetry(() => import('../components/Contact'));
const FAQ = lazyWithRetry(() => import('../components/FAQ'));

// FAQPage JSON-LD gerado da mesma fonte que o accordion, só nesta página
const faqJsonLd = buildFaqJsonLd(faqs);

function findMessageField(section: HTMLElement): HTMLElement | null {
  return section.querySelector<HTMLElement>('textarea');
}

interface PrefillRequest {
  message: string;
  /** Counts the requests: a second click with the same figures still restores the quote in an edited message. */
  nonce: number;
}

export default function ContactPage() {
  useScrollToHash();
  const [prefill, setPrefill] = useState<PrefillRequest | undefined>();

  // The form is in a lazy section: the scroll may wait for it, so it is cancelled when the page goes or a new request starts.
  const cancelScroll = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => cancelScroll.current?.(), []);

  const handleQuoteRequest = useCallback((message: string) => {
    setPrefill((previous) => ({ message, nonce: (previous?.nonce ?? 0) + 1 }));
    // No behavior given, so the page decides: smooth only when neither the system nor the widget asked for less motion.
    // Focus goes to the message, the field the quote fills in, so the next Tab continues from the form.
    cancelScroll.current?.();
    cancelScroll.current = scrollToIdWhenMounted('contato', { focus: findMessageField });
  }, []);

  return (
    <>
      <SEO
        title="Contato"
        description="Fala sobre o seu projeto: calcula o custo dos seus processos manuais e pede uma consulta gratuita de 30 minutos."
        path="/contato"
        jsonLd={[faqJsonLd]}
      />
      <div className="pt-16 md:pt-20">
        <Suspense fallback={<SectionSkeleton />}>
          <m.div {...revealProps}>
            <ROICalculator onQuoteRequest={handleQuoteRequest} />
          </m.div>
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <m.div {...revealProps}>
            <Contact prefillMessage={prefill?.message} prefillNonce={prefill?.nonce} />
          </m.div>
        </Suspense>

        <Suspense fallback={null}>
          <m.div {...revealProps}><FAQ /></m.div>
        </Suspense>
      </div>
    </>
  );
}
