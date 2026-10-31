import { brandIcons, type BrandIconId } from '../../data/brandIcons';

interface BrandIconProps {
  id: BrandIconId;
  className?: string;
  /** Accessible name. Without it the icon is decorative and hidden from assistive tech. */
  title?: string;
}

/** A Simple Icons brand mark, filled with the current text color. */
export function BrandIcon({ id, className, title }: BrandIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      focusable="false"
      {...(title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true })}
    >
      <path d={brandIcons[id].path} />
    </svg>
  );
}
