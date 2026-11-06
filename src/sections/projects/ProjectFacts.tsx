import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import {
  CONTACT_LABEL,
  FEATURES_LABEL,
  PROJECT_CTA_TEXT,
  TAGS_LABEL,
  contactAboutLabel,
} from '../../components/projectLabels';
import { Button } from '../../components/ui/Button';
import type { Project } from '../../data/projects';
import { projectsCopy } from '../../data/projectsCopy';
import { cn } from '../../lib/utils';
import { CONTACT_PATH } from './paths';
import { NoBreakHyphens } from '../shared/NoBreakHyphens';
import { STICKY_COLUMN_CLASSES } from './stickyColumn';
import { TagList } from './TagList';

const LABEL_CLASSES = 'font-mono text-xs uppercase tracking-[.18em] text-vn-gray-dark';

interface ProjectFactsProps {
  project: Project;
  /** Sticks from lg, in a window tall enough, while the gallery scrolls past. Off when the facts are the taller column. */
  isSticky?: boolean;
}

// The blocks are a heading and its content in a div: two tiny groups are not worth a region landmark each.
function Features({ items }: { items: readonly string[] }) {
  return (
    <div>
      <p className={LABEL_CLASSES}>{FEATURES_LABEL}</p>
      {/* role="list": Tailwind preflight removes the markers, and Safari then drops the list semantics. */}
      <ul role="list" className="mt-4 flex flex-col gap-3">
        {items.map((item) => (
          <li key={item} className="flex min-w-0 items-start gap-3 text-base text-vn-ink">
            <span aria-hidden="true" className="mt-2.5 block size-1.5 shrink-0 rounded-full bg-vn-ink" />
            <span className="min-w-0">
              <NoBreakHyphens text={item} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tags({ tags }: { tags: readonly string[] }) {
  return (
    <div>
      <p className={LABEL_CLASSES}>{TAGS_LABEL}</p>
      <TagList tags={tags} className="mt-4" />
    </div>
  );
}

/**
 * The column of facts of a case page: the category, what the product does (when the data says), the tags and the invite
 * to talk. It comes before the gallery in the markup. The link to /contato has an accessible name of its own (it starts
 * with the visible text), so it is told apart from the one of the closing band.
 */
export function ProjectFacts({ project, isSticky = true }: ProjectFactsProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-10', isSticky && STICKY_COLUMN_CLASSES)}>
      <div>
        <p className={LABEL_CLASSES}>{projectsCopy.categoryLabel}</p>
        <p className="mt-2 text-lg font-medium text-vn-ink">{project.category}</p>
      </div>
      {project.features && <Features items={project.features} />}
      <Tags tags={project.tags} />
      <div className="border-t border-vn-gray-light pt-8">
        <p className="max-w-xs text-pretty text-lg font-medium text-vn-ink">{PROJECT_CTA_TEXT}</p>
        <Button asChild size="lg" className="mt-5">
          <Link to={CONTACT_PATH} aria-label={contactAboutLabel(project.title)}>
            {CONTACT_LABEL}
            <ArrowRight aria-hidden="true" className="size-5 shrink-0" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
