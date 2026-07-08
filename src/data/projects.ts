export interface Project {
  id: number;
  title: string;
  category: string;
  description: string;
  image: string;
  link: string;
  tags: string[];
  gallery?: string[];
  type?: 'personal' | 'client';
  impact?: { label: string; value: string }[];
}

export const projects: Project[] = [
  {
    id: 5,
    title: "Trocô",
    category: "Gestão Financeira + IA",
    description: "Gestão Inteligente via WhatsApp com automação e Supabase. Processamento automático de áudios e notas fiscais.",
    image: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2Fportfolio%2Ftroco%2FLogin-Troco.png&version_id=null",
    link: '#',
    tags: ["Automação de Fluxos", "Supabase", "API's Financeiras", "Evolution API"],
    type: 'client',
    impact: [{ label: "Operação", value: "24/7 automática" }],
    gallery: [
      "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2Fportfolio%2Ftroco%2FDashboard-Troco.png&version_id=null",
      "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2Fportfolio%2Ftroco%2FLembretes-Troco.png&version_id=null",
      "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2Fportfolio%2Ftroco%2FInvestimentos-Troco.png&version_id=null"
    ]
  },

  {
    id: 7,
    title: 'Dashboard de Consumo CRM',
    category: 'BI / Dashboards de Vendas',
    description: 'Centralização de dados de consumo e histórico de compras com gráficos dinâmicos e lista de produtos, integrando APIs de CRM via Webhooks.',
    image: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2FProplast%2Fsite1-resumocliente.png&version_id=null',
    tags: ['CRM API', 'Automação de Fluxos', 'Webhook', 'Data Visualization'],
    link: '#',
    type: 'client',
    impact: [{ label: "Visibilidade", value: "100% tempo real" }],
    gallery: [
      'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2FProplast%2Fsite2-resumocliente.png&version_id=null',
      'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2FProplast%2Ffluxo-resumocliente.png&version_id=null'
    ]
  },
  {
    id: 8,
    title: 'Importação Massiva de NF-e',
    category: 'Logística / Integração ERP',
    description: 'Sincronização de milhares de Notas Fiscais/dia da Tiny API para Supabase, com monitoramento de status e comparativos automatizados.',
    image: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2FProplast%2Ffluxo-importacaodevendas.png&version_id=null',
    tags: ['Tiny API', 'Supabase', 'Automação de Fluxos', 'Google Sheets'],
    link: '#',
    type: 'client',
    impact: [{ label: "Volume", value: "Milhares de NFs/dia" }],
  },

  {
    id: 11,
    title: 'Diagnóstico Empresarial',
    category: 'Captura de Leads / Consultoria',
    description: 'Sistema completo de captura de leads com WhatsApp integrado, formulário inteligente, pipeline visual (Kanban), qualificação por IA e gestão de oportunidades.',
    image: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Henrique%20Fran%C3%A7a%2FProjetos%2Fempresarial-insight%2FLandingpage.png&version_id=null',
    tags: ['WhatsApp API', 'IA', 'Pipeline', 'Lead Capture'],
    link: '#',
    type: 'client',
    impact: [{ label: "Qualificação", value: "IA automática" }],
    gallery: [
      'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Henrique%20Fran%C3%A7a%2FProjetos%2Fempresarial-insight%2Flogin.png&version_id=null',
      'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Henrique%20Fran%C3%A7a%2FProjetos%2Fempresarial-insight%2Fdashboard.png&version_id=null',
      'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Henrique%20Fran%C3%A7a%2FProjetos%2Fempresarial-insight%2Fwhatsapp.png&version_id=null',
      'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Henrique%20Fran%C3%A7a%2FProjetos%2Fempresarial-insight%2Fkanbam.png&version_id=null'
    ]
  },
  {
    id: 12,
    title: 'DizPara',
    category: 'Automação de Marketing / SaaS',
    description: 'Sistema de captura e disparo de leads via WhatsApp e E-mail, com automação inteligente e IA de qualificação automática de contatos.',
    image: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FDizPara%2FLandingpage.png&version_id=null',
    tags: ['WhatsApp API', 'SMTP', 'IA', 'Lead Qualification'],
    link: 'https://dizpara.com/',
    type: 'personal',
    impact: [{ label: "Leads", value: "Qualificação por IA" }],
    gallery: [
      'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FDizPara%2Flogin.png&version_id=null',
      'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FDizPara%2Fdashboard.png&version_id=null',
      'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FDizPara%2Fleads.png&version_id=null',
      'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FDizPara%2Fcampanhas.png&version_id=null'
    ]
  },
  {
    id: 2,
    title: 'Travel IA',
    category: 'Roteiro Inteligente',
    description: 'Roteirização baseada em IA para guias personalizados. Planejamento completo de viagens com automação de ponta.',
    image: 'https://minio.vnone.com.br/api/v1/buckets/victornogueira/objects/download?preview=true&prefix=portfolio%2FRoteiro%20Inteligente%2FTela_Site.png&version_id=null',
    tags: ['Automação de Fluxos', 'APIs', 'SMTP', 'OpenAI'],
    link: 'https://vupt.site/travel-ia',
    type: 'personal',
    impact: [{ label: "Roteiro", value: "Gerado em segundos" }],
    gallery: [
      'https://minio.vnone.com.br/api/v1/buckets/victornogueira/objects/download?preview=true&prefix=portfolio%2FRoteiro%20Inteligente%2FTela_Email.png&version_id=null'
    ]
  },
  {
    id: 3,
    title: 'AI Playlist Maker',
    category: 'Curadoria Musical',
    description: 'Curadoria musical inteligente via API do Spotify. Crie playlists personalizadas baseadas em seu gosto e humor usando IA.',
    image: 'https://minio.vnone.com.br/api/v1/buckets/victornogueira/objects/download?preview=true&prefix=portfolio%2FSpotify%2FTela_principal.png&version_id=null',
    tags: ['Spotify API', 'Automação de Fluxos', 'SMTP', 'Inteligência Artificial'],
    link: 'https://vupt.site/spotify-ia',
    type: 'personal',
    impact: [{ label: "Curadoria", value: "IA personalizada" }],
    gallery: [
      'https://minio.vnone.com.br/api/v1/buckets/victornogueira/objects/download?preview=true&prefix=portfolio%2FSpotify%2FTela_email.png&version_id=null'
    ]
  },
  {
    id: 4,
    title: 'Portal Link-in-Bio',
    category: 'Marketing e Conversão',
    description: 'Hub de links personalizado com alta conversão. Centralize sua presença digital com um design otimizado e automação.',
    image: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2Fportfolio%2Flink%20in%20bio%2Fvn.png&version_id=null',
    tags: ['Automação de Fluxos', 'Webhook', 'HTML', 'CSS'],
    link: 'https://vupt.site/vn',
    type: 'personal',
    impact: [{ label: "Conversão", value: "Hub otimizado" }],
    gallery: [
      'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2Fportfolio%2Flink%20in%20bio%2Firmaocruz.png&version_id=null',
      'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2Fportfolio%2Flink%20in%20bio%2Fkarlaalvares.png&version_id=null'
    ]
  }
];
