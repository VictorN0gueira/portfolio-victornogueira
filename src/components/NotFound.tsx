import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { m } from 'motion/react';
import { useScramble } from '../hooks/useScramble';

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
          <span className="text-[22vw] md:text-[14rem] font-bold font-display leading-none text-white/[0.04] pointer-events-none">
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
        <h1
          className="text-xl md:text-3xl font-bold text-white mb-4 tracking-tight font-mono"
          aria-label="Página não encontrada"
        >
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
