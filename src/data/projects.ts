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
}

export const projects: Project[] = [
  {
    id: 1,
    title: "Trocô",
    category: "Gestão Financeira + IA",
    description: "Gestão Inteligente via WhatsApp, N8N e Supabase. Processamento automático de áudios e notas fiscais.",
    image: "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2Fportfolio%2Ftroco%2FLogin-Troco.png&version_id=null",
    link: "https://troco-liart.vercel.app/#/",
    tags: ["N8N", "Supabase", "API's Financeiras", "Evolution API"],
    type: 'personal',
    gallery: [
      "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2Fportfolio%2Ftroco%2FDashboard-Troco.png&version_id=null",
      "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2Fportfolio%2Ftroco%2FLembretes-Troco.png&version_id=null",
      "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2Fportfolio%2Ftroco%2FInvestimentos-Troco.png&version_id=null"
    ]
  },
  {
    id: 5,
    title: 'Consulta de CNPJ Inteligente',
    category: 'Automação B2B / Consultas',
    description: 'Fluxo automatizado para consulta de dados cadastrais via CNPJ com interface intuitiva e integração de dados em tempo real para otimizar processos comerciais.',
    image: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2FCP%2Fsite1-consultarcnpj.png&version_id=null',
    tags: ['N8N', 'API de Dados', 'Workflow', 'B2B'],
    link: '#',
    type: 'client',
    gallery: [
      'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2FCP%2Fsite2-consultarcnpj.png&version_id=null',
      'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2FCP%2Ffluxo-consultarcnpj.png&version_id=null'
    ]
  },
  {
    id: 6,
    title: 'Onboarding de Clientes Automático',
    category: 'Automação de Processos / Onboarding',
    description: 'Fluxo inteligente de boas-vindas e coleta de dados integrando Notion, Google Drive e APIs para uma experiência de cliente 100% fluida.',
    image: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2FCP%2Ffluxo-onboarding.png&version_id=null',
    tags: ['Notion', 'Google Drive', 'n8n', 'Business Automation'],
    link: '#',
    type: 'client'
  },
  {
    id: 7,
    title: 'Dashboard de Consumo CRM',
    category: 'BI / Dashboards de Vendas',
    description: 'Centralização de dados de consumo e histórico de compras com gráficos dinâmicos e lista de produtos, integrando APIs de CRM via Webhooks.',
    image: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2FProplast%2Fsite1-resumocliente.png&version_id=null',
    tags: ['CRM API', 'n8n', 'Webhook', 'Data Visualization'],
    link: '#',
    type: 'client',
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
    tags: ['Tiny API', 'Supabase', 'n8n', 'Google Sheets'],
    link: '#',
    type: 'client'
  },
  {
    id: 9,
    title: 'Cloud Storage de Notas Fiscais',
    category: 'Cloud Infrastructure / Backoffice',
    description: 'Fluxo em tempo real via Webhook para armazenamento imediato de Notas Fiscais no Supabase, garantindo backup e disponibilidade instantânea.',
    image: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2FProplast%2Ffluxo-importacaodenotas.png&version_id=null',
    tags: ['Webhook', 'Supabase', 'n8n', 'Automation'],
    link: '#',
    type: 'client'
  },
  {
    id: 10,
    title: 'Captura e Disparo de Leads',
    category: 'Marketing Automation / Growth',
    description: 'Motor de geração de leads com disparo automático via WhatsApp e E-mail (SMTP), integrado a Google Sheets para gestão de funil.',
    image: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2FMicael%20Santiago%2Ffluxo-leads.png&version_id=null',
    tags: ['WhatsApp API', 'SMTP', 'n8n', 'Lead Gen'],
    link: '#',
    type: 'client'
  },
  {
    id: 2,
    title: 'Travel IA',
    category: 'Roteiro Inteligente',
    description: 'Roteirização baseada em IA para guias personalizados. Planejamento completo de viagens com automação de ponta.',
    image: 'https://minio.vnone.com.br/api/v1/buckets/victornogueira/objects/download?preview=true&prefix=portfolio%2FRoteiro%20Inteligente%2FTela_Site.png&version_id=null',
    tags: ['N8N', 'APIs', 'SMTP', 'OpenAI'],
    link: 'https://vupt.site/travel-ia',
    type: 'personal',
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
    tags: ['Spotify API', 'N8N', 'SMTP', 'Inteligência Artificial'],
    link: 'https://vupt.site/spotify-ia',
    type: 'personal',
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
    tags: ['N8N', 'Webhook', 'HTML', 'CSS'],
    link: 'https://vupt.site/vn',
    type: 'personal',
    gallery: [
      'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2Fportfolio%2Flink%20in%20bio%2Firmaocruz.png&version_id=null',
      'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FSite-VN%2Fportfolio%2Flink%20in%20bio%2Fkarlaalvares.png&version_id=null'
    ]
  }
];
