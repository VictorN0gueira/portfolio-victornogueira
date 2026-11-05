import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CONTACT_LABEL, FEATURES_LABEL, PROJECT_CTA_TEXT, TAGS_LABEL } from '../../components/projectLabels';
import { Button } from '../../components/ui/Button';
import type { Project } from '../../data/projects';
import { projectsCopy } from '../../data/projectsCopy';

const CONTACT_PATH = '/contato';
const LABEL_CLASSES = 'font-mono text-xs uppercase tracking-[.18em] text-vn-gray-dark';

interface ProjectFactsProps {
  project: Project;
}

function Features({ items }: { items: readonly string[] }) {
  return (
    <section aria-labelledby="projeto-faz">
      <h2 id="projeto-faz" className={LABEL_CLASSES}>
        {FEATURES_LABEL}
      </h2>
      {/* role="list": Tailwind preflight removes the markers, and Safari then drops the list semantics. */}
      <ul role="list" className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <li key={item} className="flex min-w-0 items-start gap-3 text-base text-vn-ink">
            <span aria-hidden="true" className="mt-2.5 block size-1.5 shrink-0 rounded-full bg-vn-ink" />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Tags({ tags }: { tags: readonly string[] }) {
  return (
    <section aria-labelledby="projeto-tecnologias">
      <h2 id="projeto-tecnologias" className={LABEL_CLASSES}>
        {TAGS_LABEL}
      </h2>
      <ul role="list" className="mt-4 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <li
            key={tag}
            className="rounded-full border border-vn-gray-mid px-3 py-1 font-mono text-xs text-vn-gray-dark"
          >
            {tag}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The column of facts of a case page: the category, what the product does (when the data says), the tags and the invite
 * to talk. It comes before the gallery in the markup and, from lg, stays in place beside it while the screenshots scroll.
 */
export function ProjectFacts({ project }: ProjectFactsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-10 lg:sticky lg:top-28 lg:self-start">
      <div>
        <p className={LABEL_CLASSES}>{projectsCopy.categoryLabel}</p>
        <p className="mt-2 text-lg font-medium text-vn-ink">{project.category}</p>
      </div>
      {project.features && <Features items={project.features} />}
      <Tags tags={project.tags} />
      <div className="border-t border-vn-gray-light pt-8">
        <p className="max-w-xs text-pretty text-lg font-medium text-vn-ink">{PROJECT_CTA_TEXT}</p>
        <Button asChild size="lg" className="mt-5">
          <Link to={CONTACT_PATH}>
            {CONTACT_LABEL}
            <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
