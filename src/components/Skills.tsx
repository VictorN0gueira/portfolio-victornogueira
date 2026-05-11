import { motion } from 'motion/react';
import { 
  Code2, 
  Cpu, 
  Globe, 
  Zap, 
  Terminal,
  Settings,
  Database,
  Cloud,
  Layers,
  Infinity
} from 'lucide-react';

const categories = [
  {
    title: 'Automação & IA',
    description: 'Especialista em orquestração de fluxos e agentes inteligentes.',
    skills: [
      {
        name: 'n8n',
        icon: (props: any) => (
          <svg width="24" height="24" viewBox="0 0 228 120" fill="currentColor" {...props}>
            <path fillRule="evenodd" clipRule="evenodd" d="M204 48C192.817 48 183.42 40.3514 180.756 30H153.248C147.382 30 142.376 34.241 141.412 40.0272L140.425 45.9456C139.489 51.5648 136.646 56.4554 132.626 60C136.646 63.5446 139.489 68.4352 140.425 74.0544L141.412 79.9728C142.376 85.759 147.382 90 153.248 90H156.756C159.42 79.6486 168.817 72 180 72C193.255 72 204 82.7452 204 96C204 109.255 193.255 120 180 120C168.817 120 159.42 112.351 156.756 102H153.248C141.516 102 131.504 93.5181 129.575 81.9456L128.588 76.0272C127.624 70.241 122.618 66 116.752 66H107.244C104.58 76.3514 95.183 84 84 84C72.817 84 63.4204 76.3514 60.7561 66H47.2439C44.5796 76.3514 35.183 84 24 84C10.7452 84 0 73.2548 0 60C0 46.7452 10.7452 36 24 36C35.183 36 44.5796 43.6486 47.2439 54H60.7561C63.4204 43.6486 72.817 36 84 36C95.183 36 104.58 43.6486 107.244 54H116.752C122.618 54 127.624 49.759 128.588 43.9728L129.575 38.0544C131.504 26.4819 141.516 18 153.248 18L180.756 18C183.42 7.64864 192.817 0 204 0C217.255 0 228 10.7452 228 24C228 37.2548 217.255 48 204 48ZM204 36C210.627 36 216 30.6274 216 24C216 17.3726 210.627 12 204 12C197.373 12 192 17.3726 192 24C192 30.6274 197.373 36 204 36ZM24 72C30.6274 72 36 66.6274 36 60C36 53.3726 30.6274 48 24 48C17.3726 48 12 53.3726 12 60C12 66.6274 17.3726 72 24 72ZM96 60C96 66.6274 90.6274 72 84 72C77.3726 72 72 66.6274 72 60C72 53.3726 77.3726 48 84 48C90.6274 48 96 53.3726 96 60ZM192 96C192 102.627 186.627 108 180 108C173.373 108 168 102.627 168 96C168 89.3726 173.373 84 180 84C186.627 84 192 89.3726 192 96Z" />
          </svg>
        ),
        color: '#FF6D5B'
      },
      {
        name: 'Make',
        icon: (props: any) => (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
            <rect x="2" y="7" width="4.5" height="12" rx="2" transform="rotate(-15 4.25 13)" />
            <rect x="8.5" y="5" width="4.5" height="14" rx="2" transform="rotate(-15 10.75 12)" />
            <rect x="15" y="3" width="4.5" height="16" rx="2" transform="rotate(-15 17.25 11)" />
          </svg>
        ),
        color: '#8500FF'
      },
      {
        name: 'AI Agents',
        icon: Cpu,
        color: '#8B5CF6'
      },
      {
        name: 'Google Apps Script',
        icon: (props: any) => (
          <svg width="24" height="24" viewBox="0 0 48 48" fill="none" {...props}>
            <path fill="#EA4335" d="M38,34.5c0,1.933-1.567,3.5-3.5,3.5H9c-1.933,0-3.5-1.567-3.5-3.5c0-1.933,1.567-3.5,3.5-3.5h25.5C36.433,31,38,32.567,38,34.5z"/>
            <path fill="#FBBC04" d="M35.617,33.013l-24.845-6.657c-1.874-0.502-3.003-2.427-2.508-4.301c0.501-1.877,2.441-2.992,4.316-2.49l24.85,6.66c1.871,0.502,3.001,2.427,2.502,4.3C39.431,32.399,37.492,33.513,35.617,33.013z"/>
            <path fill="#34A853" d="M34.724,31.427l-20.908-16.71c-1.554-1.243-1.782-3.518-0.509-5.06c1.246-1.55,3.52-1.777,5.067-0.529l20.908,16.7c1.55,1.242,1.783,3.514,0.513,5.064S36.273,32.668,34.724,31.427z"/>
            <path fill="#4285F4" d="M33.7,29.8l-10.4-25.5c-0.741-1.815,0.14-3.896,1.967-4.652c1.826-0.756,3.901,0.113,4.654,1.928l10.4,25.4c0.745,1.823-0.134,3.903-1.96,4.66C36.536,32.394,34.453,31.623,33.7,29.8z"/>
            <circle cx="10" cy="22.5" r="3" fill="#fff"/>
            <circle cx="14.5" cy="11.5" r="3" fill="#fff"/>
            <circle cx="26" cy="4.5" r="3" fill="#fff"/>
          </svg>
        ),
        color: '#1A73E8'
      }
    ]
  },
  {
    title: 'Desenvolvimento Frontend',
    description: 'Interfaces modernas, performáticas e altamente interativas.',
    skills: [
      {
        name: 'React',
        icon: Code2,
        color: '#61DAFB'
      },
      {
        name: 'TypeScript',
        icon: Terminal,
        color: '#3178C6'
      },
      {
        name: 'Tailwind CSS',
        icon: (props: any) => (
          <svg width="24" height="24" viewBox="0 0 54 33" fill="currentColor" {...props}>
            <path d="M27 0c-7.2 0-11.7 3.6-13.5 10.8 2.7-3.6 5.85-4.95 9.45-4.05 2.054.513 3.522 2.004 5.147 3.653C30.744 13.09 33.808 16.2 40.5 16.2c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.513-3.522-2.004-5.147-3.653C36.756 3.11 33.692 0 27 0zM13.5 16.2C6.3 16.2 1.8 19.8 0 27c2.7-3.6 5.85-4.95 9.45-4.05 2.054.514 3.522 2.004 5.147 3.653C17.244 29.29 20.308 32.4 27 32.4c7.2 0 11.7-3.6 13.5-10.8-2.7 3.6-5.85 4.95-9.45 4.05-2.054-.513-3.522-2.004-5.147-3.653C23.256 19.31 20.192 16.2 13.5 16.2z" />
          </svg>
        ),
        color: '#38BDF8'
      },
      {
        name: 'Vite',
        icon: Zap,
        color: '#646CFF'
      }
    ]
  },
  {
    title: 'Backend & Cloud',
    description: 'Serviços robustos e infraestrutura preparada para escala.',
    skills: [
      {
        name: 'Node.js',
        icon: Database,
        color: '#339933'
      },
      {
        name: 'Python',
        icon: (props: any) => (
          <svg width="24" height="24" viewBox="16 16 32 32" fill="currentColor" {...props}>
            <path d="M31.885 16c-8.124 0-7.617 3.523-7.617 3.523l.01 3.65h7.752v1.095H21.197S16 23.678 16 31.876c0 8.196 4.537 7.906 4.537 7.906h2.708v-3.804s-.146-4.537 4.465-4.537h7.688s4.32.07 4.32-4.175v-7.019S40.374 16 31.885 16zm-4.275 2.454a1.394 1.394 0 1 1 0 2.79 1.393 1.393 0 0 1-1.395-1.395c0-.771.624-1.395 1.395-1.395z" />
            <path d="M32.115 47.833c8.124 0 7.617-3.523 7.617-3.523l-.01-3.65H31.97v-1.095h10.832S48 40.155 48 31.958c0-8.197-4.537-7.906-4.537-7.906h-2.708v3.803s.146 4.537-4.465 4.537h-7.688s-4.32-.07-4.32 4.175v7.019s-.656 4.247 7.833 4.247zm4.275-2.454a1.393 1.393 0 0 1-1.395-1.395 1.394 1.394 0 1 1 1.395 1.395z" />
          </svg>
        ),
        color: '#3776AB'
      },
      {
        name: 'Google Cloud',
        icon: (props: any) => (
          <svg width="24" height="24" viewBox="0 -25 256 256" fill="currentColor" {...props}>
            <path fill="#EA4335" d="m170.252 56.819 22.253-22.253 1.483-9.37C153.437-11.677 88.976-7.496 52.42 33.92 42.267 45.423 34.734 59.764 30.717 74.573l7.97-1.123 44.505-7.34 3.436-3.513c19.797-21.742 53.27-24.667 76.128-6.168l7.496.39Z"/>
            <path fill="#4285F4" d="M224.205 73.918a100.249 100.249 0 0 0-30.217-48.722l-31.232 31.232a55.515 55.515 0 0 1 20.379 44.037v5.544c15.35 0 27.797 12.445 27.797 27.796 0 15.352-12.446 27.485-27.797 27.485h-55.671l-5.466 5.934v33.34l5.466 5.231h55.67c39.93.311 72.553-31.494 72.864-71.424a72.303 72.303 0 0 0-31.793-60.453"/>
            <path fill="#34A853" d="M71.87 205.796h55.593V161.29H71.87a27.275 27.275 0 0 1-11.399-2.498l-7.887 2.42-22.409 22.253-1.952 7.574c12.567 9.489 27.9 14.825 43.647 14.757"/>
            <path fill="#FBBC05" d="M71.87 61.425C31.94 61.664-.237 94.228.001 134.159a72.301 72.301 0 0 0 28.222 56.88l32.248-32.246c-13.99-6.322-20.208-22.786-13.887-36.776 6.32-13.99 22.786-20.208 36.775-13.888a27.796 27.796 0 0 1 13.887 13.888l32.248-32.248A72.224 72.224 0 0 0 71.87 61.425"/>
          </svg>
        ),
        color: '#4285F4'
      }
    ]
  }
];

