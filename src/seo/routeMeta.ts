import { BREADCRUMB_HOME, PROJECTS_TITLE } from '../components/projectLabels';
import { SITE } from '../lib/site';

// One source for what the head says about each public route. Pure data, no React: the SEO component reads it at run time,
// and the build step (batch R) reads it for the static HTML and the sitemap.

export type RouteKind = 'home' | 'page' | 'project' | 'legal';

export interface RouteImage {
  readonly url: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}

export interface RouteCrumb {
  readonly name: string;
  readonly path: string;
}

export interface RouteMeta {
  /** '/', '/servicos', '/projetos/dizpara': no trailing slash, except the home. */
  readonly path: string;
  readonly kind: RouteKind;
  /** The whole <title>, brand included. */
  readonly title: string;
  readonly description: string;
  /** False: noindex, no canonical, no og:url, left out of the sitemap. */
  readonly isIndexable: boolean;
  /** YYYY-MM-DD. The date of the last real change of the page content: edit it in the same commit as the content. */
  readonly lastmod: string;
  /** Absent: the default banner of the site. */
  readonly image?: RouteImage;
  /** Empty on the home. Home and the route itself on inner routes. */
  readonly crumbs: readonly RouteCrumb[];
  /** Only where the FAQ is visible on the page. */
  readonly hasFaq?: boolean;
}

const PAGES_LASTMOD = '2026-11-01';
const PROJECTS_LASTMOD = '2026-10-29';
const SHARE_IMAGE_WIDTH = 1200;
const SHARE_IMAGE_HEIGHT = 630;
const HOME_CRUMB: RouteCrumb = { name: BREADCRUMB_HOME, path: '/' };
const PROJECTS_PATH = '/projetos';
const PROJECT_IMAGES_PATH = '/projects';

const withBrand = (topic: string): string => `${topic} | ${SITE.name}`;

interface PageEntry {
  readonly path: string;
  readonly kind: 'page' | 'legal';
  readonly crumb: string;
  readonly title: string;
  readonly description: string;
  readonly isIndexable?: boolean;
  readonly hasFaq?: boolean;
}

// RASCUNHO of the copy of the inner pages: the owner reviews it in the pull request. The two legal pages are frozen
// (their <SEO> props live in files that are not edited), and a test proves these entries equal what the files say.
const PAGES: readonly PageEntry[] = [
  {
    path: '/servicos',
    kind: 'page',
    crumb: 'Serviços',
    title: withBrand('Serviços de automação, agentes de IA e sites'),
    description:
      'Automação de processos, agentes de IA, sites e sistemas web sob medida. Cada serviço mostra o que está incluso, tem escopo claro e prazo estimado.',
  },
  {
    path: '/sobre',
    kind: 'page',
    crumb: 'Sobre',
    title: withBrand('Sobre a VN One e Victor Nogueira, em Recife'),
    description:
      'Conheça Victor Nogueira e como a gente trabalha na VN One: conversa, diagnóstico e entrega em ciclos semanais, com as ferramentas que você já usa.',
  },
  {
    path: PROJECTS_PATH,
    kind: 'page',
    crumb: PROJECTS_TITLE,
    title: withBrand('Projetos de automação, agentes de IA e sistemas web'),
    description:
      'Sistemas de atendimento, automação e IA que a gente construiu, com as telas de cada um: DizPara, Hub081, diagnóstico empresarial, dashboard de CRM e outros.',
  },
  {
    path: '/contato',
    kind: 'page',
    crumb: 'Contato',
    title: withBrand('Contato: consulta gratuita de automação e IA'),
    description:
      'Conta o que a sua empresa faz à mão hoje e pede uma consulta gratuita de 30 minutos, por videochamada ou WhatsApp. A gente aponta por onde começar.',
    hasFaq: true,
  },
  {
    // Out of the index until the blog has texts of its own: it only lists articles of other sites. It stays crawlable
    // (robots.txt does not block it) so that the noindex can be seen.
    path: '/blog',
    kind: 'page',
    crumb: 'Blog',
    title: withBrand('Blog de IA e automação, artigos de fontes públicas'),
    description:
      'Artigos sobre inteligência artificial e automação, em português e em inglês, de fontes públicas. Cada texto abre na fonte original, fora do site.',
    isIndexable: false,
  },
  {
    path: '/privacidade',
    kind: 'legal',
    crumb: 'Política de Privacidade',
    title: withBrand('Política de Privacidade'),
    description:
      'Como os dados enviados pelo formulário de contato de vnone.com.br são coletados, usados e protegidos, conforme a LGPD.',
  },
  {
    path: '/lgpd',
    kind: 'legal',
    crumb: 'LGPD',
    title: withBrand('LGPD'),
    description:
      'Como o site vnone.com.br trata seus dados pessoais em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).',
  },
];

