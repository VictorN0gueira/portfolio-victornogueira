import { Suspense } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { m } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { SEO } from '../components/SEO';
import { ProjectDetail } from '../components/ProjectDetail';
import { BACK_LABEL, BREADCRUMB_HOME, CONTACT_LABEL, NOT_FOUND_TITLE, PROJECT_CTA_TEXT, PROJECTS_TITLE } from '../components/projectLabels';
import { coverOf, getProjectBySlug, REMOVED_PROJECT_SLUGS, type Project } from '../data/projects';
import { shellCopy } from '../data/shellCopy';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { SITE } from '../lib/site';

// The same lazy chunk App.tsx uses for its 404: a project page that exists never downloads it.
const NotFound = lazyWithRetry(() => import('../components/NotFound'));

/**
 * Holds the place of the not found page while its chunk loads: that page is as tall as the screen on a dark background,
 * so the footer and the background do not jump when it arrives (the cream compact skeleton was about 250 px tall).
 */
function NotFoundFallback() {
  return (
    <div role="status" aria-label={shellCopy.pageLoading} className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div aria-hidden="true" className="size-10 rounded-full border-2 border-white/20 border-t-white/70 motion-safe:animate-spin" />
      <span className="sr-only">{shellCopy.pageLoading}</span>
    </div>
  );
}

const SHARE_IMAGE_WIDTH = 1200;
const SHARE_IMAGE_HEIGHT = 630;

function breadcrumbSchema(project: Project): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: BREADCRUMB_HOME, item: `${SITE.url}/` },
      { '@type': 'ListItem', position: 2, name: PROJECTS_TITLE, item: `${SITE.url}/projetos` },
      { '@type': 'ListItem', position: 3, name: project.title, item: `${SITE.url}/projetos/${project.slug}` },
    ],
  };
}

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const project = slug ? getProjectBySlug(slug) : undefined;

  // The old addresses of the projects that left the list go to the list, instead of a dead end.
  if (slug && REMOVED_PROJECT_SLUGS.includes(slug)) return <Navigate to="/projetos" replace />;

  if (!project) {
    return (
      <>
        <SEO title={NOT_FOUND_TITLE} noindex />
        <Suspense fallback={<NotFoundFallback />}>
          <NotFound />
        </Suspense>
      </>
    );
  }

  return (
    <>
      <SEO
        title={project.title}
        description={project.description}
        path={`/projetos/${project.slug}`}
        image={coverOf(project).shareUrl}
        imageAlt={project.shots[0].alt}
        imageWidth={SHARE_IMAGE_WIDTH}
        imageHeight={SHARE_IMAGE_HEIGHT}
        jsonLd={[breadcrumbSchema(project)]}
      />
      <div className="min-h-screen bg-brand-white px-3 pb-24 pt-28 min-[321px]:px-4 md:px-12 md:pt-36">
        <div className="mx-auto max-w-6xl">
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4"
          >
            <Link
              to="/projetos"
              className="group inline-flex min-h-11 items-center gap-2 py-3 pr-4 text-xs font-bold uppercase tracking-[0.2em] text-vn-gray-dark transition-colors hover:text-vn-ink"
            >
              <ArrowLeft className="size-4 motion-safe:transition-transform motion-safe:group-hover:-translate-x-1" aria-hidden="true" />
              {BACK_LABEL}
            </Link>
          </m.div>

          <ProjectDetail project={project} />

          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-16 text-center"
          >
            <p className="mb-6 pr-16 text-left text-lg text-vn-gray-dark xs:px-14 xs:text-center md:px-0">{PROJECT_CTA_TEXT}</p>
            <Link
              to="/contato"
              className="group inline-flex items-center gap-3 rounded-full bg-black px-10 py-5 font-medium text-white shadow-2xl shadow-black/20 transition-colors hover:bg-zinc-800 motion-safe:active:scale-95"
            >
              {CONTACT_LABEL}
              <ArrowRight className="size-5 motion-safe:transition-transform motion-safe:group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </m.div>
        </div>
      </div>
    </>
  );
}
