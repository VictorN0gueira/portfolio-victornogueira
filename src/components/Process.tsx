import { motion } from 'motion/react';
import { Search, PenTool, Zap, Rocket } from 'lucide-react';

const steps = [
  {
    number: '01',
    title: 'Descoberta',
    description:
      'Mergulho nos seus processos atuais, identifique gargalos e mapeio oportunidades de automação com alto ROI.',
    icon: Search,
    color: '#8B5CF6',
  },
  {
    number: '02',
    title: 'Planejamento',
    description:
      'Desenho a arquitetura da solução: fluxos de automação, integrações de IA e interfaces necessárias.',
    icon: PenTool,
    color: '#3B82F6',
  },
  {
    number: '03',
    title: 'Execução',
    description:
      'Construo e testo cada fluxo em sprints rápidos. Entregas parciais para validação contínua com você.',
    icon: Zap,
    color: '#F59E0B',
  },
  {
    number: '04',
    title: 'Entrega & Suporte',
    description:
      'Deploy, monitoramento e documentação completa. Suporte pós-entrega para ajustes e escalabilidade.',
    icon: Rocket,
    color: '#10B981',
  },
];

export default function Process() {
  return (
    <section className="py-32 px-6 md:px-12 bg-zinc-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-24"
        >
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-zinc-400 mb-4">
            Metodologia
          </p>
          <h2 className="text-4xl md:text-6xl font-bold font-display italic tracking-tight mb-6">
            Como eu trabalho
          </h2>
          <p className="text-zinc-500 text-lg md:text-xl font-light max-w-2xl mx-auto">
            Processo estruturado para transformar suas operações manuais em{' '}
            <span className="text-black font-medium">
              máquinas de eficiência
            </span>
            .
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-8 md:gap-6 relative">
          {/* Connecting line - desktop only */}
          <div className="hidden md:block absolute top-24 left-[12.5%] right-[12.5%] h-px bg-linear-to-r from-transparent via-zinc-300 to-transparent" />

          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="group relative flex flex-col items-center text-center"
            >
              {/* Step number circle */}
              <div className="relative z-10 mb-8">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:shadow-xl relative overflow-hidden border border-zinc-100 bg-white"
                  style={{
                    boxShadow: `0 0 0 0 ${step.color}00`,
                  }}
                >
                  <step.icon
                    className="w-8 h-8 transition-all duration-500 group-hover:scale-110"
                    style={{ color: step.color }}
                  />

                  {/* Hover glow */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                    style={{ backgroundColor: step.color }}
                  />
                </div>

                {/* Number badge */}
                <div
                  className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg"
                  style={{ backgroundColor: step.color }}
                >
                  {step.number}
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold mb-3 font-display group-hover:text-zinc-700 transition-colors">
                {step.title}
              </h3>
              <p className="text-zinc-500 font-light text-sm leading-relaxed max-w-[260px]">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
