import { ChevronDown } from 'lucide-react';

/**
 * What is inside a pill: the label and the chevron. Shared by the plain button the entry renders and by the Radix
 * trigger of the popover chunk, so the two look the same down to the pixel.
 */
export function PillFace({ label }: { label: string }) {
  return (
    <>
      <span>{label}</span>
      <ChevronDown
        aria-hidden="true"
        className="absolute top-1/2 right-[0.6em] size-[0.55em] -translate-y-1/2 transition-transform duration-200 ease-out group-data-[state=open]:rotate-180"
      />
    </>
  );
}