export default function Skills() {
  return (
    <section id="habilidades" className="py-32 px-6 md:px-12 bg-brand-white relative overflow-hidden">
      {/* Background purely decorative */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_0,transparent_70%)]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-24"
        >
          <h2 className="text-4xl md:text-6xl font-bold font-display italic mb-6">Stack Tecnológica</h2>
          <p className="text-zinc-500 text-lg md:text-xl font-light max-w-2xl mx-auto">
            Soluções completas, da orquestração de fluxos à entrega de interfaces de alta performance.
          </p>
        </motion.div>

        <div className="space-y-32">
          {categories.map((category, catIndex) => (
            <div key={category.title} className="space-y-12">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: catIndex * 0.1 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-l-4 border-black pl-6"
              >
                <div className="max-w-xl">
                  <h3 className="text-2xl md:text-3xl font-bold font-display uppercase tracking-tight mb-2">
                    {category.title}
                  </h3>
                  <p className="text-zinc-500 font-light italic">
                    {category.description}
                  </p>
                </div>
                <div className="text-zinc-200 text-6xl font-bold font-display opacity-50 hidden md:block">
                  0{catIndex + 1}
                </div>
              </motion.div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {category.skills.map((skill, index) => (
                  <motion.div
                    key={skill.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                    whileHover={{ y: -5 }}
                    className="group relative bg-white border border-zinc-100 p-8 rounded-3xl transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:border-zinc-200"
                  >
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div 
                        className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 relative overflow-hidden"
                        style={{ backgroundColor: `${skill.color}10` }}
                      >
                        <skill.icon 
                          className="w-8 h-8 transition-all duration-500 group-hover:scale-110" 
                          style={{ color: skill.color }}
                        />
                        
                        {/* Hover glow */}
                        <div 
                          className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                          style={{ backgroundColor: skill.color }}
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="font-bold text-zinc-900 group-hover:text-black transition-colors">
                          {skill.name}
                        </h4>
                      </div>
                    </div>

                    {/* Decorative corner accent */}
                    <div 
                      className="absolute top-4 right-4 w-1.5 h-1.5 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300"
                      style={{ backgroundColor: skill.color }}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
