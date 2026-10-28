import { useState, useRef, useEffect, useId, useCallback, type RefObject } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';
import { FIELD_CLASS, FIELD_INVALID_CLASS, FIELD_VALID_CLASS } from './contact/contactStyles';

// Colors of the list on the black surface, in VN One tokens: the focus ring of an option is drawn inside it, so the
// scroll box does not clip it.
const LIST_CLASS =
  'absolute left-0 right-0 top-full mt-2 z-50 max-h-64 overflow-y-auto rounded-xl border border-vn-gray-mid bg-vn-ink shadow-2xl shadow-vn-black/40 py-2 custom-scrollbar';
const OPTION_CLASS =
  'w-full flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-sm text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-vn-white';
const OPTION_SELECTED_CLASS = 'bg-vn-white/10 text-vn-white';
const OPTION_IDLE_CLASS = 'text-vn-gray-light hover:bg-vn-white/10';
// The design system easing, as the cubic bezier points motion expects.
const LIST_EASE = [0.22, 1, 0.36, 1] as const;

interface ServiceSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  invalid?: boolean;
  /** Id do elemento com a mensagem de erro; só é ligado ao botão enquanto invalid for true. */
  describedBy?: string;
  /** Id do rótulo visível do campo: o nome do botão passa a ser o rótulo seguido do próprio texto do botão. */
  labelledBy?: string;
}

/** Closes the list with a pointer down outside the container or with Escape, while it is open. */
function useDismissOnOutside(isOpen: boolean, containerRef: RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, containerRef, close]);
}

interface ServiceListboxProps {
  id: string;
  isOpen: boolean;
  options: string[];
  value: string;
  onChoose: (option: string) => void;
}

/** The popup list: a listbox of one option button per service, fading in and out. */
function ServiceListbox({ id, isOpen, options, value, onChoose }: ServiceListboxProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.ul
          id={id}
          role="listbox"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: LIST_EASE }}
          className={LIST_CLASS}
        >
          {options.map((option) => {
            const selected = option === value;
            return (
              <li key={option} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => onChoose(option)}
                  className={`${OPTION_CLASS} ${selected ? OPTION_SELECTED_CLASS : OPTION_IDLE_CLASS}`}
                >
                  {option}
                  {selected && <Check className="w-4 h-4 shrink-0" />}
                </button>
              </li>
            );
          })}
        </motion.ul>
      )}
    </AnimatePresence>
  );
}

/* Dropdown customizado no estilo dos campos do form (fundo preto, tokens VN One).
   Fecha ao clicar fora ou com Esc; navegável por teclado; responsivo no toque. */
export default function ServiceSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione uma opção',
  invalid = false,
  describedBy,
  labelledBy,
}: ServiceSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const triggerId = useId();
  const close = useCallback(() => setOpen(false), []);
  useDismissOnOutside(open, containerRef, close);

  return (
    <div ref={containerRef} className="relative">
      <button
        id={triggerId}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={labelledBy ? `${labelledBy} ${triggerId}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? describedBy : undefined}
        className={`${FIELD_CLASS} ${invalid ? FIELD_INVALID_CLASS : FIELD_VALID_CLASS} flex items-center justify-between gap-3 text-left`}
      >
        <span className={`min-w-0 ${value ? 'text-vn-white' : 'text-vn-gray-mid'}`}>{value || placeholder}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-vn-gray-light transition-transform duration-300 ease-out ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <ServiceListbox
        id={listId}
        isOpen={open}
        options={options}
        value={value}
        onChoose={(option) => {
          onChange(option);
          close();
        }}
      />
    </div>
  );
}
