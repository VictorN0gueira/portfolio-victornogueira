import { useId, useRef, useState } from 'react';
import { m, useInView } from 'motion/react';
import { Plus, Minus } from 'lucide-react';
import { AnimatedText } from './AnimatedText';
import { faqs } from '../data/faqs';
import { EASE_OUT } from '../lib/motion';

const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const listItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

interface FaqPanelProps {
  id: string;
  labelledBy: string;
  isOpen: boolean;
  children: string;
}

/**
 * The answer is always in the page, so aria-controls of its question never points at nothing. While it is collapsed it
 * carries the hidden attribute (display none: not read, not tabbable). The attribute is taken off as soon as it opens and
 * put back only when the closing animation has ended, so the height still animates both ways.
 */
function FaqPanel({ id, labelledBy, isOpen, children }: FaqPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <m.div
      id={id}
      role="region"
      aria-labelledby={labelledBy}
      hidden={!isOpen && isCollapsed}
      initial={false}
      animate={isOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
      transition={{ duration: 0.28, ease: EASE_OUT }}
      onAnimationComplete={() => setIsCollapsed(!isOpen)}
      className="overflow-hidden"
    >
      <p className="px-5 md:px-6 pb-5 text-vn-gray-dark text-sm md:text-base leading-relaxed font-light">{children}</p>
    </m.div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const baseId = useId();
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "0px 0px -100px 0px" });

  return (
    <section ref={sectionRef} className="py-24 md:py-32 px-6 md:px-12 bg-zinc-50 dark:bg-zinc-900">
      <div className="max-w-3xl mx-auto">
        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="mb-12 md:mb-16 text-center"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-vn-gray-dark mb-4">
            Dúvidas frequentes
          </p>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter font-display italic">
            <AnimatedText text="Perguntas" delay={0.2} />
          </h2>
        </m.div>

        <m.div
          className="space-y-3"
          variants={listContainer}
          initial="hidden"
          animate={isInView ? "show" : "hidden"}
        >
          {faqs.map((faq, i) => (
            <m.div
              key={faq.id}
              variants={listItem}
              className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700 overflow-hidden"
            >
              <button
                type="button"
                id={`${baseId}-question-${faq.id}`}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-5 md:px-6 py-5 text-left gap-4"
                aria-expanded={openIndex === i}
                aria-controls={`${baseId}-answer-${faq.id}`}
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

              <FaqPanel
                id={`${baseId}-answer-${faq.id}`}
                labelledBy={`${baseId}-question-${faq.id}`}
                isOpen={openIndex === i}
              >
                {faq.answer}
              </FaqPanel>
            </m.div>
          ))}
        </m.div>
      </div>
    </section>
  );
}
