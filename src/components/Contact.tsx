import { useId } from 'react';
import { m } from 'motion/react';
import { MessageCircle } from 'lucide-react';
import { ContactForm } from './ContactForm';
import { NewTabHint } from './ui/NewTabHint';

interface ContactProps {
  /** Mensagem vinda do ROICalculator para pré-preencher o formulário */
  prefillMessage?: string;
}

export default function Contact({ prefillMessage }: ContactProps) {
  const newTabHintId = useId();

  return (
    <section id="contato" className="py-32 px-6 md:px-12 bg-black text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
        <m.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl sm:text-6xl md:text-8xl font-bold tracking-tighter mb-10 font-display italic">
            Conta o que <br/> <span className="not-italic text-vn-gray-light">você precisa.</span>
          </h2>
          <p className="text-zinc-400 text-lg md:text-xl mb-12 max-w-md font-light leading-relaxed">
            A gente conversa sobre o seu projeto e mostra por onde começar.
          </p>
          
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-vn-gray-light mb-2">E-mail</p>
              <a href="mailto:contato@vnone.com.br" className="text-xl md:text-2xl font-light hover:text-zinc-400 transition-colors">contato@vnone.com.br</a>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-vn-gray-light mb-2">WhatsApp</p>
              <NewTabHint id={newTabHintId} />
              <a
                href="https://wa.me/5581984451243"
                target="_blank"
                rel="noopener noreferrer"
                aria-describedby={newTabHintId}
                className="flex items-center gap-2 text-xl md:text-2xl font-light text-zinc-400 hover:text-white transition-colors"
              >
                +55 (81) 98445-1243
                <MessageCircle className="w-6 h-6 text-green-500" />
              </a>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-vn-gray-light mb-2">Localização</p>
              <p className="text-xl md:text-2xl font-light">Recife e remoto</p>
            </div>
          </div>
        </m.div>

        <m.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative z-10"
        >
          <ContactForm initialMessage={prefillMessage} />
        </m.div>
      </div>

      {/* Decorative circle */}
      <div className="absolute top-1/2 -right-64 w-[500px] h-[500px] bg-white/5 rounded-full z-0 blur-[100px]"></div>
    </section>
  );
}
