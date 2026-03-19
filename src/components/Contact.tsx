import { motion } from 'motion/react';
import { MessageCircle } from 'lucide-react';
import ContactForm from './ContactForm';

export default function Contact() {
  return (
    <section id="contato" className="py-32 px-6 md:px-12 bg-black text-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-4xl sm:text-6xl md:text-8xl font-bold tracking-tighter mb-10 font-display italic">
            Vamos criar <br/> <span className="not-italic text-zinc-400">algo juntos.</span>
          </h2>
          <p className="text-zinc-400 text-lg md:text-xl mb-12 max-w-md font-light leading-relaxed">
            Estou sempre aberto a discutir novos projetos, ideias criativas ou oportunidades de fazer parte da sua visão.
          </p>
          
          <div className="space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Email</p>
              <a href="mailto:contato@vnone.com.br" className="text-xl md:text-2xl font-light hover:text-zinc-400 transition-colors">contato@vnone.com.br</a>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">WhatsApp</p>
              <a 
                href="https://wa.me/5581987348633" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white transition-colors"
              >
                +55 (81) 98734-8633
                <MessageCircle className="w-5 h-5 text-green-500" />
              </a>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Localização</p>
              <p className="text-xl md:text-2xl font-light">Recife, Brasil & Remoto</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative z-10"
        >
          <ContactForm />
        </motion.div>
      </div>

      {/* Decorative circle */}
      <div className="absolute top-1/2 -right-64 w-[500px] h-[500px] bg-white/5 rounded-full z-0 blur-[100px]"></div>
    </section>
  );
}
