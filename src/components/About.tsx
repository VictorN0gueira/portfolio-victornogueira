import { motion } from 'motion/react';
import { Download } from 'lucide-react';

const CV_URL = "https://minio.vnone.com.br/api/v1/buckets/victornogueira/objects/download?preview=true&prefix=portfolio%2FCV%20-%20Jo%C3%A3o%20Victor.pdf&version_id=null";

const specialties = [
  { id: '01', title: 'Automação de Processos', desc: 'Transformando processos complexos em fluxos automáticos' },
  { id: '02', title: 'Inteligência Artificial', desc: 'Implementação de LLMs e agentes para negócios' },
  { id: '03', title: 'Desenvolvimento Web', desc: 'Interfaces modernas, rápidas e focadas em conversão' },
  { id: '04', title: 'Google Apps Scripts', desc: 'Automação de ecossistema Google e planilhas' }
];

export default function About() {
  return (
    <section id="sobre" className="py-32 px-6 md:px-12 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-24 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h3 className="text-4xl md:text-6xl font-bold tracking-tight mb-8 font-display italic">Sobre mim</h3>
          <div className="space-y-8 text-lg md:text-xl text-zinc-500 leading-relaxed font-light mb-12">
            <p>
              Especialista em transformar processos manuais e complexos em fluxos <span className="text-black font-medium">automatizados e inteligentes</span>. 
            </p>
            <p>
              Foco total em <span className="text-black font-medium">N8N, Inteligência Artificial e Desenvolvimento Web</span> para escalar operações de negócios.
            </p>
          </div>

          <a 
            href={CV_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-zinc-100 text-black px-8 py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-black hover:text-white transition-all shadow-sm hover:shadow-xl"
          >
            <Download className="w-4 h-4" />
            Baixar Currículo
          </a>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <div className="bg-[#F8F9FA] p-10 md:p-16 rounded-[3rem] border border-zinc-100 relative z-10">
            <h4 className="text-2xl font-bold mb-10 font-display">Minhas Especialidades</h4>
            <div className="space-y-8">
              {specialties.map((skill) => (
                <div key={skill.id} className="group flex items-start gap-6 border-b border-zinc-200 pb-8 last:border-0 last:pb-0">
                  <span className="text-zinc-300 font-mono text-lg transition-colors group-hover:text-black">{skill.id}</span>
                  <div>
                    <h5 className="font-bold text-zinc-900 group-hover:text-black transition-colors mb-1">{skill.title}</h5>
                    <p className="text-sm text-zinc-400">{skill.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Decorative mesh gradient background */}
          <div className="absolute -inset-10 bg-linear-to-br from-zinc-100 to-white z-0 rounded-full blur-3xl opacity-50"></div>
        </motion.div>
      </div>
    </section>
  );
}
