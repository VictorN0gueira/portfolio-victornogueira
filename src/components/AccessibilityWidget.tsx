import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Accessibility } from 'lucide-react';
import { useAccessibility } from '../contexts/AccessibilityContext';

interface Option {
  key: 'fontSize' | 'highContrast' | 'grayscale' | 'noAnimations' | 'underlineLinks' | 'readableFont';
  label: string;
  icon: string;
}

const options: Option[] = [
  { key: 'fontSize',       label: 'Texto maior',        icon: 'Aa' },
  { key: 'highContrast',   label: 'Alto contraste',     icon: '◑' },
  { key: 'grayscale',      label: 'Escala de cinza',    icon: '⬜' },
  { key: 'noAnimations',   label: 'Pausar animações',   icon: '⏸' },
  { key: 'underlineLinks', label: 'Sublinhar links',    icon: 'U̲' },
  { key: 'readableFont',   label: 'Fonte legível',      icon: 'F' },
];

function getBrightness(el: Element): number | null {
  let current: Element | null = el;
  while (current && current !== document.documentElement) {
    const bg = window.getComputedStyle(current).backgroundColor;
    const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (m) {
      const alpha = m[4] !== undefined ? parseFloat(m[4]) : 1;
      if (alpha > 0.3) {
        return (parseInt(m[1]) * 299 + parseInt(m[2]) * 587 + parseInt(m[3]) * 114) / 1000;
      }
    }
    current = current.parentElement;
  }
  return null;
}

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { state, toggle, reset } = useAccessibility();
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const checkBackground = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const elements = document.elementsFromPoint(x, y);
    for (const el of elements) {
      if (el === btn || btn.contains(el as Node)) continue;
      const brightness = getBrightness(el);
      if (brightness !== null) {
        setIsDark(brightness < 140);
        return;
      }
    }
  }, []);

  useEffect(() => {
    checkBackground();
    window.addEventListener('scroll', checkBackground, { passive: true });
    window.addEventListener('resize', checkBackground, { passive: true });
    return () => {
      window.removeEventListener('scroll', checkBackground);
      window.removeEventListener('resize', checkBackground);
    };
  }, [checkBackground]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  const activeCount = Object.values(state).filter(Boolean).length;

  return (
    /* Mobile: ancorado no bottom para alcance do polegar; Desktop: centralizado na lateral */
    <div
      ref={panelRef}
      className="fixed right-0 bottom-52 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 z-[150] flex items-center"
      style={{ direction: 'rtl' }}
    >
      {/* Painel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 16, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 16, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            role="dialog"
            aria-label="Opções de acessibilidade"
            className="mr-2 w-[min(13rem,calc(100vw-3.5rem))] rounded-2xl border border-white/10 bg-zinc-950/95 backdrop-blur-xl shadow-2xl overflow-hidden max-h-[calc(100svh-8rem)] flex flex-col"
            style={{ direction: 'ltr' }}
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
              <span className="text-xs font-semibold text-white/80 uppercase tracking-widest">
                Acessibilidade
              </span>
              {activeCount > 0 && (
                <span className="text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5 font-medium">
                  {activeCount} ativo{activeCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <ul className="py-1 overflow-y-auto">
              {options.map(({ key, label, icon }) => {
                const active = state[key];
                return (
                  <li key={key}>
                    <button
                      onClick={() => toggle(key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 sm:py-2.5 text-sm transition-colors text-left
                        ${active
                          ? 'bg-white/15 text-white'
                          : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                        }`}
                      aria-pressed={active}
                    >
                      <span className="w-5 text-center font-bold text-[13px] shrink-0" aria-hidden="true">
                        {icon}
                      </span>
                      <span>{label}</span>
                      {active && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {activeCount > 0 && (
              <div className="px-4 py-3 border-t border-white/10 shrink-0">
                <button
                  onClick={reset}
                  className="w-full text-xs text-white/50 hover:text-white/80 transition-colors text-center"
                >
                  ↺ Resetar tudo
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão gatilho — cor adaptativa baseada no fundo detectado */}
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Abrir opções de acessibilidade"
        className={`relative flex items-center justify-center w-11 h-11 rounded-l-xl shadow-lg transition-colors duration-300
          ${isDark
            ? 'bg-white text-zinc-950'
            : 'bg-zinc-950 text-white border border-zinc-200'
          }`}
      >
        <Accessibility className="w-5 h-5" aria-hidden="true" />
        {activeCount > 0 && !open && (
          <span
            className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center
              ${isDark ? 'bg-zinc-950 text-white' : 'bg-white text-zinc-950 border border-zinc-200'}`}
            aria-hidden="true"
          >
            {activeCount}
          </span>
        )}
      </button>
    </div>
  );
}
