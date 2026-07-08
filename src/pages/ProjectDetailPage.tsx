import { Suspense, lazy } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import Header from '../components/Header';
import SEO from '../components/SEO';
import NotFound from '../components/NotFound';
import ProjectDetail from '../components/ProjectDetail';
import { getProjectBySlug } from '../data/projects';

const Footer = lazy(() => import('../components/Footer'));
const Chatbot = lazy(() => import('../components/Chatbot'));

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const project = slug ? getProjectBySlug(slug) : undefined;

  if (!project) {
    return (
      <>
        <SEO title="Projeto não encontrado" noindex />
        <NotFound />
      </>
    );
  }

  return (
    <>
      <SEO
        title={project.title}
        description={project.description}
        path={`/projetos/${project.slug}`}
        image={project.image}
      />
      <Header />
      <main id="main-content" className="pt-28 md:pt-36 pb-24 px-4 md:px-12 bg-brand-white min-h-screen">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Link
              to="/projetos"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-black dark:hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Todos os projetos
            </Link>
          </motion.div>

          <ProjectDetail project={project} />

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-16 text-center"
          >
            <p className="text-zinc-500 text-lg font-light mb-6">
              Quer um resultado assim no seu negócio?
            </p>
            <Link
              to="/contato"
              className="group inline-flex items-center gap-3 bg-black text-white dark:bg-white dark:text-black px-10 py-5 rounded-full font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-2xl shadow-black/20 active:scale-95"
            >
              Vamos conversar
              <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </main>

      <Suspense fallback={null}>
        <Footer />
        <Chatbot />
      </Suspense>
    </>
  );
}
