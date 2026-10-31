import { Suspense, lazy, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import SEO from '../components/SEO';
import { SectionSkeleton } from '../components/ui/SectionSkeleton';
import { revealProps } from '../lib/reveal';
import { useScrollToHash } from '../hooks/useScrollToHash';
import { faqs } from '../data/faqs';
import { buildFaqJsonLd } from '../lib/faqJsonLd';

const ROICalculator = lazy(() => import('../components/ROICalculator'));
const Contact = lazy(() => import('../components/Contact'));
const FAQ = lazy(() => import('../components/FAQ'));

// FAQPage JSON-LD gerado da mesma fonte que o accordion, só nesta página
const faqJsonLd = buildFaqJsonLd(faqs);

export default function ContactPage() {
  useScrollToHash();
  const [prefillMessage, setPrefillMessage] = useState<string | undefined>();

  const handleQuoteRequest = useCallback((message: string) => {
    setPrefillMessage(message);
    document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' });
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
          <motion.div {...revealProps}>
            <ROICalculator onQuoteRequest={handleQuoteRequest} />
          </motion.div>
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <motion.div {...revealProps}>
            <Contact prefillMessage={prefillMessage} />
          </motion.div>
        </Suspense>

        <Suspense fallback={null}>
          <motion.div {...revealProps}><FAQ /></motion.div>
        </Suspense>
      </div>
    </>
  );
}
