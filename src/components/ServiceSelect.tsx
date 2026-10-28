import { useState, useRef, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';
import { FIELD_CLASS, FIELD_INVALID_CLASS, FIELD_VALID_CLASS } from './contact/contactStyles';

// Colors of the list on the black surface, in VN One tokens: the focus ring of an option is drawn inside it, so the
// scroll box does not clip it.
const LIST_CLASS =
  'absolute left-0 right-0 top-full mt-2 z-50 max-h-64 overflow-y-auto rounded-xl border border-vn-gray-mid bg-vn-ink shadow-2xl shadow-black/40 py-2 custom-scrollbar';
const OPTION_CLASS =
  'w-full flex min-h-11 items-center justify-between gap-3 px-4 py-3 text-sm text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-vn-white';
const OPTION_SELECTED_CLASS = 'bg-vn-white/10 text-vn-white';
const OPTION_IDLE_CLASS = 'text-vn-gray-light hover:bg-vn-white/10';

interface ServiceSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  invalid?: boolean;
  /** Id do elemento com a mensagem de erro; só é ligado ao botão enquanto invalid for true. */
  describedBy?: string;
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
}: ServiceSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? describedBy : undefined}
        className={`${FIELD_CLASS} ${invalid ? FIELD_INVALID_CLASS : FIELD_VALID_CLASS} flex items-center justify-between gap-3 text-left`}
      >
        <span className={`min-w-0 ${value ? 'text-vn-white' : 'text-vn-gray-mid'}`}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-vn-gray-light transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={LIST_CLASS}
          >
            {options.map((option) => {
              const selected = option === value;
              return (
                <li key={option} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                    }}
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
    </div>
  );
}
