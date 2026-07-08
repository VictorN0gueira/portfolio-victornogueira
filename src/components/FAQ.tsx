import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'motion/react';
import { Plus, Minus } from 'lucide-react';
import AnimatedText from './AnimatedText';
import { faqs } from '../data/faqs';

const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const listItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "0px 0px -100px 0px" });

  return (
    <section ref={sectionRef} className="py-24 md:py-32 px-6 md:px-12 bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-12 md:mb-16 text-center"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-4">
            Dúvidas frequentes
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter font-display italic">
            <AnimatedText text="Perguntas" delay={0.2} />
          </h2>
        </motion.div>

        <motion.div
          className="space-y-3"
          variants={listContainer}
          initial="hidden"
          animate={isInView ? "show" : "hidden"}
        >
          {faqs.map((faq, i) => (
            <motion.div
              key={faq.question}
              variants={listItem}
              className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-5 md:px-6 py-5 text-left gap-4"
                aria-expanded={openIndex === i}
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm md:text-base">
                  {faq.question}
                </span>
                <span className="shrink-0 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center transition-colors group-hover:bg-zinc-200 dark:group-hover:bg-zinc-600">
                  {openIndex === i ? (
                    <Minus className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                  ) : (
                    <Plus className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
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
        </motion.div>
      </div>
    </section>
  );
}
