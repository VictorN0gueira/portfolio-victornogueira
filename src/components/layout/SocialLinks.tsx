import { Github, Instagram, Linkedin, type LucideIcon } from 'lucide-react';
import { SOCIAL_LINKS, type SocialLink } from '../../lib/constants';

const SOCIAL_ICONS: Record<SocialLink['label'], LucideIcon> = {
  LinkedIn: Linkedin,
  GitHub: Github,
  Instagram,
};

interface SocialLinksProps {
  /** The id of the NewTabHint that tells a screen reader these links open a new tab. */
  hintId: string;
}

/** The icon links to the social profiles: 44px targets, named by the network, each in a new tab. */
export function SocialLinks({ hintId }: SocialLinksProps) {
  return (
    <ul className="-mx-2.5 flex items-center">
      {SOCIAL_LINKS.map(({ label, href }) => {
        const Icon = SOCIAL_ICONS[label];

        return (
          <li key={label}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              aria-describedby={hintId}
              className="grid size-11 place-items-center rounded-full text-vn-gray-light hover:bg-vn-ink hover:text-vn-white vn-focus-ring"
            >
              <Icon className="size-5" aria-hidden="true" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
