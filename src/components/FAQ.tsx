import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  {
    question: 'Meu negócio é pequeno demais para automação?',
    answer:
      'Não existe negócio pequeno demais para automação. Pequenas empresas muitas vezes são as que mais se beneficiam, pois o impacto proporcional é maior. Se você gasta mais de 5 horas por semana em tarefas repetitivas, já há espaço para ganhos reais.',
  },
  {
    question: 'Quanto tempo leva para ficar pronto?',
    answer:
      'Depende da complexidade, mas a maioria dos projetos tem primeiras entregas em 1 a 2 semanas. Trabalho em sprints semanais com validação contínua, para que você veja resultados rapidamente.',
  },
  {
    question: 'Preciso entender de tecnologia para contratar?',
    answer:
      'De jeito nenhum. Meu trabalho é traduzir suas necessidades de negócio em soluções técnicas. Você descreve o problema, eu cuido da implementação — e entrego documentação clara para que sua equipe opere sem depender de mim.',
  },
  {
    question: 'E se o sistema parar de funcionar depois?',
    answer:
      'Todo projeto inclui monitoramento, documentação e suporte pós-entrega. Se algo parar de funcionar, estou disponível para corrigir. Construo soluções pensando em estabilidade e manutenibilidade a longo prazo.',
  },
  {
    question: 'Como funciona a consulta gratuita?',
    answer:
      'É uma conversa de 30 minutos via video call ou WhatsApp. Você me conta seus processos atuais, eu identifico onde a automação gera mais valor e apresento um diagnóstico sem cobrar nada. Sem pressão, sem compromisso.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 md:py-32 px-6 md:px-12 bg-zinc-50">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-12 md:mb-16 text-center"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-4">
            Dúvidas frequentes
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter font-display italic">
            Perguntas
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={faq.question}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.07 }}
              className="bg-white rounded-2xl border border-zinc-100 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-5 md:px-6 py-5 text-left gap-4"
                aria-expanded={openIndex === i}
              >
                <span className="font-medium text-zinc-900 text-sm md:text-base">
                  {faq.question}
                </span>
                <span className="shrink-0 w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center transition-colors group-hover:bg-zinc-200">
                  {openIndex === i ? (
                    <Minus className="w-4 h-4 text-zinc-600" />
                  ) : (
                    <Plus className="w-4 h-4 text-zinc-600" />
                  )}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 md:px-6 pb-5 text-zinc-500 text-sm md:text-base leading-relaxed font-light">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
