import { Suspense, lazy, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import Header from '../components/Header';
import SEO from '../components/SEO';
import { revealProps, SectionSkeleton } from '../lib/reveal';
import { useScrollToHash } from '../lib/useScrollToHash';
import { faqs } from '../data/faqs';

const ROICalculator = lazy(() => import('../components/ROICalculator'));
const Contact = lazy(() => import('../components/Contact'));
const FAQ = lazy(() => import('../components/FAQ'));
const Footer = lazy(() => import('../components/Footer'));
const Chatbot = lazy(() => import('../components/Chatbot'));

// FAQPage JSON-LD gerado da mesma fonte que o accordion — só nesta página
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: { '@type': 'Answer', text: faq.answer },
  })),
};

export default function ContactPage() {
  useScrollToHash();
  const [prefillMessage, setPrefillMessage] = useState<string | undefined>();
  const [valorEstimado, setValorEstimado] = useState<number | undefined>();

  const handleQuoteRequest = useCallback((message: string, savings: number) => {
    setPrefillMessage(message);
    setValorEstimado(savings);
    document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <>
      <SEO
        title="Contato"
        description="Fale sobre seu projeto: calcule o custo dos seus processos manuais e solicite uma consulta gratuita de 30 minutos."
        path="/contato"
        jsonLd={[faqJsonLd]}
      />
      <Header />
      <main id="main-content" className="pt-16 md:pt-20">
        <Suspense fallback={<SectionSkeleton />}>
          <motion.div {...revealProps}>
            <ROICalculator onQuoteRequest={handleQuoteRequest} />
          </motion.div>
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <motion.div {...revealProps}>
            <Contact prefillMessage={prefillMessage} valorEstimado={valorEstimado} />
          </motion.div>
        </Suspense>

        <Suspense fallback={null}>
          <motion.div {...revealProps}><FAQ /></motion.div>
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer />
        <Chatbot />
      </Suspense>
    </>
  );
}
