import { motion } from 'motion/react';
import { Clock, Zap, Building2, TrendingUp } from 'lucide-react';

const STATS = [
  {
    label: "Horas Economizadas / Mês",
    value: "500h+",
    icon: Clock,
    description: "Redução drástica em tarefas manuais repetitiveis"
  },
  {
    label: "Fluxos de Automação Ativos",
    value: "100+",
    icon: Zap,
    description: "Workflows inteligentes rodando 24/7"
  },
  {
    label: "Empresas Impactadas",
    value: "10+",
    icon: Building2,
    description: "De pequenos negócios a indústrias"
  },
  {
    label: "Aumento em Eficiência",
    value: "85%",
    icon: TrendingUp,
    description: "Melhoria média nos processos internos"
  }
];

export default function Stats() {
  return (
    <section className="py-24 bg-zinc-950 text-white overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-white/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {STATS.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.8 }}
              className="flex flex-col items-center text-center group"
            >
              <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 transition-all duration-500 group-hover:bg-white/10 group-hover:border-white/20 group-hover:-translate-y-2">
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <motion.span 
                initial={{ scale: 0.5, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 100 }}
                className="text-4xl md:text-5xl font-bold tracking-tighter mb-2"
              >
                {stat.value}
              </motion.span>
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-3">
                {stat.label}
              </span>
              <p className="text-sm text-zinc-500 max-w-[180px] leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                {stat.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
