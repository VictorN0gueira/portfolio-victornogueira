import type { Project } from '../../data/projects';

interface ProjectHighlightProps {
  project: Project;
}

/**
 * The highlight phrase of a featured project (DizPara, Hub081) in large type under a 3px ink rule. It shows the phrase
 * of the data and nothing else: no number, no count-up. A project without a phrase gets nothing, and nothing takes its
 * place, because the phrase is not made up.
 */
export function ProjectHighlight({ project }: ProjectHighlightProps) {
  if (!project.highlight) return null;

  return (
    <div className="border-t-[3px] border-vn-ink pt-6 md:pt-8">
      <p className="max-w-4xl text-pretty font-display text-[length:clamp(1.5rem,1rem+2.4vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.02em] text-vn-ink">
        {project.highlight}
      </p>
    </div>
  );
}
