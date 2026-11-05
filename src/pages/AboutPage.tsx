import { Suspense } from 'react';
import { m } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { SEO } from '../components/SEO';
import { About } from '../components/About';
import { SectionSkeleton } from '../components/ui/SectionSkeleton';
import { revealProps } from '../lib/reveal';
import { useScrollToHash } from '../hooks/useScrollToHash';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import MethodSteps from '../sections/home/MethodSteps';

// Only what sits below #metodo is lazy: this page is already a lazy route chunk, and a lazy section above the anchor
// would grow when its chunk arrived and push #metodo away from where the hash scroll put it.
const Skills = lazyWithRetry(() => import('../components/Skills'));

export default function AboutPage() {
  // A page that is opened with /sobre#metodo is not in the DOM yet when the browser looks for the anchor.
  useScrollToHash();

  return (
    <>
      <SEO path="/sobre" />
      <div className="pt-24 md:pt-28">
        <m.div {...revealProps}><About /></m.div>

        {/* It reveals its own header and cards, so it needs neither the lazy boundary nor the page reveal around it. */}
        <MethodSteps />

        <Suspense fallback={<SectionSkeleton />}>
          <m.div {...revealProps}><Skills /></m.div>
        </Suspense>

        {/* CTA final → /contato */}
        <m.section {...revealProps} className="py-24 px-6 md:px-12 bg-brand-white">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter font-display italic mb-6">
              Pronto para automatizar?
            </h2>
            <p className="text-vn-gray-dark text-lg font-light mb-10">
              Uma conversa de 30 minutos para mapear onde a automação mais ajuda no seu negócio.
            </p>
            <Link
              to="/contato"
              className="group inline-flex items-center gap-3 bg-black text-white dark:bg-white dark:text-black px-10 py-5 rounded-full font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-2xl shadow-black/20 active:scale-95"
            >
              Vamos conversar
              <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </div>
        </m.section>
      </div>
    </>
  );
}
