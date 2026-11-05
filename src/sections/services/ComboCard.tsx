import { Heading } from '../../components/ui/Heading';
import { SpotlightCard } from '../../components/ui/SpotlightCard';
import type { ServiceCombo } from '../../data/services';

const SURFACE_CLASSES =
  'flex h-full min-w-0 flex-col rounded-card border border-vn-gray-dark bg-vn-ink p-5 text-vn-white md:p-6';

interface ComboCardProps {
  combo: ServiceCombo;
}

/**
 * One combo on a dark card: the name as an h3, what it is made of in mono caps and the description. Not interactive.
 * Everything on it comes from the data, and the data carries no discount and no price, so the card draws none.
 */
export function ComboCard({ combo }: ComboCardProps) {
  return (
    <SpotlightCard as="div" tone="dark" className={SURFACE_CLASSES}>
      <Heading as="h3" size="m">
        {combo.nome}
      </Heading>
      <p className="mt-4 font-mono text-xs uppercase tracking-[.18em] text-vn-gray-light">{combo.composicao}</p>
      <p className="mt-4 text-pretty text-base text-vn-gray-light">{combo.descricao}</p>
    </SpotlightCard>
  );
}