interface ProjectEntry {
  readonly slug: string;
  /** The title of the project, as src/data/projects.ts has it. */
  readonly name: string;
  readonly title: string;
  readonly description: string;
  /** The key of the cover image ("<slug>/<name>"): its share image is /projects/<key>-share.jpg. */
  readonly cover: string;
  /** The alt of the cover, as src/data/projects.ts has it. */
  readonly coverAlt: string;
}

// RASCUNHO. Each description starts from the one of src/data/projects.ts and adds one sentence, with no new fact.
// This table does not import the project data on purpose: SEO.tsx imports this module, and the data (with its image
// manifest) would join the critical path of the home. src/seo/routeMeta.test.ts proves the table agrees with the data
// (every project has an entry, the name, the cover and the alt are the same), so a new project fails there until it has one.
const PROJECT_ENTRIES: readonly ProjectEntry[] = [
  {
    slug: 'dizpara',
    name: 'DizPara',
    title: withBrand('DizPara: leads do Google Maps e envios no WhatsApp'),
    description:
      'Painel para captar leads no Google Maps, importar de CSV e do Google Sheets e disparar campanhas por e-mail e por WhatsApp. Veja as telas e o que cada uma faz.',
    cover: 'dizpara/lista-de-leads',
    coverAlt: 'Lista de leads do DizPara, com filtros por status, importação de CSV e do Google Sheets e a busca no Maps',
  },
  {
    slug: 'hub081',
    name: 'Hub081',
    title: withBrand('Hub081: atendimento no WhatsApp e agentes de IA'),
    description:
      'Painel com as conversas do WhatsApp, contatos, agentes de IA, pipelines, propostas, produtos e financeiro. Veja as telas e o que cada uma faz.',
    cover: 'hub081/dashboards',
    coverAlt: 'Dashboards do Hub081, com as abas visão geral, comercial, financeiro, produtos e turmas, atendimento e IA',
  },
  {
    slug: 'diagnostico-empresarial',
    name: 'Diagnóstico Empresarial',
    title: withBrand('Diagnóstico Empresarial online e painel de leads'),
    description:
      'Página com um diagnóstico de 5 minutos para o dono da empresa e painel de leads com login, indicadores e funil. Veja as telas e o que cada uma faz.',
    cover: 'diagnostico-empresarial/cover',
    coverAlt: 'Página do diagnóstico empresarial, com a chamada para descobrir em 5 minutos qual pilar está travando a empresa',
  },
  {
    slug: 'dashboard-consumo-crm',
    name: 'Dashboard de Consumo CRM',
    title: withBrand('Dashboard de Consumo CRM com agente de IA'),
    description:
      'Formulário em que se informa o CNPJ e o e-mail de uma empresa. Um agente de IA consulta o histórico de compras no Supabase e monta o dashboard do cliente.',
    cover: 'dashboard-consumo-crm/cover',
    coverAlt: 'Tela inicial dos sistemas Proplast, com o agente de histórico que gera o resumo estratégico do cliente',
  },
  {
    slug: 'portal-link-in-bio',
    name: 'Portal Link-in-Bio',
    title: withBrand('Portal Link-in-Bio: páginas de links para celular'),
    description:
      'Páginas de links para o celular, com botões de contato, endereço, horários e destaques de ofertas. Aqui estão a da VN One, a de um mercadinho e a de uma loja.',
    cover: 'portal-link-in-bio/cover',
    coverAlt: 'Página de links da VN One em fundo escuro, com os ícones das redes e os botões Solicitar Projeto e Nossas Soluções',
  },
  {
    slug: 'ai-playlist-maker',
    name: 'AI Playlist Maker',
    title: withBrand('AI Playlist Maker: playlists do Spotify com IA'),
    description:
      'Formulário em que se descreve a playlist, escolhe o número de faixas e informa o e-mail da conta Spotify. A playlist chega por e-mail, com o botão para ouvir.',
    cover: 'ai-playlist-maker/tela-email',
    coverAlt: 'E-mail que avisa que a playlist ficou pronta, com o botão para ouvir no Spotify',
  },
  {
    slug: 'travel-ia',
    name: 'Travel IA',
    title: withBrand('Travel IA: roteiro de viagem por e-mail, dia a dia'),
    description:
      'Formulário em que se escolhe o destino, a duração e o estilo da viagem. O roteiro chega por e-mail, dia a dia, com a previsão do tempo.',
    cover: 'travel-ia/cover',
    coverAlt: 'Formulário do Travel IA, para escolher destino, duração, estilo da viagem e o e-mail que recebe o roteiro',
  },
];

