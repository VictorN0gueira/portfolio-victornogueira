import { projectImage, type ProjectImage } from '../lib/projectImage';

/** One of the (up to three) screenshots of a project: the file and what it shows, in words. */
export interface ProjectShot {
  readonly image: ProjectImage;
  readonly alt: string;
}

export interface Project {
  slug: string;
  /** DizPara and Hub081: they get the large cards and the large gallery. */
  featured?: boolean;
  title: string;
  category: string;
  description: string;
  /** Featured only: one short line shown on the large card. */
  highlight?: string;
  /** Featured only: what the product does, as seen on its screens. */
  features?: readonly string[];
  tags: readonly string[];
  /** The screenshots, at most three. The first one is the cover: the card image and the large image of the case page. */
  shots: readonly ProjectShot[];
  impact?: readonly { label: string; value: string }[];
}

function shotsOf(keys: readonly string[], alts: readonly string[]): ProjectShot[] {
  return keys.map((key, index) => ({ image: projectImage(key), alt: alts[index] }));
}

/** The cover of a project is its first shot. */
export function coverOf(project: Project): ProjectImage {
  return project.shots[0].image;
}

// Hub081 screenshots are prepared on the branch assets/dizpara-hub081. Until it lands, these DizPara
// files stand in for them. The final swap: replace this constant with
//   ['hub081/login', 'hub081/conversas', 'hub081/dashboards']
// and the DizPara keys below with the three names that branch adds.
const HUB081_PLACEHOLDER = ['dizpara/login', 'dizpara/leads', 'dizpara/dashboard'] as const;
const DIZPARA_KEYS = ['dizpara/cover', 'dizpara/dashboard', 'dizpara/campanhas'] as const;

