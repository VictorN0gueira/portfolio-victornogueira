import { projectImage, type ProjectImage } from '../lib/projectImage';

/** One of the (exactly three) screenshots of a project: the file and what it shows, in words. */
export interface ProjectShot {
  readonly image: ProjectImage;
  readonly alt: string;
}

export interface Project {
  readonly slug: string;
  /** DizPara and Hub081: they get the large cards and the large gallery. */
  readonly featured?: boolean;
  readonly title: string;
  readonly category: string;
  readonly description: string;
  /** Featured only: one short line shown on the large card. */
  readonly highlight?: string;
  /** Featured only: what the product does, as seen on its screens. */
  readonly features?: readonly string[];
  readonly tags: readonly string[];
  /**
   * The screenshots, three of them. The first one is the cover: the card image, the large image of the case
   * page and the image shared on social networks.
   */
  readonly shots: readonly ProjectShot[];
}

/** A screenshot of the generated manifest ("<project>/<name>") and what it shows. */
function shot(key: string, alt: string): ProjectShot {
  return { image: projectImage(key), alt };
}

/** The cover of a project is its first shot. */
export function coverOf(project: Project): ProjectImage {
  return project.shots[0].image;
}

export const projects: readonly Project[] = [
  {
    slug: 'dizpara',
    featured: true,
    title: 'DizPara',
    category: 'Captação e disparo de leads',
    description:
      'Painel para captar leads no Google Maps, importar de CSV e do Google Sheets e disparar campanhas por e-mail e por WhatsApp.',
    highlight: 'Da busca no Google Maps ao disparo no WhatsApp e no e-mail, no mesmo painel.',
    features: [
      'Busca empresas no Google Maps por nicho e cidade e transforma o resultado em leads.',
      'Importa leads de CSV e do Google Sheets, aceita cadastro manual e detecta duplicados.',
      'Mostra cada lead com pontuação e status: novo, em contato, qualificado ou descartado.',
      'Dispara campanhas por e-mail e por WhatsApp, em um passo a passo de criação.',
      'Mostra a cota de leads do mês e o aviso de base legal da LGPD.',
    ],
    tags: ['WhatsApp', 'SMTP', 'Google Maps', 'Google Sheets'],
    shots: [
      shot('dizpara/lista-de-leads', 'Lista de leads do DizPara, com filtros por status, importação de CSV e do Google Sheets e a busca no Maps'),
      shot('dizpara/captura-de-leads', 'Janela de captura de leads do DizPara ao fim de uma busca no Google Maps, com os leads adicionados'),
      shot('dizpara/nova-campanha', 'Assistente de nova campanha do DizPara, para escolher o canal, e-mail ou WhatsApp, e o objetivo'),
    ],
  },
  {
    slug: 'hub081',
    featured: true,
    title: 'Hub081',
    category: 'Central de atendimento e CRM no WhatsApp',
    description: 'Painel com as conversas do WhatsApp, contatos, agentes de IA, pipelines, propostas, produtos e financeiro.',
    highlight: 'O atendimento no WhatsApp e a gestão comercial no mesmo painel.',
    features: [
      'Lista as conversas do WhatsApp em abas: ativas, pendentes, pausadas e concluídas.',
      'Reúne atendimento, chat interno, contatos, agentes de IA e canais.',
      'Tem a área comercial com pipelines, turmas, propostas e produtos.',
      'Tem a área financeira com visão geral, contas a pagar, contas a receber e repasses.',
      'Mostra dashboards por área, em abas, com filtro de período e exportação para Excel.',
    ],
    tags: ['WhatsApp', 'CRM', 'Agentes de IA', 'Pipelines'],
    shots: [
      shot('hub081/dashboards', 'Dashboards do Hub081, com as abas visão geral, comercial, financeiro, produtos e turmas, atendimento e IA'),
      shot('hub081/conversas', 'Lista de conversas do WhatsApp no Hub081, com as abas ativas, pendentes, pausadas e concluídas'),
      shot('hub081/login', 'Tela de login do Hub081, com os campos de e-mail e senha e o logotipo do Hub081'),
    ],
  },
  {
    slug: 'diagnostico-empresarial',
    title: 'Diagnóstico Empresarial',
    category: 'Diagnóstico online e painel de leads',
    description:
      'Página com um diagnóstico de 5 minutos para o dono da empresa e painel de leads com login, indicadores e funil.',
    tags: ['Diagnóstico online', 'Painel de leads', 'Funil de leads'],
    shots: [
      shot('diagnostico-empresarial/cover', 'Página do diagnóstico empresarial, com a chamada para descobrir em 5 minutos qual pilar está travando a empresa'),
      shot('diagnostico-empresarial/dashboard', 'Painel de leads do diagnóstico, com os indicadores zerados, o gráfico de leads capturados e o funil por etapa'),
      shot('diagnostico-empresarial/login', 'Tela de login do painel do diagnóstico, com os campos de e-mail e senha e o botão de entrar'),
    ],
  },
  {
    slug: 'dashboard-consumo-crm',
    title: 'Dashboard de Consumo CRM',
    category: 'Histórico de compras e dashboards',
    description:
      'Formulário em que se informa o CNPJ e o e-mail de uma empresa. Um agente de IA consulta o histórico de compras no Supabase e monta o dashboard do cliente.',
    tags: ['Supabase', 'OpenAI', 'Webhook', 'Chart.js'],
    shots: [
      shot('dashboard-consumo-crm/cover', 'Tela inicial dos sistemas Proplast, com o agente de histórico que gera o resumo estratégico do cliente'),
      shot('dashboard-consumo-crm/site2-resumocliente', 'Formulário para gerar o dashboard de um cliente a partir do CNPJ da empresa e do e-mail corporativo'),
      shot('dashboard-consumo-crm/fluxo-resumocliente', 'Fluxo de automação em três etapas: página de acesso, agente de análise com ferramentas no Supabase e dashboard'),
    ],
  },
  {
    slug: 'portal-link-in-bio',
    title: 'Portal Link-in-Bio',
    category: 'Páginas de links para negócios',
    description:
      'Páginas de links para o celular, com botões de contato, endereço e horários e destaques de ofertas ou de coleção. Aqui estão a da VN One, a de um mercadinho e a de uma loja de roupas.',
    tags: ['HTML', 'CSS', 'WhatsApp', 'Instagram'],
    shots: [
      shot('portal-link-in-bio/cover', 'Página de links da VN One em fundo escuro, com os ícones das redes e os botões Solicitar Projeto e Nossas Soluções'),
      shot('portal-link-in-bio/irmaocruz', 'Página de links de um mercadinho, com botões de pedido, endereço e horários e as ofertas em destaque'),
      shot('portal-link-in-bio/karlaalvares', 'Página de links de uma loja de roupas, com botões de localização e dúvidas e o carrossel de destaques da coleção'),
    ],
  },
  {
    slug: 'ai-playlist-maker',
    title: 'AI Playlist Maker',
    category: 'Playlists com IA',
    description:
      'Formulário em que a pessoa descreve a playlist, escolhe o número de faixas e informa o e-mail da conta Spotify. A playlist chega por e-mail, com o botão para ouvir no Spotify.',
    tags: ['Spotify API', 'IA', 'E-mail'],
    shots: [
      shot('ai-playlist-maker/tela-email', 'E-mail que avisa que a playlist ficou pronta, com o botão para ouvir no Spotify'),
      shot('ai-playlist-maker/formulario', 'Formulário do AI Playlist Maker, com o pedido da playlist, o número de faixas e o e-mail da conta Spotify'),
      shot('ai-playlist-maker/tela-mobile', 'Cabeçalho do AI Playlist Maker no celular, com o logotipo do Spotify e o título'),
    ],
  },
  {
    slug: 'travel-ia',
    title: 'Travel IA',
    category: 'Roteiro com IA',
    description:
      'Formulário em que se escolhe o destino, a duração e o estilo da viagem. O roteiro chega por e-mail, dia a dia, com a previsão do tempo.',
    tags: ['IA', 'E-mail', 'Previsão do tempo'],
    shots: [
      shot('travel-ia/cover', 'Formulário do Travel IA, para escolher destino, duração, estilo da viagem e o e-mail que recebe o roteiro'),
      shot('travel-ia/tela-email', 'E-mail com o roteiro de viagem dia a dia, com previsão do tempo e sugestões de manhã e tarde'),
      shot('travel-ia/tela-mobile', 'Cabeçalho do Travel IA no celular, com o ícone de clima, o título em duas linhas e o texto de apresentação'),
    ],
  },
];

/** Projects that left the list. Their old addresses still work: they send the visitor to /projetos. */
export const REMOVED_PROJECT_SLUGS: readonly string[] = ['troco', 'importacao-massiva-nfe'];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
