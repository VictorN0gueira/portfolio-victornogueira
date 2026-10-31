import * as Popover from '@radix-ui/react-popover';
import { ChevronDown } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useChoicePopover } from '../../hooks/useChoicePopover';
import { ChoiceList } from '../ui/ChoiceList';
import { contactFormCopy } from './contactFormCopy';
import { FIELD_CLASS, FIELD_INVALID_CLASS, FIELD_VALID_CLASS } from './contactStyles';

interface ServiceSelectProps {
  /** Id of the trigger button, for a label that points at it with `for`. A generated one when left out. */
  id?: string;
  value: string;
  /** Gets the plain label of the chosen option: it is also the value the form sends. */
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  invalid?: boolean;
  /** Id do elemento com a mensagem de erro; só é ligado ao botão enquanto invalid for true. */
  describedBy?: string;
  /**
   * Id do rótulo visível do campo: o nome do botão passa a ser o rótulo seguido do texto do botão. O texto é apontado
   * pelo id do seu span, não pelo botão: o botão tem o rótulo por `for`, e apontar para ele repetiria o rótulo no lugar do texto.
   */
  labelledBy?: string;
  /** Accessible name of the list. */
  listLabel?: string;
}

/**
 * The service field on the black surface: a button in the style of the text fields that opens a real listbox (the same
 * list and keyboard logic as the pills of the hero, on the dark tone). Arrow keys, Home, End, type-ahead, Enter or Space
 * choose, Escape closes and gives the focus back to the button, Tab closes and moves on. The list is rendered inside the
 * field, as wide as the button, and scrolls when it is taller than the room it has.
 */
export default function ServiceSelect({
  id,
  value,
  onChange,
  options,
  placeholder = contactFormCopy.selectPlaceholder,
  invalid = false,
  describedBy,
  labelledBy,
  listLabel = contactFormCopy.labels.servico,
}: ServiceSelectProps) {
  const generatedId = useId();
  const triggerId = id ?? generatedId;
  const valueId = `${triggerId}-value`;
  // The list goes inside this element (not into the body), so the form subtree owns its options.
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const choices = useMemo(() => options.map((option) => ({ value: option, label: option })), [options]);
  const { isOpen, handleOpenChange, triggerProps, listProps } = useChoicePopover({
    value,
    options: choices,
    onChange,
    allowEmpty: true,
  });

  return (
    <div ref={setContainer} className="relative">
      <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
        <Popover.Trigger
          {...triggerProps}
          id={triggerId}
          aria-haspopup="listbox"
          aria-labelledby={labelledBy ? `${labelledBy} ${valueId}` : undefined}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? describedBy : undefined}
          className={`group ${FIELD_CLASS} ${invalid ? FIELD_INVALID_CLASS : FIELD_VALID_CLASS} flex items-center justify-between gap-3 text-left`}
        >
          <span id={valueId} className={`min-w-0 ${value ? 'text-vn-white' : 'text-vn-gray-mid'}`}>
            {value || placeholder}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="size-4 shrink-0 text-vn-gray-light transition-transform duration-300 ease-out group-data-[state=open]:rotate-180"
          />
        </Popover.Trigger>
        <ChoiceList {...listProps} label={listLabel} tone="dark" portalContainer={container} />
      </Popover.Root>
    </div>
  );
}
