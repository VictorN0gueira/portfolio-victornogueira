import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, ArrowUpRight, Sparkles } from 'lucide-react';

const WA_LINK =
  "https://wa.me/5581987348633?text=Ol%C3%A1%2C+Victor!+Quero+automatizar+meus+processos.";

const TEAM_OPTIONS = [
  { label: '1 pessoa', value: 1 },
  { label: '2–3 pessoas', value: 2.5 },
  { label: '4–10 pessoas', value: 7 },
  { label: '10+ pessoas', value: 15 },
];

function useAnimatedNumber(target: number) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);

  useEffect(() => {
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
  }, [target]);

  return display;
}

function formatBRL(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}K`;
  }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function formatBRLFull(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export default function ROICalculator() {
  const [hours, setHours] = useState(12);
  const [teamIndex, setTeamIndex] = useState(1);
  const [hourlyRate, setHourlyRate] = useState(50);

  const teamMultiplier = TEAM_OPTIONS[teamIndex].value;
  const annualCost = Math.round(hours * teamMultiplier * hourlyRate * 52);
  const savings = Math.round(annualCost * 0.8);

  const displayCost = useAnimatedNumber(annualCost);
  const displaySavings = useAnimatedNumber(savings);

  const roiLabel = savings < 20_000 ? 'Moderado' : savings < 100_000 ? 'Alto' : 'Muito alto';
  const roiBarWidth = Math.min(97, Math.max(18, savings < 20_000 ? 25 : savings < 100_000 ? 60 : savings < 400_000 ? 82 : 97));
  const trackProgress = ((hours - 1) / 79) * 100;

  return (
    <section className="py-24 md:py-32 px-6 md:px-12 bg-brand-white overflow-hidden">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-12 md:mb-16"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-5">
            Calcule o impacto
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tighter font-display italic leading-none mb-5">
            Quanto sua empresa<br className="hidden sm:block" /> perde por ano?
          </h2>
          <p className="text-zinc-500 text-base md:text-lg font-light max-w-xl">
            Descubra o custo real dos seus processos manuais — e o quanto você pode recuperar.
          </p>
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="grid md:grid-cols-[1fr_420px] lg:grid-cols-[1fr_460px] gap-3 md:gap-4"
        >
          {/* ── Left: Inputs ── */}
          <div className="bg-zinc-50 rounded-3xl p-7 md:p-10 flex flex-col gap-8 border border-zinc-100">

            {/* Slider */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold text-zinc-700">Horas/semana em tarefas manuais</p>
                <span className="text-3xl font-bold tabular-nums leading-none">{hours}h</span>
              </div>
              <input
                type="range"
                min={1}
                max={80}
                value={hours}
                onChange={e => setHours(Number(e.target.value))}
                className="roi-slider w-full"
                style={{
                  background: `linear-gradient(to right, #18181b 0%, #18181b ${trackProgress}%, #e4e4e7 ${trackProgress}%, #e4e4e7 100%)`,
                }}
                aria-label="Horas por semana em tarefas manuais"
              />
              <div className="flex justify-between text-xs text-zinc-400 mt-2">
                <span>1h</span>
                <span>80h</span>
              </div>
            </div>

            {/* Team size */}
            <div>
              <p className="text-sm font-semibold text-zinc-700 mb-3">Pessoas que executam essa tarefa</p>
              <div className="grid grid-cols-2 gap-2">
                {TEAM_OPTIONS.map((opt, i) => (
                  <motion.button
                    key={opt.label}
                    type="button"
                    onClick={() => setTeamIndex(i)}
                    whileTap={{ scale: 0.96 }}
                    className={`py-3.5 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                      teamIndex === i
                        ? 'bg-zinc-900 text-white shadow-md'
                        : 'bg-white border border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-800'
                    }`}
                  >
                    {opt.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Hourly rate */}
            <div>
              <p className="text-sm font-semibold text-zinc-700 mb-3">Custo médio/hora da equipe (R$)</p>
              <label className="flex items-center bg-white border border-zinc-200 rounded-xl px-4 py-3.5 gap-2 focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-100 transition-all cursor-text">
                <span className="text-zinc-400 text-sm font-medium shrink-0">R$</span>
                <input
                  type="number"
                  min={1}
                  max={5000}
                  value={hourlyRate}
                  onChange={e => setHourlyRate(Math.max(1, Number(e.target.value)))}
                  className="flex-1 outline-none text-xl font-bold text-zinc-900 bg-transparent min-w-0 tabular-nums"
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
              <p className="text-xs text-zinc-500 mb-2 uppercase tracking-widest font-medium">
                Custo anual atual
              </p>
              <p className="text-4xl md:text-5xl font-bold text-white tabular-nums leading-none">
                {formatBRL(displayCost)}
              </p>
              <p className="text-zinc-600 text-xs mt-1.5 tabular-nums">
                {formatBRLFull(displayCost)} por ano
              </p>
            </div>

            <div className="h-px bg-white/5" />

            {/* Savings */}
            <div className="relative z-10">
              <p className="text-xs text-zinc-500 mb-2 uppercase tracking-widest font-medium">
                Economia com automação
              </p>
              <p className="text-4xl md:text-5xl font-bold text-emerald-400 tabular-nums leading-none">
                {formatBRL(displaySavings)}
              </p>
              <p className="text-zinc-600 text-xs mt-1.5">/ano estimados</p>
            </div>

            {/* ROI bar */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">ROI estimado</p>
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

            {/* CTA */}
            <motion.a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="mt-auto w-full bg-white hover:bg-zinc-100 text-zinc-900 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors relative z-10 shadow-lg"
            >
              Quero automatizar esse processo
              <ArrowUpRight className="w-4 h-4" />
            </motion.a>

            <p className="text-center text-zinc-600 text-[11px] leading-relaxed relative z-10">
              Estimativa baseada em projetos anteriores.<br />Consulta gratuita e sem compromisso.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