export const projects: readonly Project[] = [
  {
    slug: 'dizpara',
    featured: true,
    title: 'DizPara',
    category: 'Automação de marketing e SaaS',
    description:
      'Sistema de captura e disparo de leads via WhatsApp e E-mail, com automação e IA de qualificação automática de contatos.',
    highlight: 'Da busca no Google Maps ao disparo no WhatsApp e no e-mail, sem sair do painel.',
    features: [
      'Busca empresas no Google Maps por nicho e cidade e transforma o resultado em leads.',
      'Dispara campanhas por e-mail e por WhatsApp, com objetivo de prospecção ou de marketing.',
      'Organiza os leads em pipeline, listas, favoritos e grupos.',
      'Qualifica os contatos com IA.',
    ],
    tags: ['WhatsApp API', 'SMTP', 'IA', 'Qualificação de leads'],
    impact: [{ label: 'Leads', value: 'Qualificação por IA' }],
    shots: shotsOf(DIZPARA_KEYS, [
      'Página inicial do DizPara com a chamada para capturar leads, disparar campanhas e fechar negócios',
      'Painel do DizPara com leads capturados, campanhas enviadas, conexões ativas e o menu de prospecção',
      'Assistente de nova campanha do DizPara para escolher o canal, e-mail ou WhatsApp, e o objetivo',
    ]),
  },
  {
    slug: 'hub081',
    featured: true,
    title: 'Hub081',
    category: 'Central de atendimento e CRM no WhatsApp',
    description:
      'Central de atendimento e CRM no WhatsApp, com conversas, contatos, agentes de IA, pipelines, propostas, produtos e financeiro no mesmo painel.',
    highlight: 'O atendimento no WhatsApp e a gestão comercial no mesmo painel.',
    features: [
      'Atende por conversas do WhatsApp e mantém os contatos organizados.',
      'Reúne agentes de IA no atendimento.',
      'Cuida da parte comercial com pipelines, propostas e produtos.',
      'Mostra o financeiro e dashboards por área, em abas: visão geral, comercial, financeiro, produtos e turmas, atendimento e IA.',
    ],
    tags: ['WhatsApp', 'CRM', 'Agentes de IA', 'Pipelines'],
    shots: shotsOf(HUB081_PLACEHOLDER, [
      'Tela de login do Hub081, a central de atendimento e CRM no WhatsApp',
      'Tela de conversas do Hub081, com a lista de atendimentos e a conversa aberta',
      'Dashboards do Hub081, com as abas visão geral, comercial, financeiro, produtos e turmas, atendimento e IA',
    ]),
  },
  {
    slug: 'diagnostico-empresarial',
    title: 'Diagnóstico Empresarial',
    category: 'Captura de leads e consultoria',
    description:
      'Sistema completo de captura de leads com WhatsApp integrado, formulário, pipeline visual (Kanban), qualificação por IA e gestão de oportunidades.',
    tags: ['WhatsApp API', 'IA', 'Pipeline', 'Captura de leads'],
    impact: [{ label: 'Qualificação', value: 'IA automática' }],
    shots: shotsOf(
      ['diagnostico-empresarial/cover', 'diagnostico-empresarial/dashboard', 'diagnostico-empresarial/kanban'],
      [
        'Página do diagnóstico empresarial, com a chamada para descobrir em 5 minutos qual pilar está travando a empresa',
        'Painel de leads do diagnóstico, com indicadores, funil por etapa e leads capturados',
        'Pipeline de vendas em colunas Kanban: novo, em avaliação, qualificado, cliente e descartado',
      ],
    ),
  },
  {
    slug: 'dashboard-consumo-crm',
    title: 'Dashboard de Consumo CRM',
    category: 'BI e dashboards de vendas',
    description:
      'Centralização de dados de consumo e histórico de compras com gráficos dinâmicos e lista de produtos, integrando APIs de CRM via Webhooks.',
    tags: ['CRM API', 'Automação de Fluxos', 'Webhook', 'Visualização de dados'],
    impact: [{ label: 'Visibilidade', value: '100% tempo real' }],
    shots: shotsOf(
      ['dashboard-consumo-crm/cover', 'dashboard-consumo-crm/site2-resumocliente', 'dashboard-consumo-crm/fluxo-resumocliente'],
      [
        'Tela inicial dos sistemas Proplast, com o agente de histórico que gera o resumo estratégico do cliente',
        'Formulário para gerar o dashboard de um cliente a partir do CNPJ da empresa e do e-mail corporativo',
        'Fluxo de automação que recebe o pedido, consulta o histórico de compras e monta o dashboard',
      ],
    ),
  },
  {
    slug: 'portal-link-in-bio',
    title: 'Portal Link-in-Bio',
    category: 'Marketing e Conversão',
    description:
      'Hub de links personalizado com alta conversão. Centralize sua presença digital com um design otimizado e automação.',
    tags: ['Automação de Fluxos', 'Webhook', 'HTML', 'CSS'],
    impact: [{ label: 'Conversão', value: 'Hub otimizado' }],
    shots: shotsOf(
      ['portal-link-in-bio/cover', 'portal-link-in-bio/irmaocruz', 'portal-link-in-bio/karlaalvares'],
      [
        'Portal de links da VN One em fundo escuro, com redes sociais e os botões Solicitar Projeto e Nossas Soluções',
        'Portal de links de um mercadinho, com botões de pedido, endereço e horários e as ofertas em destaque',
        'Portal de links de uma loja de roupas, com botões de localização e dúvidas e o carrossel de destaques da coleção',
      ],
    ),
  },
  {
    slug: 'ai-playlist-maker',
    title: 'AI Playlist Maker',
    category: 'Curadoria Musical',
    description:
      'Curadoria musical via API do Spotify. Crie playlists personalizadas baseadas em seu gosto e humor usando IA.',
    tags: ['Spotify API', 'Automação de Fluxos', 'SMTP', 'Inteligência Artificial'],
    impact: [{ label: 'Curadoria', value: 'IA personalizada' }],
    shots: shotsOf(
      ['ai-playlist-maker/cover', 'ai-playlist-maker/tela-email'],
      [
        'Formulário do AI Playlist Maker para descrever a playlist, escolher o número de faixas e informar o e-mail da conta Spotify',
        'E-mail que avisa que a playlist ficou pronta, com o botão para ouvir no Spotify',
      ],
    ),
  },
  {
    slug: 'travel-ia',
    title: 'Travel IA',
    category: 'Roteiro com IA',
    description:
      'Roteirização baseada em IA para guias personalizados. Planejamento completo de viagens com automação de ponta.',
    tags: ['Automação de Fluxos', 'APIs', 'SMTP', 'OpenAI'],
    impact: [{ label: 'Roteiro', value: 'Gerado em segundos' }],
    shots: shotsOf(
      ['travel-ia/cover', 'travel-ia/tela-email'],
      [
        'Formulário do Travel IA para escolher destino, duração, estilo da viagem e o e-mail que recebe o roteiro',
        'E-mail com o roteiro de viagem dia a dia, com previsão do tempo e sugestões de manhã e tarde',
      ],
    ),
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
