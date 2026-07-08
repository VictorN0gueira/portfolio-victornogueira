import { useRef } from 'react';
import { motion, useInView } from 'motion/react';
import AnimatedText from './AnimatedText';

const categoryHeader = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.8 } },
};
const skillsContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const skillCard = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
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
        name: 'Zapier',
        icon: (props: any) => (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M12 0a1.44 1.44 0 0 0-1.44 1.44v7.04L5.6 3.52a1.44 1.44 0 1 0-2.04 2.04l4.96 4.96H1.44a1.44 1.44 0 0 0 0 2.88h7.04l-4.96 4.96a1.44 1.44 0 1 0 2.04 2.04l4.96-4.96v7.12a1.44 1.44 0 0 0 2.88 0v-7.12l4.96 4.96a1.44 1.44 0 1 0 2.04-2.04l-4.96-4.96h7.12a1.44 1.44 0 0 0 0-2.88h-7.12l4.96-4.96a1.44 1.44 0 1 0-2.04-2.04l-4.96 4.96V1.44A1.44 1.44 0 0 0 12 0z" />
          </svg>
        ),
        color: '#FF4A00'
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
        name: 'Vue 3',
        icon: (props: any) => (
          <svg width="24" height="24" viewBox="0 0 261.76 226.69" fill="currentColor" {...props}>
            <path d="M161.096.001l-30.224 52.35L100.647.002H0L130.872 226.69 261.76.001z" fill="#41B883" />
            <path d="M161.096.001l-30.224 52.35L100.647.002H52.346l78.526 136.01L209.398.001z" fill="#34495E" />
          </svg>
        ),
        color: '#42B883'
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
        name: 'Docker',
        icon: (props: any) => (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
            <path d="M13.983 11.078h2.119a.186.186 0 0 0 .186-.186V9.006a.186.186 0 0 0-.186-.186h-2.119a.186.186 0 0 0-.187.186v1.886c0 .103.084.186.187.186Zm-2.954-5.43h2.118a.186.186 0 0 0 .187-.185V3.576a.186.186 0 0 0-.187-.186h-2.118a.186.186 0 0 0-.187.186v1.886c0 .103.084.185.187.185Zm0 2.716h2.118a.187.187 0 0 0 .187-.186V6.292a.187.187 0 0 0-.187-.187h-2.118a.187.187 0 0 0-.187.187v1.886c0 .103.084.186.187.186Zm-2.93 0h2.12a.186.186 0 0 0 .186-.186V6.292a.186.186 0 0 0-.187-.187H8.1a.186.186 0 0 0-.185.187v1.886c0 .103.083.186.185.186Zm-2.964 0h2.119a.186.186 0 0 0 .185-.186V6.292a.186.186 0 0 0-.185-.187H5.136a.186.186 0 0 0-.186.187v1.886c0 .103.084.186.186.186Zm5.893 2.715h2.118a.186.186 0 0 0 .187-.186V9.006a.186.186 0 0 0-.187-.186h-2.118a.186.186 0 0 0-.187.186v1.886c0 .103.084.186.187.186Zm-2.93 0h2.12a.186.186 0 0 0 .186-.186V9.006a.186.186 0 0 0-.186-.186h-2.12a.186.186 0 0 0-.184.186v1.886c0 .103.083.186.185.186Zm-2.964 0h2.119a.186.186 0 0 0 .185-.186V9.006a.186.186 0 0 0-.185-.186H5.136a.186.186 0 0 0-.186.186v1.886c0 .103.084.186.186.186Zm-2.92 0h2.12a.186.186 0 0 0 .184-.186V9.006a.186.186 0 0 0-.184-.186H2.216a.186.186 0 0 0-.186.186v1.886c0 .103.084.186.186.186ZM23.078 9.836c-.313-.18-.665-.27-1.02-.27-.254 0-.504.05-.737.148a3.053 3.053 0 0 0-.615-1.108l-.124-.14-.142.122a2.54 2.54 0 0 0-.752 1.237c-.107.414-.12.847-.04 1.262-1.014.585-2.457.73-2.928.735H.782a.783.783 0 0 0-.782.783c.009 1.457.286 2.9.818 4.257a5.208 5.208 0 0 0 2.377 2.783c1.173.656 3.078 1.03 5.222 1.03 1.073 0 2.158-.093 3.222-.279a12.63 12.63 0 0 0 3.98-1.508 10.304 10.304 0 0 0 2.643-2.2 12.602 12.602 0 0 0 2.336-4.306c.07.002.14.002.207.002.82 0 1.578-.316 2.142-.89l.112-.116-.102-.124a2.622 2.622 0 0 0-.88-.596Z" />
          </svg>
        ),
        color: '#2496ED'
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
      },
      {
        name: 'Supabase',
        icon: (props: any) => (
          <svg width="24" height="24" viewBox="0 0 109 113" fill="none" {...props}>
            <path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.251h45.22c8.19 0 12.758 9.46 7.665 15.874L63.708 110.284Z" fill="url(#supabase-a)" />
            <path d="M63.708 110.284c-2.86 3.601-8.658 1.628-8.727-2.97l-1.007-67.251h45.22c8.19 0 12.758 9.46 7.665 15.874L63.708 110.284Z" fill="url(#supabase-b)" fillOpacity=".2" />
            <path d="M45.317 2.071c2.86-3.601 8.657-1.628 8.726 2.97l.442 67.251H9.83c-8.19 0-12.759-9.46-7.665-15.875L45.317 2.072Z" fill="#3ECF8E" />
            <defs>
              <linearGradient id="supabase-a" x1="53.974" y1="54.974" x2="94.163" y2="71.829" gradientUnits="userSpaceOnUse">
                <stop stopColor="#249361" />
                <stop offset="1" stopColor="#3ECF8E" />
              </linearGradient>
              <linearGradient id="supabase-b" x1="36.156" y1="30.578" x2="54.484" y2="65.081" gradientUnits="userSpaceOnUse">
                <stop />
                <stop offset="1" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        ),
        color: '#3ECF8E'
      }
    ]
  }
];

export default function Skills() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "0px 0px -100px 0px" });

  return (
    <section id="habilidades" className="py-32 px-6 md:px-12 bg-brand-white relative overflow-hidden">
      {/* Background purely decorative */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_0,transparent_70%)]" />
      </div>

      <div ref={sectionRef} className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-24"
        >
          <h2 className="text-4xl md:text-6xl font-bold font-display italic mb-6">
            <AnimatedText text="Stack Tecnológica" delay={0.1} />
          </h2>
          <p className="text-zinc-500 text-lg md:text-xl font-light max-w-2xl mx-auto">
            Soluções completas, da orquestração de fluxos à entrega de interfaces de alta performance.
          </p>
        </motion.div>

        <div className="space-y-32">
          {categories.map((category, catIndex) => (
            <div key={category.title} className="space-y-12">
              <motion.div
                variants={categoryHeader}
                initial="hidden"
                animate={isInView ? "show" : "hidden"}
                transition={{ delay: catIndex * 0.1 }}
                className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-l-4 border-black dark:border-white pl-6"
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

              <motion.div
                className="grid grid-cols-2 md:grid-cols-4 gap-6"
                variants={skillsContainer}
                initial="hidden"
                animate={isInView ? "show" : "hidden"}
              >
                {category.skills.map((skill) => (
                  <motion.div
                    key={skill.name}
                    variants={skillCard}
                    whileHover={{ y: -5 }}
                    className="group relative bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 p-8 rounded-3xl transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:border-zinc-200 dark:hover:border-zinc-600"
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
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-black dark:group-hover:text-white transition-colors">
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
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
