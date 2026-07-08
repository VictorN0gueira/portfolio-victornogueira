import { Suspense, lazy, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check } from 'lucide-react';
import Header from '../components/Header';
import SEO from '../components/SEO';
import { services, combos } from '../data/services';

const Footer = lazy(() => import('../components/Footer'));
const Chatbot = lazy(() => import('../components/Chatbot'));

const gridContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const gridItem = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

export default function ServicesPage() {
  const gridRef = useRef(null);
  const gridInView = useInView(gridRef, { once: true, margin: '-80px' });
  const combosRef = useRef(null);
  const combosInView = useInView(combosRef, { once: true, margin: '-80px' });

  return (
    <>
      <SEO
        title="Serviços"
        description="Automação de processos, agentes de IA e desenvolvimento web — escopo claro, prazo definido e preço transparente."
        path="/servicos"
      />
      <Header />
      <main id="main-content" className="pt-32 md:pt-40 bg-brand-white">
        {/* Cabeçalho da página */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-7xl mx-auto px-6 md:px-12 mb-16 md:mb-20"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-5">
            O que eu entrego
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter font-display italic leading-none mb-5">
            Serviços
          </h1>
          <p className="text-zinc-500 text-base md:text-lg font-light max-w-xl">
            Escopo claro, prazo definido e preço transparente — do primeiro fluxo automatizado ao sistema completo.
          </p>
        </motion.div>

        {/* Grid de serviços */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 pb-8">
          <motion.div
            ref={gridRef}
            variants={gridContainer}
            initial="hidden"
            animate={gridInView ? 'show' : 'hidden'}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5"
          >
            {services.map((service) => (
              <motion.div
                key={service.nome}
                variants={gridItem}
                className="group bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-3xl p-7 md:p-8 flex flex-col hover:border-zinc-300 dark:hover:border-zinc-500 transition-colors duration-300"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400 mb-4">
                  {service.categoria}
                </p>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-3 font-display">
                  {service.nome}
                </h2>
                <p className="text-sm text-zinc-500 leading-relaxed mb-6">
                  {service.descricao}
                </p>

                <ul className="space-y-2.5 mb-8">
                  {service.inclui.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-6 border-t border-zinc-200 dark:border-zinc-700 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Investimento</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">{service.preco}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Prazo</p>
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">{service.prazo}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Combos */}
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24">
          <motion.div
            ref={combosRef}
            variants={gridContainer}
            initial="hidden"
            animate={combosInView ? 'show' : 'hidden'}
          >
            <motion.div variants={gridItem} className="mb-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-4">
                Pacotes com desconto
              </p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tighter font-display italic">
                Combos
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-4 md:gap-5">
              {combos.map((combo) => (
                <motion.div
                  key={combo.nome}
                  variants={gridItem}
                  className="bg-zinc-950 rounded-3xl p-7 md:p-8 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none" />
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 relative z-10">
                    {combo.desconto}
                  </p>
                  <h3 className="text-xl font-bold text-white mb-2 font-display relative z-10">{combo.nome}</h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4 relative z-10">{combo.composicao}</p>
                  <p className="text-sm text-zinc-400 leading-relaxed relative z-10">{combo.descricao}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* CTA final */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8 }}
          className="py-24 px-6 md:px-12"
        >
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter font-display italic mb-6">
              Não sabe por onde começar?
            </h2>
            <p className="text-zinc-500 text-lg font-light mb-10">
              Na consulta gratuita eu identifico qual serviço resolve o seu gargalo — sem compromisso.
            </p>
            <Link
              to="/contato"
              className="group inline-flex items-center gap-3 bg-black text-white dark:bg-white dark:text-black px-10 py-5 rounded-full font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-2xl shadow-black/20 active:scale-95"
            >
              Agendar consulta gratuita
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
