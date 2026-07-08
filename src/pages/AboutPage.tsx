import { Suspense, lazy } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import Header from '../components/Header';
import SEO from '../components/SEO';
import { revealProps, SectionSkeleton } from '../lib/reveal';

const About = lazy(() => import('../components/About'));
const Process = lazy(() => import('../components/Process'));
const Skills = lazy(() => import('../components/Skills'));
const Footer = lazy(() => import('../components/Footer'));
const Chatbot = lazy(() => import('../components/Chatbot'));

export default function AboutPage() {
  return (
    <>
      <SEO
        title="Sobre"
        description="Quem é Victor Nogueira, como trabalho e a stack que uso para transformar processos manuais em fluxos automatizados e inteligentes."
        path="/sobre"
      />
      <Header />
      <main id="main-content" className="pt-24 md:pt-28">
        <Suspense fallback={<SectionSkeleton />}>
          <motion.div {...revealProps}><About /></motion.div>
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <motion.div {...revealProps}><Process /></motion.div>
        </Suspense>

        <Suspense fallback={<SectionSkeleton />}>
          <motion.div {...revealProps}><Skills /></motion.div>
        </Suspense>

        {/* CTA final → /contato */}
        <motion.section {...revealProps} className="py-24 px-6 md:px-12 bg-brand-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter font-display italic mb-6">
              Pronto para automatizar?
            </h2>
            <p className="text-zinc-500 text-lg font-light mb-10">
              Uma conversa de 30 minutos para mapear onde a automação gera mais valor no seu negócio.
            </p>
            <Link
              to="/contato"
              className="group inline-flex items-center gap-3 bg-black text-white dark:bg-white dark:text-black px-10 py-5 rounded-full font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-2xl shadow-black/20 active:scale-95"
            >
              Vamos conversar
              <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </div>
        </motion.section>
      </main>

      <Suspense fallback={null}>
        <Footer />
        <Chatbot />
      </Suspense>
    </>
  );
}
