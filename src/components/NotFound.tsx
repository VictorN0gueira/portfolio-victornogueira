import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { m } from 'motion/react';
import { useMotionAllowed } from '../hooks/useMotionAllowed';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&!?';
const ACCENTS = new Set(['ã', 'â', 'á', 'à', 'ê', 'é', 'í', 'ó', 'ô', 'ú', 'ç', 'ñ']);

function useScramble(text: string) {
  const [display, setDisplay] = useState('');
  const [active, setActive] = useState(false);
  const isMotionAllowed = useMotionAllowed();

  useEffect(() => {
    // Reduced motion (the system, or the widget's "Pausar animações"): the title stays as it is (the hook returns the
    // text while display is empty), with no scramble.
    if (!isMotionAllowed) return;
    const timer = setTimeout(() => setActive(true), 400);
    return () => clearTimeout(timer);
  }, [text, isMotionAllowed]);

  useEffect(() => {
    // Animations paused while it runs: the interval ends here and the title is the real text (see the return below).
    if (!active || !isMotionAllowed) return;
    let iteration = 0;

    const interval = setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' ';
            if (ACCENTS.has(char.toLowerCase())) return char;
            if (i < Math.floor(iteration)) return text[i];
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join('')
      );

      iteration += 0.4;
      if (iteration >= text.length) {
        // The last tick above still had a scrambled letter: end on the real text.
        setDisplay(text);
        clearInterval(interval);
      }
    }, 28);

    return () => clearInterval(interval);
  }, [text, active, isMotionAllowed]);

  return isMotionAllowed ? display || text : text;
}

export default function NotFound() {
  const titleDisplay = useScramble('Página não encontrada');

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 text-center relative overflow-hidden select-none">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        }}
      />

      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(600px,100vw)] h-[300px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <m.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Glitch 404 */}
        <div className="relative mb-4 leading-none" aria-hidden="true">
          <span
            className="text-[22vw] md:text-[14rem] font-bold font-display leading-none text-white/[0.04] pointer-events-none"
          >
            404
          </span>
          <span
            className="absolute inset-0 flex items-center justify-center text-[22vw] md:text-[14rem] font-bold font-display leading-none text-white"
            style={{ animation: 'glitch-1 2.5s infinite' }}
          >
            404
          </span>
          <span
            className="absolute inset-0 flex items-center justify-center text-[22vw] md:text-[14rem] font-bold font-display leading-none text-emerald-400"
            style={{ animation: 'glitch-2 2.5s infinite', animationDelay: '0.15s' }}
          >
            404
          </span>
        </div>

        {/* Scramble title */}
        <h1 className="text-xl md:text-3xl font-bold text-white mb-4 tracking-tight font-mono" aria-label="Página não encontrada">
          {titleDisplay}
        </h1>

        <p className="text-vn-gray-light text-sm md:text-base font-light max-w-sm mb-10 leading-relaxed">
          A página que você procura não existe ou foi movida para outro endereço.
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2.5 bg-white text-black px-5 sm:px-8 py-3.5 rounded-full font-bold text-sm uppercase tracking-wide sm:tracking-widest hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>

        <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.3em] text-vn-gray-mid">
          &copy; {new Date().getFullYear()} VN One
        </p>
      </m.div>
    </div>
  );
}
