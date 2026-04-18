import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, type PanInfo } from 'motion/react';
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  company: string;
  avatar: string;
  text: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Adailton Amancio',
    role: 'CEO',
    company: 'Contador de Padarias',
    avatar: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=CP%2FS%C3%8DMBOLO%20S%20FUNDO%201.png&version_id=null',
    text: 'O Victor automatizou todo o nosso processo de onboarding de clientes. O que antes levava 3 dias agora acontece em minutos. A integração com Notion e Google Drive ficou impecável.',
    rating: 5,
  },
  {
    id: 2,
    name: 'Karla Alvarés',
    role: 'Proprietária',
    company: 'Loja Karla Alvarés',
    avatar: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Loja%20Karla%20Alvares%2FLogo%20-%20Loja%20Karla%20%C3%81lvares.png&version_id=null',
    text: 'Meu link-in-bio e o sistema de captura de leads transformaram minha presença digital. As vendas pelo Instagram aumentaram muito depois das automações.',
    rating: 5,
  },
  {
    id: 3,
    name: 'Paulo Santos',
    role: 'CEO',
    company: 'Proplast',
    avatar: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Proplast%2FLogo%20-%20Proplast.png&version_id=null',
    text: 'A importação massiva de NF-e e o dashboard de consumo CRM nos deram uma visão que não tínhamos antes. Economia de horas semanais com processos que eram 100% manuais.',
    rating: 5,
  },
  {
    id: 4,
    name: 'Micael Santiago',
    role: 'Desenvolvedor',
    company: 'Micael Santiago',
    avatar: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Micael%20Santiago%2FMicaelsantiago.png&version_id=null',
    text: 'O fluxo de captura e disparo de leads no WhatsApp foi um game-changer. Profissionalismo e agilidade que eu nunca tinha visto em automação.',
    rating: 5,
  },
];

const SWIPE_THRESHOLD = 50;

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const paginate = useCallback(
    (dir: number) => {
      setDirection(dir);
      setCurrent((prev) => {
        if (dir === 1) return prev === testimonials.length - 1 ? 0 : prev + 1;
        return prev === 0 ? testimonials.length - 1 : prev - 1;
      });
    },
    []
  );

  const [isHovered, setIsHovered] = useState(false);

  // Auto-play
  useEffect(() => {
    if (isHovered) return;
    const timer = setInterval(() => paginate(1), 6000);
    return () => clearInterval(timer);
  }, [paginate, isHovered]);

  const t = testimonials[current];

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    if (Math.abs(offset.x) > SWIPE_THRESHOLD || Math.abs(velocity.x) > 300) {
      if (offset.x > 0) {
        paginate(-1);
      } else {
        paginate(1);
      }
    }
  };

  return (
    <section className="py-32 px-6 md:px-12 bg-zinc-950 text-white relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] -left-[15%] w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_rgba(168,85,247,0.06)_0%,_transparent_70%)] rounded-full" />
        <div className="absolute bottom-[10%] -right-[10%] w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,_rgba(6,182,212,0.06)_0%,_transparent_70%)] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-zinc-500 mb-4">
            Depoimentos
          </p>
          <h2 className="text-4xl md:text-6xl font-bold font-display italic tracking-tight">
            O que dizem sobre{' '}
            <span className="not-italic bg-clip-text text-transparent bg-linear-to-r from-white via-zinc-300 to-zinc-500">
              meu trabalho.
            </span>
          </h2>
        </motion.div>

        {/* Testimonial Card */}
        <div 
          className="max-w-4xl mx-auto"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative bg-white/3 border border-white/8 rounded-[2.5rem] p-10 md:p-16 min-h-[340px] flex flex-col justify-center overflow-hidden touch-pan-y">
            {/* Decorative quote */}
            <Quote className="absolute top-8 right-8 w-20 h-20 text-white/4 rotate-180" />

            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={t.id}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{ willChange: 'transform, opacity' }}
                className="flex flex-col items-center text-center"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.3}
                onDragEnd={handleDragEnd}
              >
                {/* Stars */}
                <div className="flex gap-1 mb-8">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>

                {/* Quote text */}
                <blockquote className="text-lg md:text-2xl font-light text-zinc-200 leading-relaxed mb-10 max-w-3xl italic select-none">
                  "{t.text}"
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/10 border border-white/10 overflow-hidden flex items-center justify-center p-2">
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      width={56}
                      height={56}
                    />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white text-sm">{t.name}</p>
                    <p className="text-zinc-500 text-xs">
                      {t.role} · {t.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6 mt-10">
            <button
              onClick={() => paginate(-1)}
              className="w-12 h-12 rounded-full border border-white/10 bg-white/3 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/6 transition-all active:scale-90"
              aria-label="Depoimento anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > current ? 1 : -1);
                    setCurrent(i);
                  }}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    i === current
                      ? 'w-8 bg-white'
                      : 'w-2 bg-white/20 hover:bg-white/40'
                  }`}
                  aria-label={`Depoimento ${i + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => paginate(1)}
              className="w-12 h-12 rounded-full border border-white/10 bg-white/3 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/6 transition-all active:scale-90"
              aria-label="Próximo depoimento"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
