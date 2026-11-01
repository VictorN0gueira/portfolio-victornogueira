import { useState, useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { m } from 'motion/react';
import { TrendingUp, ArrowUpRight, Sparkles } from 'lucide-react';
import { homeCopy } from '../data/homeCopy';
import { NewTabHint } from './ui/NewTabHint';
import { useMotionAllowed } from '../hooks/useMotionAllowed';
import { formatBRL, formatBRLCompact } from '../lib/format';
import {
  DEFAULT_HOURLY_RATE,
  TEAM_OPTIONS,
  annualManualCost,
  annualSavings,
  buildQuoteMessage,
} from '../lib/roi';

const WA_LINK =
  "https://wa.me/5581984451243?text=Ol%C3%A1%2C+Victor!+Quero+automatizar+meus+processos.";

function useAnimatedNumber(target: number) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);
  const isMotionAllowed = useMotionAllowed();

  useEffect(() => {
    // Reduced motion (the system or the widget's "Pausar animações"): no counting frames, the figure is the target.
    if (!isMotionAllowed) {
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    const duration = 550;
    let start: number | null = null;

    cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(function step(ts) {
      if (start === null) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const next = Math.round(from + (target - from) * eased);
      fromRef.current = next;
      setDisplay(next);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    });

    return () => cancelAnimationFrame(rafRef.current);
  }, [target, isMotionAllowed]);

  return isMotionAllowed ? display : target;
}

const TEAM_OPTION_BASE =
  'flex w-full items-center justify-center rounded-xl border px-2 xs:px-4 py-3.5 text-center text-sm font-medium transition-all duration-200';
// The native radio is visually hidden and the span after it draws the option: peer-checked and peer-focus-visible style
// it from the input, so the keyboard and the screen reader get a real radio. Forced colors drop the dark fill, so the
// chosen option is also underlined there.
const TEAM_OPTION_CLASSES = [
  TEAM_OPTION_BASE,
  'border-zinc-200 bg-white text-vn-gray-dark hover:border-vn-gray-mid hover:text-vn-ink',
  'peer-checked:border-vn-ink peer-checked:bg-vn-ink peer-checked:text-white peer-checked:shadow-md',
  'forced-colors:peer-checked:underline forced-colors:peer-checked:decoration-2 forced-colors:peer-checked:underline-offset-4',
  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-vn-ink',
].join(' ');

interface TeamSizeRadiosProps {
  selectedIndex: number;
  onChange: (index: number) => void;
}

/**
 * How many people do the task: a radio group of native radios (one name, so the group is one tab stop and the arrow
 * keys move the choice). Home and End jump to the first and the last option. The chosen option is announced as checked.
 */
