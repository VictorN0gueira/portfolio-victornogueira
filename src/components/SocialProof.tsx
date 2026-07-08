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
  {
    // TODO: texto rascunho — confirmar/ajustar a fala real do Henrique
    id: 5,
    name: 'Henrique França',
    role: 'CEO',
    company: 'Henrique França',
    avatar: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Henrique%20Fran%C3%A7a%2Flogo-hf.png&version_id=null',
    text: 'O sistema de captura e qualificação de leads por IA mudou nosso atendimento. Os contatos chegam organizados no pipeline e o WhatsApp integrado agilizou todo o processo comercial.',
    rating: 5,
  },
  {
    // TODO: texto rascunho — confirmar/ajustar a fala real do Pierre
    id: 6,
    name: 'Pierre Jacquin',
    role: 'CEO',
    company: 'ShipSmart',
    avatar: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=ShipSmart%2FLogo.jpg&version_id=null',
    text: 'As automações que o Victor construiu para nossa operação logística eliminaram horas de trabalho manual toda semana. Entregas no prazo e muito profissionalismo do início ao fim.',
    rating: 5,
  },
];

const PARTNERS = [
  {
    name: "Contador de Padarias",
    logo: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=CP%2FS%C3%8DMBOLO%20S%20FUNDO%201.png&version_id=null"
  },
  {
    name: "Contas IC",
    logo: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Contas%2FLogoContas.png&version_id=null"
  },
  {
    name: "Proplast",
    logo: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Proplast%2FLogo%20-%20Proplast.png&version_id=null"
  },
  {
    name: "Micael Santiago",
    logo: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Micael%20Santiago%2FMicaelsantiago.png&version_id=null"
  },
  {
    name: "Loja Karla Alvarés",
    logo: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Loja%20Karla%20Alvares%2FLogo%20-%20Loja%20Karla%20%C3%81lvares.png&version_id=null"
  },
  {
    name: "Mercadinho Irmão Cruz",
    logo: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Mercadinho%20Irm%C3%A3o%20Cruz%2FLogo.png&version_id=null"
  },
  {
    name: "Criativa Marketing",
    logo: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Criativa%20Marketing%2Flogo.png&version_id=null"
  },
  {
    name: "ShipSmart",
    logo: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=ShipSmart%2FLogo.jpg&version_id=null"
  },
  {
    name: "Henrique França",
    logo: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Henrique%20Fran%C3%A7a%2Flogo-hf.png&version_id=null"
  }
];

const SWIPE_THRESHOLD = 50;

/* Prova social unificada: depoimentos (carousel) + logos de parceiros (marquee CSS)
   — substitui as antigas seções Testimonials e Partners */
export default function SocialProof() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const paginate = useCallback((dir: number) => {
    setDirection(dir);
    setCurrent((prev) => {
      if (dir === 1) return prev === testimonials.length - 1 ? 0 : prev + 1;
      return prev === 0 ? testimonials.length - 1 : prev - 1;
    });
  }, []);

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

  const duplicatedPartners = [...PARTNERS, ...PARTNERS];

  return (
    <section className="py-32 bg-zinc-950 text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10 px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-zinc-500 mb-4">
            Quem confia
          </p>
          <h2 className="text-4xl md:text-6xl font-bold font-display italic tracking-tight">
            O que dizem sobre{' '}
            <span className="not-italic bg-clip-text text-transparent bg-linear-to-r from-white via-zinc-300 to-zinc-500">
              meu trabalho.
            </span>
          </h2>
        </motion.div>

        {/* Carousel de depoimentos */}
        <div
          className="max-w-4xl mx-auto"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative bg-white/3 border border-white/8 rounded-[2.5rem] p-8 md:p-12 min-h-[280px] flex flex-col justify-center overflow-hidden touch-pan-y">
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
                className="flex flex-col items-center text-center"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.3}
                onDragEnd={handleDragEnd}
              >
                <div className="flex gap-1 mb-6">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                <blockquote className="text-lg md:text-2xl font-light text-zinc-200 leading-relaxed mb-8 max-w-3xl italic select-none">
                  "{t.text}"
                </blockquote>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white overflow-hidden flex items-center justify-center shrink-0">
                    <img
                      src={t.avatar}
                      alt={`Logo de ${t.company}`}
                      className="w-10 h-10 object-contain"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      width={40}
                      height={40}
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

          {/* Controles */}
          <div className="flex items-center justify-center gap-6 mt-10">
            <button
              onClick={() => paginate(-1)}
              className="w-12 h-12 rounded-full border border-white/10 bg-white/3 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/6 transition-all active:scale-90"
              aria-label="Depoimento anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > current ? 1 : -1);
                    setCurrent(i);
                  }}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    i === current ? 'w-8 bg-white' : 'w-2 bg-white/20 hover:bg-white/40'
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

      {/* Marquee de logos — CSS puro, compositor thread */}
      <div className="relative flex whitespace-nowrap overflow-hidden mt-24">
        <div className="absolute inset-y-0 left-0 w-32 md:w-64 bg-linear-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 md:w-64 bg-linear-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />

        <div className="marquee flex whitespace-nowrap gap-16 md:gap-32 py-4 items-center">
          {duplicatedPartners.map((partner, index) => (
            <div
              key={`${partner.name}-${index}`}
              className="group flex flex-col items-center justify-center shrink-0 w-40 md:w-56"
            >
              <div className="h-16 md:h-20 flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110">
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="max-h-full w-auto filter grayscale invert opacity-40 group-hover:opacity-100 group-hover:grayscale-0 group-hover:invert-0 transition-all duration-700 object-contain"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  width={160}
                  height={80}
                />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 group-hover:text-zinc-300 transition-colors duration-500">
                {partner.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
