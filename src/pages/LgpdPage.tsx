import { Suspense, lazy, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Eye, PencilLine, Trash2, Ban, Download, ScrollText,
  Scale, Lock, Clock, Mail, ArrowUpRight,
} from 'lucide-react';
import Header from '../components/Header';
import SEO from '../components/SEO';

const Footer = lazy(() => import('../components/Footer'));

const EFFECTIVE_DATE = '8 de julho de 2026';
const DPO_EMAIL = 'contato@vnone.com.br';

const rights = [
  { icon: Eye, title: 'Acesso', desc: 'Confirmar se tratamos seus dados e obter uma cópia deles.' },
  { icon: PencilLine, title: 'Correção', desc: 'Corrigir dados incompletos, inexatos ou desatualizados.' },
  { icon: Trash2, title: 'Eliminação', desc: 'Solicitar a exclusão dos dados tratados com base no consentimento.' },
  { icon: Ban, title: 'Revogação', desc: 'Retirar o consentimento a qualquer momento, de forma gratuita.' },
  { icon: Download, title: 'Portabilidade', desc: 'Receber seus dados em formato estruturado e interoperável.' },
  { icon: ScrollText, title: 'Informação', desc: 'Saber com quem compartilhamos seus dados e por quê.' },
];

const bases = [
  {
    icon: Scale,
    title: 'Consentimento — Art. 7º, I',
    desc: 'Você marca a caixa de aceite no formulário autorizando o uso dos seus dados para que eu retorne o contato.',
  },
  {
    icon: ShieldCheck,
    title: 'Legítimo interesse — Art. 7º, IX',
    desc: 'Uso de um identificador anônimo do seu IP apenas para prevenir spam e abuso do formulário.',
  },
];

const gridContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const gridItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export default function LgpdPage() {
  const rightsRef = useRef(null);
  const rightsInView = useInView(rightsRef, { once: true, margin: '-80px' });
  const basesRef = useRef(null);
  const basesInView = useInView(basesRef, { once: true, margin: '-80px' });

  return (
    <>
      <SEO
        title="LGPD"
        description="Como o site vnone.com.br trata seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018)."
        path="/lgpd"
      />
      <Header />
      <main id="main-content" className="bg-brand-white min-h-screen">
        {/* Hero */}
        <section className="pt-32 md:pt-44 pb-16 px-6 md:px-12 relative overflow-hidden">
          <div className="absolute top-20 -right-32 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="max-w-4xl mx-auto relative z-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 mb-8">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">
                Lei nº 13.709/2018
              </span>
            </div>
            <h1 className="text-5xl md:text-8xl font-bold tracking-tighter font-display italic leading-none mb-6">
              LGPD
            </h1>
            <p className="text-zinc-500 text-lg md:text-xl font-light max-w-2xl leading-relaxed">
              Seus dados são seus. Aqui você entende, de forma clara, o que coletamos, por que coletamos e como
              exercer cada um dos seus direitos como titular.
            </p>
            <p className="text-zinc-400 text-sm mt-8">Vigente desde {EFFECTIVE_DATE}</p>
          </motion.div>
        </section>

        {/* Controlador */}
        <section className="py-12 px-6 md:px-12">
          <div className="max-w-4xl mx-auto">
            <div className="bg-zinc-950 rounded-3xl p-8 md:p-12 relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/[0.02] rounded-full blur-[60px] pointer-events-none" />
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500 mb-4 relative z-10">
                Controlador dos dados
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-white font-display mb-3 relative z-10">
                Victor Nogueira
              </h2>
              <p className="text-zinc-400 font-light leading-relaxed max-w-xl relative z-10">
                Responsável pelas decisões sobre o tratamento dos dados pessoais coletados neste site. Para qualquer
                questão relacionada à proteção de dados, fale por{' '}
                <a href={`mailto:${DPO_EMAIL}`} className="text-emerald-400 underline hover:text-emerald-300 transition-colors">
                  {DPO_EMAIL}
                </a>.
              </p>
            </div>
          </div>
        </section>

        {/* Bases legais */}
        <section className="py-12 px-6 md:px-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight font-display italic mb-10">
              Bases legais
            </h2>
            <motion.div
              ref={basesRef}
              variants={gridContainer}
              initial="hidden"
              animate={basesInView ? 'show' : 'hidden'}
              className="grid md:grid-cols-2 gap-4 md:gap-5"
            >
              {bases.map((base) => (
                <motion.div
                  key={base.title}
                  variants={gridItem}
                  className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-3xl p-7"
                >
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5">
                    <base.icon className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="font-bold text-zinc-900 dark:text-white mb-2">{base.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{base.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Dados tratados + segurança/retenção */}
        <section className="py-12 px-6 md:px-12">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-4 md:gap-5">
            <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-3xl p-7 md:p-8">
              <h3 className="text-lg font-bold font-display mb-5">Dados que tratamos</h3>
              <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex gap-3"><span className="text-emerald-500">•</span> Nome informado no formulário</li>
                <li className="flex gap-3"><span className="text-emerald-500">•</span> E-mail ou WhatsApp (conforme sua escolha)</li>
                <li className="flex gap-3"><span className="text-emerald-500">•</span> Serviço de interesse selecionado</li>
                <li className="flex gap-3"><span className="text-emerald-500">•</span> Mensagem enviada</li>
                <li className="flex gap-3"><span className="text-emerald-500">•</span> Hash anônimo do IP + navegador (antispam)</li>
              </ul>
            </div>
            <div className="flex flex-col gap-4 md:gap-5">
              <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-3xl p-7 flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white mb-1">Segurança</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Armazenamento em infraestrutura gerenciada, com acesso restrito. O IP nunca é guardado em texto claro.
                  </p>
                </div>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-3xl p-7 flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white mb-1">Retenção</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Mantidos por até 12 meses após o último contato, salvo obrigação legal ou relação em andamento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Seus direitos */}
        <section className="py-16 px-6 md:px-12">
          <div className="max-w-5xl mx-auto">
            <div className="mb-10">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-4">Art. 18 da LGPD</p>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tighter font-display italic">
                Seus direitos
              </h2>
            </div>
            <motion.div
              ref={rightsRef}
              variants={gridContainer}
              initial="hidden"
              animate={rightsInView ? 'show' : 'hidden'}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5"
            >
              {rights.map((right) => (
                <motion.div
                  key={right.title}
                  variants={gridItem}
                  className="group bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-3xl p-7 hover:border-emerald-500/40 transition-colors duration-300"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                    <right.icon className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="font-bold text-zinc-900 dark:text-white mb-2">{right.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{right.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA — exercer direitos */}
        <section className="py-20 px-6 md:px-12">
          <div className="max-w-4xl mx-auto bg-zinc-950 rounded-[2.5rem] p-10 md:p-16 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 relative z-10">
              <Mail className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-white font-display italic mb-4 relative z-10">
              Quer exercer um direito?
            </h2>
            <p className="text-zinc-400 font-light mb-8 max-w-md mx-auto relative z-10">
              Envie um e-mail e respondo em até 15 dias. Sem burocracia, sem custo.
            </p>
            <a
              href={`mailto:${DPO_EMAIL}?subject=Solicita%C3%A7%C3%A3o%20LGPD`}
              className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-bold text-sm hover:bg-zinc-200 transition-all active:scale-95 relative z-10"
            >
              {DPO_EMAIL}
              <ArrowUpRight className="w-4 h-4" />
            </a>
            <p className="text-zinc-600 text-xs mt-8 relative z-10">
              Veja também a{' '}
              <Link to="/privacidade" className="underline hover:text-zinc-400 transition-colors">
                Política de Privacidade
              </Link>{' '}
              completa.
            </p>
          </div>
        </section>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </>
  );
}
