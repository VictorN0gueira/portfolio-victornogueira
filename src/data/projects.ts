import { projectImage, type ProjectImage } from '../lib/projectImage';

export interface Project {
  id: number;
  slug: string;
  featured?: boolean;
  title: string;
  category: string;
  description: string;
  /** The cover: the card image and the first image of the case page. */
  image: ProjectImage;
  link: string;
  tags: string[];
  gallery?: ProjectImage[];
  type?: 'personal' | 'client';
  impact?: { label: string; value: string }[];
}

export const projects: Project[] = [
  {
    id: 5,
    slug: "troco",
    featured: true,
    title: "Trocô",
    category: "Gestão Financeira + IA",
    description: "Gestão financeira via WhatsApp com automação e Supabase. Processamento automático de áudios e notas fiscais.",
    image: projectImage('troco/cover'),
    link: '#',
    tags: ["Automação de Fluxos", "Supabase", "API's Financeiras", "Evolution API"],
    type: 'client',
    impact: [{ label: "Operação", value: "24/7 automática" }],
    gallery: [
      projectImage('troco/dashboard-troco'),
      projectImage('troco/lembretes-troco'),
      projectImage('troco/investimentos-troco')
    ]
  },

  {
    id: 7,
    slug: 'dashboard-consumo-crm',
    title: 'Dashboard de Consumo CRM',
    category: 'BI e dashboards de vendas',
    description: 'Centralização de dados de consumo e histórico de compras com gráficos dinâmicos e lista de produtos, integrando APIs de CRM via Webhooks.',
    image: projectImage('dashboard-consumo-crm/cover'),
    tags: ['CRM API', 'Automação de Fluxos', 'Webhook', 'Data Visualization'],
    link: '#',
    type: 'client',
    impact: [{ label: "Visibilidade", value: "100% tempo real" }],
    gallery: [
      projectImage('dashboard-consumo-crm/site2-resumocliente'),
      projectImage('dashboard-consumo-crm/fluxo-resumocliente')
    ]
  },
  {
    id: 8,
    slug: 'importacao-massiva-nfe',
    title: 'Importação Massiva de NF-e',
    category: 'Logística e integração ERP',
    description: 'Sincronização de milhares de Notas Fiscais/dia da Tiny API para Supabase, com monitoramento de status e comparativos automatizados.',
    image: projectImage('importacao-massiva-nfe/cover'),
    tags: ['Tiny API', 'Supabase', 'Automação de Fluxos', 'Google Sheets'],
    link: '#',
    type: 'client',
    impact: [{ label: "Volume", value: "Milhares de NFs/dia" }],
  },

  {
    id: 11,
    slug: 'diagnostico-empresarial',
    featured: true,
    title: 'Diagnóstico Empresarial',
    category: 'Captura de leads e consultoria',
    description: 'Sistema completo de captura de leads com WhatsApp integrado, formulário, pipeline visual (Kanban), qualificação por IA e gestão de oportunidades.',
    image: projectImage('diagnostico-empresarial/cover'),
    tags: ['WhatsApp API', 'IA', 'Pipeline', 'Lead Capture'],
    link: '#',
    type: 'client',
    impact: [{ label: "Qualificação", value: "IA automática" }],
    gallery: [
      projectImage('diagnostico-empresarial/login'),
      projectImage('diagnostico-empresarial/dashboard'),
      projectImage('diagnostico-empresarial/whatsapp'),
      projectImage('diagnostico-empresarial/kanban')
    ]
  },
  {
    id: 12,
    slug: 'dizpara',
    featured: true,
    title: 'DizPara',
    category: 'Automação de marketing e SaaS',
    description: 'Sistema de captura e disparo de leads via WhatsApp e E-mail, com automação e IA de qualificação automática de contatos.',
    image: projectImage('dizpara/cover'),
    tags: ['WhatsApp API', 'SMTP', 'IA', 'Lead Qualification'],
    link: 'https://dizpara.com/',
    type: 'personal',
    impact: [{ label: "Leads", value: "Qualificação por IA" }],
    gallery: [
      projectImage('dizpara/login'),
      projectImage('dizpara/dashboard'),
      projectImage('dizpara/leads'),
      projectImage('dizpara/campanhas')
    ]
  },
  {
    id: 2,
    slug: 'travel-ia',
    title: 'Travel IA',
    category: 'Roteiro com IA',
    description: 'Roteirização baseada em IA para guias personalizados. Planejamento completo de viagens com automação de ponta.',
    image: projectImage('travel-ia/cover'),
    tags: ['Automação de Fluxos', 'APIs', 'SMTP', 'OpenAI'],
    link: 'https://vupt.site/travel-ia',
    type: 'personal',
    impact: [{ label: "Roteiro", value: "Gerado em segundos" }],
    gallery: [
      projectImage('travel-ia/tela-email')
    ]
  },
  {
    id: 3,
    slug: 'ai-playlist-maker',
    title: 'AI Playlist Maker',
    category: 'Curadoria Musical',
    description: 'Curadoria musical via API do Spotify. Crie playlists personalizadas baseadas em seu gosto e humor usando IA.',
    image: projectImage('ai-playlist-maker/cover'),
    tags: ['Spotify API', 'Automação de Fluxos', 'SMTP', 'Inteligência Artificial'],
    link: 'https://vupt.site/spotify-ia',
    type: 'personal',
    impact: [{ label: "Curadoria", value: "IA personalizada" }],
    gallery: [
      projectImage('ai-playlist-maker/tela-email')
    ]
  },
  {
    id: 4,
    slug: 'portal-link-in-bio',
    title: 'Portal Link-in-Bio',
    category: 'Marketing e Conversão',
    description: 'Hub de links personalizado com alta conversão. Centralize sua presença digital com um design otimizado e automação.',
    image: projectImage('portal-link-in-bio/cover'),
    tags: ['Automação de Fluxos', 'Webhook', 'HTML', 'CSS'],
    link: 'https://vupt.site/vn',
    type: 'personal',
    impact: [{ label: "Conversão", value: "Hub otimizado" }],
    gallery: [
      projectImage('portal-link-in-bio/irmaocruz'),
      projectImage('portal-link-in-bio/karlaalvares')
    ]
  }
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
