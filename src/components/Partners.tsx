import { motion } from 'motion/react';

const PARTNERS = [
  {
    name: "Contador de Padarias",
    logo: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=CP%2FS%C3%8DMBOLO%20S%20FUNDO%201.png&version_id=null"
  },
  {
    name: "Contas IC",
    logo: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Contas%2FLogoContas.png&version_id=null"
  },
  {
    name: "Proplast",
    logo: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Proplast%2FLogo%20-%20Proplast.png&version_id=null"
  },
  {
    name: "Micael Santiago",
    logo: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Micael%20Santiago%2FMicaelsantiago.png&version_id=null"
  },
  {
    name: "Loja Karla Alvarés",
    logo: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Loja%20Karla%20Alvares%2FLogo%20-%20Loja%20Karla%20%C3%81lvares.png&version_id=null"
  },
  {
    name: "Mercadinho Irmão Cruz",
    logo: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Mercadinho%20Irm%C3%A3o%20Cruz%2FLogo.png&version_id=null"
  }
];

export default function Partners() {
  // Triple the items to ensure seamless loop
  const duplicatedPartners = [...PARTNERS, ...PARTNERS, ...PARTNERS, ...PARTNERS];

  return (
    <section className="py-32 bg-white overflow-hidden border-y border-zinc-100">
      <div className="max-w-7xl mx-auto px-6 md:px-12 mb-20">
        <div className="flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="overflow-hidden h-6 mb-4"
          >
            <motion.p 
              animate={{ y: [20, 0] }}
              transition={{ duration: 0.8, ease: "circOut" }}
              className="text-xs font-bold uppercase tracking-[0.4em] text-zinc-400"
            >
              Empresas que confiam
            </motion.p>
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-4xl font-bold tracking-tight text-zinc-900 font-display italic"
          >
            Parcerias Estratégicas
          </motion.h2>
        </div>
      </div>

      <div className="relative flex whitespace-nowrap overflow-hidden">
        {/* Mask for gradient edges */}
        <div className="absolute inset-y-0 left-0 w-32 md:w-64 bg-linear-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-32 md:w-64 bg-linear-to-l from-white to-transparent z-10 pointer-events-none" />

        <motion.div 
          className="flex whitespace-nowrap gap-16 md:gap-32 py-4 items-center"
          animate={{
            x: ["0%", "-50%"],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 30,
              ease: "linear",
            },
          }}
        >
          {duplicatedPartners.map((partner, index) => (
            <div 
              key={`${partner.name}-${index}`}
              className="group flex flex-col items-center justify-center shrink-0 w-40 md:w-56"
            >
              <div className="h-16 md:h-20 flex items-center justify-center mb-4 transition-transform duration-500 group-hover:scale-110">
                <img 
                  src={partner.logo} 
                  alt={partner.name}
                  className="max-h-full w-auto filter grayscale opacity-30 group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-700 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 group-hover:text-zinc-900 transition-colors duration-500">
                {partner.name}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
