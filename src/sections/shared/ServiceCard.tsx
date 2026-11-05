import { useId } from 'react';
import { Check, Clock } from 'lucide-react';
import { Heading } from '../../components/ui/Heading';
import { Kicker } from '../../components/ui/Kicker';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import { homeCopy } from '../../data/homeCopy';
import type { Service } from '../../data/services';
import { cn } from '../../lib/utils';
import { SERVICE_SUBGRID_CLASSES } from './serviceCardLayout';

// The article is a plain flex column that names itself from its heading and has no look of its own: the SpotlightCard
// inside it draws the surface (radius, border, background). min-w-0 lets the card shrink below its longest word, so
// nothing widens a 280px page.
const ARTICLE_CLASSES = `flex min-w-0 flex-1 ${SERVICE_SUBGRID_CLASSES}`;
const SURFACE_CLASSES = `flex w-full min-w-0 flex-col rounded-card border border-vn-gray-light bg-vn-white p-5 text-vn-ink md:p-6 ${SERVICE_SUBGRID_CLASSES}`;
// Under the fixed header when /servicos#slug scrolls here.
const ANCHOR_CLASSES = 'scroll-mt-28';

interface ServiceCardProps {
  service: Service;
  /** The heading level: h3 under the h2 of the home section, h2 on the services page (right after the h1). */
  headingAs?: 'h2' | 'h3';
  /** Becomes the id of the article, so /servicos#<slug> can find it. */
  anchorId?: string;
}

/**
 * One service. The category is the kicker, the name a heading that also names the article, then the description, the
 * list of what is included and the term in mono. The card is not interactive: no tab stop, no hidden content. The
 * list is always visible at full contrast, on every device; on a fine pointer it only settles 8px into place while
 * the pointer is over the card (tokens.css, CSS only, transform alone).
 */
export function ServiceCard({ service, headingAs = 'h3', anchorId }: ServiceCardProps) {
  const nameId = useId();

  return (
    <article id={anchorId} aria-labelledby={nameId} className={cn(ARTICLE_CLASSES, anchorId && ANCHOR_CLASSES)}>
      <SpotlightCard as="div" className={SURFACE_CLASSES}>
        <Kicker>{service.categoria}</Kicker>
        <Heading as={headingAs} size="m" id={nameId} className="mt-5">
          {service.nome}
        </Heading>
        <p className="mt-3 text-pretty text-base text-vn-gray-dark">{service.descricao}</p>
        <div className="mt-6 border-t border-vn-gray-light pt-5">
          {/* role="list": Tailwind preflight removes the markers, and Safari then drops the list semantics. */}
          <ul role="list" className="vn-card-includes flex flex-col gap-2.5">
            {service.inclui.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-snug">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="flex items-center gap-2 self-start pt-6 font-mono text-sm">
          <Clock aria-hidden="true" className="size-4 shrink-0" />
          <span className="sr-only">{homeCopy.services.term}: </span>
          {service.prazo}
        </p>
      </SpotlightCard>
    </article>
  );
}
