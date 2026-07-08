export interface Service {
  nome: string;
  categoria: 'Automação' | 'Inteligência Artificial' | 'Desenvolvimento Web';
  descricao: string;
  inclui: string[];
  prazo: string;
}

export interface ServiceCombo {
  nome: string;
  composicao: string;
  desconto: string;
  descricao: string;
}

/** Opções de alto nível para o dropdown de interesse no formulário de contato */
export const serviceOptions: string[] = [
  'Automação de Processos',
  'Agente de IA / Chatbot',
  'Site / Landing Page',
  'Sistema Web sob medida',
  'Combo (Site + Automação)',
  'Ainda não sei / Quero orientação',
];

export const services: Service[] = [
  {
    nome: 'Automação Essencial',
    categoria: 'Automação',
    descricao:
      'Um processo manual do seu negócio transformado em fluxo automático — rodando sozinho, todos os dias.',
    inclui: [
      '1 fluxo de automação completo',
      'Integração entre seus sistemas atuais',
      'Hospedagem e monitoramento',
      'Documentação de uso',
    ],
    prazo: '~1 semana',
  },
  {
    nome: 'Automação Avançada',
    categoria: 'Automação',
    descricao:
      'Operações inteiras orquestradas: múltiplos fluxos integrados, lógica complexa e IA onde faz diferença.',
    inclui: [
      'Múltiplos fluxos integrados',
      'Lógica condicional complexa',
      'Componente de IA quando necessário',
      'Monitoramento e alertas',
    ],
    prazo: '2 a 3 semanas',
  },
  {
    nome: 'Agente de IA Sob Medida',
    categoria: 'Inteligência Artificial',
    descricao:
      'Um agente que atende, qualifica e responde pelos seus canais — treinado no contexto do seu negócio.',
    inclui: [
      'Chatbot ou agente customizado',
      'Integração com 1 canal (WhatsApp ou site)',
      'Base de conhecimento do seu negócio',
      'Ajustes de comportamento pós-entrega',
    ],
    prazo: '2 a 3 semanas',
  },
  {
    nome: 'Landing Page / Site',
    categoria: 'Desenvolvimento Web',
    descricao:
      'Presença digital rápida, moderna e focada em conversão — até 5 páginas.',
    inclui: [
      'React + Tailwind, design responsivo',
      'Até 5 páginas',
      'SEO técnico configurado',
      'Deploy incluso',
    ],
    prazo: '~1 semana',
  },
  {
    nome: 'Landing Page Complexa',
    categoria: 'Desenvolvimento Web',
    descricao:
      'Páginas com animações, integrações e seções avançadas para produtos que exigem mais.',
    inclui: [
      'Animações e interações avançadas',
      'Integrações com APIs e formulários',
      'Seções sob medida',
      'Performance otimizada',
    ],
    prazo: '1 a 2 semanas',
  },
  {
    nome: 'Sistema Web Sob Medida',
    categoria: 'Desenvolvimento Web',
    descricao:
      'Aplicação completa para o seu processo: backend, frontend, login e deploy — do zero ao ar.',
    inclui: [
      'Backend + frontend completos',
      'Autenticação de usuários',
      'Banco de dados estruturado',
      'Deploy e ambiente de produção',
    ],
    prazo: '1 a 2 meses',
  },
];

export const combos: ServiceCombo[] = [
  {
    nome: 'Presença + Automação',
    composicao: 'Landing Page + Automação Essencial',
    desconto: '10% off',
    descricao: 'Site no ar e o primeiro processo automatizado num pacote só.',
  },
  {
    nome: 'Automação + IA',
    composicao: 'Automação Avançada + Agente de IA',
    desconto: '12% off',
    descricao: 'Operação orquestrada com um agente inteligente na frente.',
  },
  {
    nome: 'Sistema + Automação',
    composicao: 'Sistema Web + Automação Avançada',
    desconto: '15% off',
    descricao: 'A solução completa: sistema sob medida com fluxos integrados.',
  },
];
