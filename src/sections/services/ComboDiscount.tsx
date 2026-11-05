import type { ServiceCombo } from '../../data/services';

interface ComboDiscountProps {
  combo: ServiceCombo;
}

/**
 * The one place where a discount shows. It is an outline pill with exactly the text of the data, and it draws nothing
 * when the combo has none, so the card leaves no gap. To take the discounts off the whole site, delete the field from
 * data/services.ts: nothing else here names it, and no percentage or price is written in this code.
 */
export function ComboDiscount({ combo }: ComboDiscountProps) {
  if (!combo.desconto) return null;

  return (
    <p
      data-combo-discount=""
      className="mb-4 inline-flex self-start rounded-full border border-vn-gray-mid px-3 py-1 font-mono text-xs uppercase tracking-[.18em] text-vn-white"
    >
      {combo.desconto}
    </p>
  );
}
