import { Suspense } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SEO } from '../components/SEO';
import { NotFoundFallback } from '../components/layout/NotFoundFallback';
import { ProjectDetail } from '../components/ProjectDetail';
import { BACK_LABEL, CONTACT_LABEL, NOT_FOUND_TITLE } from '../components/projectLabels';
import { Container } from '../components/ui/Container';
import { Section } from '../components/ui/Section';
import { getProjectBySlug, REMOVED_PROJECT_SLUGS } from '../data/projects';
import { projectsCopy } from '../data/projectsCopy';
import { lazyWithRetry } from '../lib/lazyWithRetry';
import { CtaBand } from '../sections/shared/CtaBand';
import { PageHero } from '../sections/shared/PageHero';
import { NextProject } from '../sections/projects/NextProject';
import { nextProjectOf } from '../sections/projects/nextProjectOf';
import { projectMetaFor } from '../seo/projectMeta';

// The same lazy chunk App.tsx uses for its 404: a project page that exists never downloads it.
const NotFound = lazyWithRetry(() => import('../components/NotFound'));

const PROJECTS_PATH = '/projetos';
const CONTACT_PATH = '/contato';
const BACK_LINK_CLASSES =
  'group mt-8 inline-flex min-h-11 items-center gap-2 pr-4 text-sm font-medium text-vn-ink vn-focus-ring-ink';

export default function ProjectDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const project = slug ? getProjectBySlug(slug) : undefined;

  // The old addresses of the projects that left the list go to the list, instead of a dead end.
  if (slug && REMOVED_PROJECT_SLUGS.includes(slug)) return <Navigate to={PROJECTS_PATH} replace />;

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
      <SEO path={`${PROJECTS_PATH}/${project.slug}`} meta={projectMetaFor(project.slug)} />
      <PageHero kicker={project.category} title={project.title} lead={project.description}>
        <Link to={PROJECTS_PATH} className={BACK_LINK_CLASSES}>
          <ArrowLeft
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform duration-300 ease-out motion-reduce:transition-none motion-safe:group-hover:-translate-x-1"
          />
          {BACK_LABEL}
        </Link>
      </PageHero>
      <Section tone="white">
        <Container>
          <ProjectDetail project={project} />
        </Container>
      </Section>
      <NextProject project={nextProjectOf(project.slug)} />
      <CtaBand
        heading={projectsCopy.caseCtaHeading}
        body={projectsCopy.ctaBody}
        cta={{ label: CONTACT_LABEL, to: CONTACT_PATH }}
        whatsappMessage={projectsCopy.ctaWhatsappMessage}
      />
    </>
  );
}