function pageMeta(entry: PageEntry): RouteMeta {
  return {
    path: entry.path,
    kind: entry.kind,
    title: entry.title,
    description: entry.description,
    isIndexable: entry.isIndexable ?? true,
    lastmod: PAGES_LASTMOD,
    crumbs: [HOME_CRUMB, { name: entry.crumb, path: entry.path }],
    ...(entry.hasFaq ? { hasFaq: true } : {}),
  };
}

function projectMeta(entry: ProjectEntry): RouteMeta {
  const path = `${PROJECTS_PATH}/${entry.slug}`;

  return {
    path,
    kind: 'project',
    title: entry.title,
    description: entry.description,
    isIndexable: true,
    lastmod: PROJECTS_LASTMOD,
    image: {
      url: `${SITE.url}${PROJECT_IMAGES_PATH}/${entry.cover}-share.jpg`,
      alt: entry.coverAlt,
      width: SHARE_IMAGE_WIDTH,
      height: SHARE_IMAGE_HEIGHT,
    },
    crumbs: [HOME_CRUMB, { name: PROJECTS_TITLE, path: PROJECTS_PATH }, { name: entry.name, path }],
  };
}

function buildRouteMetas(): readonly RouteMeta[] {
  const home: RouteMeta = {
    path: '/',
    kind: 'home',
    title: SITE.title,
    description: SITE.description,
    isIndexable: true,
    lastmod: PAGES_LASTMOD,
    crumbs: [],
    hasFaq: true,
  };

  return [home, ...PAGES.map(pageMeta), ...PROJECT_ENTRIES.map(projectMeta)];
}

export const ROUTE_METAS: readonly RouteMeta[] = buildRouteMetas();

const ROUTE_BY_PATH: ReadonlyMap<string, RouteMeta> = new Map(ROUTE_METAS.map((meta) => [meta.path, meta]));

/** The meta of a path. A trailing slash, a query string and a hash do not matter. A path the site does not serve gives undefined. */
export function routeMetaFor(path: string): RouteMeta | undefined {
  const bare = path.split(/[?#]/)[0];
  const normalized = bare.length > 1 && bare.endsWith('/') ? bare.slice(0, -1) : bare;
  return ROUTE_BY_PATH.get(normalized);
}
