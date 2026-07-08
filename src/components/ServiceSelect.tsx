import { useState, useRef, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';

interface ServiceSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  invalid?: boolean;
}

/* Dropdown customizado no estilo dos campos do form (fundo escuro).
   Fecha ao clicar fora / Esc; navegável por teclado; responsivo no toque. */
export default function ServiceSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione uma opção',
  invalid = false,
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
        className={`w-full flex items-center justify-between gap-3 bg-white/5 border rounded-2xl px-6 py-3.5 md:py-4 text-sm text-left transition-all focus:outline-none focus:ring-2 ${
          invalid
            ? 'border-red-500/50 focus:ring-red-500/20'
            : 'border-white/10 focus:ring-white/20'
        }`}
      >
        <span className={value ? 'text-white' : 'text-zinc-600'}>
          {value || placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-zinc-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
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
            className="absolute left-0 right-0 top-full mt-2 z-50 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/40 py-2 custom-scrollbar"
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
                    className={`w-full flex items-center justify-between gap-3 px-6 py-3 text-sm text-left transition-colors ${
                      selected ? 'text-emerald-400 bg-white/5' : 'text-zinc-300 hover:bg-white/5'
                    }`}
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