function TeamSizeRadios({ selectedIndex, onChange }: TeamSizeRadiosProps) {
  const labelId = useId();
  const groupName = useId();

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Home' && event.key !== 'End') return;
    // Ctrl, Meta, Alt or Shift with Home or End belong to the browser (scroll, select, history), not to the group.
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    if (!(event.target instanceof HTMLInputElement)) return;

    const radios = event.currentTarget.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    const index = event.key === 'Home' ? 0 : radios.length - 1;
    event.preventDefault();
    radios[index].focus();
    onChange(index);
  };

  return (
    <div>
      <p id={labelId} className="text-sm font-semibold text-vn-ink mb-3">Pessoas que executam essa tarefa</p>
      {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus -- the native radios inside are the tab stop */}
      <div role="radiogroup" aria-labelledby={labelId} onKeyDown={handleKeyDown} className="grid grid-cols-2 gap-2">
        {TEAM_OPTIONS.map((opt, i) => (
          <label key={opt.label} className="relative flex min-h-11 cursor-pointer">
            <input
              type="radio"
              name={groupName}
              value={opt.label}
              checked={i === selectedIndex}
              onChange={() => onChange(i)}
              className="peer sr-only"
            />
            <span className={TEAM_OPTION_CLASSES}>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

interface ROICalculatorProps {
  /** Quando presente, o CTA pré-preenche o formulário de contato em vez de abrir o WhatsApp */
  onQuoteRequest?: (message: string, savings: number) => void;
}

export default function ROICalculator({ onQuoteRequest }: ROICalculatorProps) {
  const newTabHintId = useId();
  const [hours, setHours] = useState(12);
  const [teamIndex, setTeamIndex] = useState(1);
  const [hourlyRate, setHourlyRate] = useState(DEFAULT_HOURLY_RATE);

  const roiInput = { hoursPerWeek: hours, teamMultiplier: TEAM_OPTIONS[teamIndex].value, hourlyRate };
  const annualCost = annualManualCost(roiInput);
  const savings = annualSavings(roiInput);

  const displayCost = useAnimatedNumber(annualCost);
  const displaySavings = useAnimatedNumber(savings);

  const roiLabel = savings < 20_000 ? 'Moderado' : savings < 100_000 ? 'Alto' : 'Muito alto';
  const roiBarWidth = Math.min(97, Math.max(18, savings < 20_000 ? 25 : savings < 100_000 ? 60 : savings < 400_000 ? 82 : 97));
  const trackProgress = ((hours - 1) / 79) * 100;

  return (
    <section className="py-24 md:py-32 px-6 md:px-12 bg-brand-white overflow-hidden">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <m.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-12 md:mb-16"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-vn-gray-dark mb-5">
            Calcula o impacto
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter font-display italic leading-none mb-5">
            Quanto sua empresa<br className="hidden sm:block" /> perde por ano?
          </h1>
          <p className="text-vn-gray-dark text-base md:text-lg font-light max-w-xl">
            Descobre o custo real dos seus processos manuais e quanto você pode recuperar.
          </p>
        </m.div>

        {/* Main card */}
        <m.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="grid md:grid-cols-[1fr_420px] lg:grid-cols-[1fr_460px] gap-3 md:gap-4"
        >
          {/* ── Left: Inputs ── */}
          <div className="bg-zinc-50 dark:bg-zinc-800 rounded-3xl p-7 md:p-10 flex flex-col gap-8 border border-zinc-100 dark:border-zinc-700">

            {/* Slider */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-vn-ink">Horas por semana em tarefas manuais</p>
                <span className="text-3xl font-bold tabular-nums leading-none text-zinc-900 dark:text-white">{hours}h</span>
              </div>
              <input
                type="range"
                min={1}
                max={80}
                value={hours}
                onChange={e => setHours(Number(e.target.value))}
                className="roi-slider w-full"
                style={{
                  background: `linear-gradient(to right, var(--roi-slider-fill) 0%, var(--roi-slider-fill) ${trackProgress}%, var(--roi-slider-track) ${trackProgress}%, var(--roi-slider-track) 100%)`,
                }}
                aria-label="Horas por semana em tarefas manuais"
              />
              <div className="flex justify-between text-xs text-vn-gray-dark mt-2">
                <span>1h</span>
                <span>80h</span>
              </div>
            </div>

            {/* Team size */}
            <TeamSizeRadios selectedIndex={teamIndex} onChange={setTeamIndex} />

            {/* Hourly rate */}
            <div>
              <p className="text-sm font-semibold text-vn-ink mb-3">Custo médio por hora da equipe (R$)</p>
              <label className="flex items-center bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-xl px-4 py-3.5 gap-2 focus-within:border-zinc-500 dark:focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-100 dark:focus-within:ring-zinc-700 transition-all cursor-text">
                <span className="text-vn-gray-dark text-sm font-medium shrink-0">R$</span>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={hourlyRate}
                  onChange={e => setHourlyRate(Math.max(1, Number(e.target.value)))}
                  className="flex-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-vn-ink text-xl font-bold text-zinc-900 dark:text-white bg-transparent min-w-0 tabular-nums"
                  aria-label="Custo médio por hora da equipe em reais"
                />
              </label>
            </div>
          </div>

          {/* ── Right: Results (dark panel) ── */}
          <div className="bg-zinc-950 rounded-3xl p-7 md:p-10 flex flex-col gap-7 relative overflow-hidden">

            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/[0.02] rounded-full blur-[60px] pointer-events-none" />

            <div className="flex items-center gap-2 relative z-10">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-400">Resultado</span>
            </div>

            {/* Annual cost */}
            <div className="relative z-10">
              <p className="text-xs text-vn-gray-light mb-2 uppercase tracking-widest font-medium">
                Custo anual atual
              </p>
              <p className="text-3xl xs:text-4xl md:text-5xl font-bold text-white tabular-nums leading-none">
                {formatBRLCompact(displayCost)}
              </p>
              <p className="text-vn-gray-mid text-xs mt-1.5 tabular-nums">
                {formatBRL(displayCost)} por ano
              </p>
            </div>

            <div className="h-px bg-white/5" />

            {/* Savings */}
            <div className="relative z-10">
              <p className="text-xs text-vn-gray-light mb-2 uppercase tracking-widest font-medium">
                Economia com automação
              </p>
              <p className="text-3xl xs:text-4xl md:text-5xl font-bold text-emerald-400 tabular-nums leading-none">
                {formatBRLCompact(displaySavings)}
              </p>
              <p className="text-vn-gray-mid text-xs mt-1.5">estimados por ano</p>
            </div>

            {/* ROI bar */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs text-vn-gray-light uppercase tracking-widest font-medium">ROI estimado</p>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {roiLabel}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${roiBarWidth}%` }}
                />
              </div>
            </div>

            {/* CTA: com onQuoteRequest pré-preenche o form; sem, abre o WhatsApp */}
            {onQuoteRequest ? (
              <m.button
                type="button"
                onClick={() => onQuoteRequest(buildQuoteMessage(roiInput), savings)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="mt-auto w-full bg-white hover:bg-zinc-100 text-zinc-900 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors relative z-10 shadow-lg"
              >
                Quero automatizar esse processo
                <ArrowUpRight className="w-4 h-4" />
              </m.button>
            ) : (
              <>
              <NewTabHint id={newTabHintId} />
              <m.a
                href={WA_LINK}
                target="_blank"
                rel="noopener noreferrer"
                aria-describedby={newTabHintId}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="mt-auto w-full bg-white hover:bg-zinc-100 text-zinc-900 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors relative z-10 shadow-lg"
              >
                Quero automatizar esse processo
                <ArrowUpRight className="w-4 h-4" />
              </m.a>
              </>
            )}

            <p className="text-center text-vn-gray-mid text-[11px] leading-relaxed relative z-10">
              {homeCopy.roi.note}<br />Consulta gratuita e sem compromisso.
            </p>
          </div>
        </m.div>
      </div>
    </section>
  );
}
