import { cn } from '../../lib/utils';

type TagListTone = 'light' | 'dark';

interface TagListProps {
  tags: readonly string[];
  /** `dark` for tags on a black surface. */
  tone?: TagListTone;
  className?: string;
}

const CHIP_CLASSES = 'rounded-full border px-3 py-1 font-mono text-xs';
const TONE_CLASSES: Record<TagListTone, string> = {
  light: 'border-vn-gray-mid text-vn-gray-dark',
  dark: 'border-vn-gray-dark text-vn-gray-light',
};

/** The tags of a project as outlined mono chips, one list for the cards, the featured cards and the facts of a case. */
export function TagList({ tags, tone = 'light', className }: TagListProps) {
  return (
    // role="list": Tailwind preflight removes the markers, and Safari then drops the list semantics.
    <ul role="list" className={cn('flex flex-wrap gap-2', className)}>
      {tags.map((tag) => (
        <li key={tag} className={cn(CHIP_CLASSES, TONE_CLASSES[tone])}>
          {tag}
        </li>
      ))}
    </ul>
  );
}
