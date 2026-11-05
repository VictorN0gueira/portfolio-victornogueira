export interface Service {
  /** Âncora do serviço na página de serviços: `/servicos#<slug>`. Não muda com o nome exibido. */
  slug: string;
  nome: string;
  categoria: 'Automação' | 'Inteligência Artificial' | 'Desenvolvimento Web';
  descricao: string;
  inclui: string[];
  prazo: string;
}

// A combo has no discount field on purpose: the old percentages (10, 12 and 15) were never verified and the owner
// took them out. Bringing a checked discount back means adding the field here, drawing it in ComboCard and editing
// the guard in data.test.ts that keeps every combo without one.
export interface ServiceCombo {
  nome: string;
  composicao: string;
  descricao: string;
}

/** Opções de alto nível para o dropdown de interesse no formulário de contato */
export const serviceOptions: string[] = [
  'Automação de processos',
  'Agente de IA',
  'Site ou landing page',
  'Sistema web sob medida',
  'Combo de site e automação',
  'Ainda não sei, quero orientação',
];

export const services: Service[] = [
  {
    slug: 'automacao-essencial',
    nome: 'Automação Essencial',
    categoria: 'Automação',
    descricao:
      'Um processo manual do seu negócio vira um fluxo automático, rodando sozinho todos os dias.',
    inclui: [
      '1 fluxo de automação completo',
      'Integração entre seus sistemas atuais',
      'Hospedagem e monitoramento',
      'Documentação de uso',
    ],
    prazo: 'cerca de 1 semana',
  },
  {
    slug: 'automacao-avancada',
    nome: 'Automação Avançada',
    categoria: 'Automação',
    descricao:
      'Operações inteiras automatizadas, com IA onde faz diferença.',
    inclui: [
      'Múltiplos fluxos integrados',
      'Lógica condicional complexa',
      'Componente de IA quando necessário',
      'Monitoramento e alertas',
    ],
    prazo: '2 a 3 semanas',
  },
  {
    slug: 'super-agente',
    nome: 'Super Agente',
    categoria: 'Inteligência Artificial',
    descricao:
      'Uma IA que pega o serviço e entrega pronto: lembra do que você pediu, consulta os documentos da empresa e age nos sistemas que você já usa.',
    inclui: [
      'Modelo de IA escolhido com você, trocável depois',
      'Memória de clientes e do que foi pedido',
      'Conhecimento sobre contratos, manuais e políticas da empresa',
      'Ações nos seus sistemas e canais como o WhatsApp',
    ],
    prazo: 'definido na conversa de 30 minutos',
  },
  {
    slug: 'agente-de-ia-sob-medida',
    nome: 'Agente de IA Sob Medida',
    categoria: 'Inteligência Artificial',
    descricao:
      'Um agente que atende, qualifica e responde pelos seus canais, treinado no contexto do seu negócio.',
    inclui: [
      'Escopo do agente definido com você',
      'Integração com 1 canal (WhatsApp ou site)',
      'Base de conhecimento do seu negócio',
      'Ajustes de comportamento pós-entrega',
    ],
    prazo: '2 a 3 semanas',
  },
  {
    slug: 'landing-page-ou-site',
    nome: 'Landing Page ou Site',
    categoria: 'Desenvolvimento Web',
    descricao:
      'Site rápido, pensado para o visitante virar contato.',
    inclui: [
      'Funciona bem no celular e no computador',
      'Até 5 páginas',
      'SEO técnico configurado',
      'Publicação no ar inclusa',
    ],
    prazo: 'cerca de 1 semana',
  },
  {
    slug: 'sistema-web-sob-medida',
    nome: 'Sistema Web Sob Medida',
    categoria: 'Desenvolvimento Web',
    descricao:
      'Aplicação completa para o seu processo, do zero ao ar.',
    inclui: [
      'Telas e regras do seu processo',
      'Autenticação de usuários',
      'Banco de dados estruturado',
      'Publicação e ambiente de produção',
    ],
    prazo: '1 a 2 meses',
  },
];

export const combos: ServiceCombo[] = [
  {
    nome: 'Presença + Automação',
    composicao: 'Landing Page + Automação Essencial',
    descricao: 'Site no ar e o primeiro processo automatizado num pacote só.',
  },
  {
    nome: 'Automação + IA',
    composicao: 'Automação Avançada + Agente de IA',
    descricao: 'Operação automatizada com um agente de IA na frente.',
  },
  {
    nome: 'Sistema + Automação',
    composicao: 'Sistema Web + Automação Avançada',
    descricao: 'Sistema sob medida já com os fluxos integrados.',
  },
];
