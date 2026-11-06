import { BREADCRUMB_HOME, PROJECTS_PAGE_DESCRIPTION, PROJECTS_TITLE } from '../components/projectLabels';
import { SITE } from '../lib/site';
import type { RouteCrumb, RouteMeta } from './routeMeta';

// What the head says about the home and the inner pages. Pure data, no React. This is the part the SEO component loads at
// run time, so it stays small: the texts of the projects are in projectMeta.ts, which only the page of a project and the
// build step load. src/seo/routeMeta.ts puts the two together.

const PAGES_LASTMOD = '2026-11-01';
export const PROJECTS_PATH = '/projetos';
export const HOME_CRUMB: RouteCrumb = { name: BREADCRUMB_HOME, path: '/' };

export const withBrand = (topic: string): string => `${topic} | ${SITE.name}`;

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
    // hasFaq omitted intentionally: /servicos has a visible FAQ accordion but it is a sales feature list,
    // not a standalone FAQ page. The JSON-LD FAQPage schema would duplicate /contato's structured data
    // and confuse search engines about which page owns the FAQ.
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
    description: PROJECTS_PAGE_DESCRIPTION,
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

const HOME_META: RouteMeta = {
  path: '/',
  kind: 'home',
  title: SITE.title,
  description: SITE.description,
  isIndexable: true,
  lastmod: PAGES_LASTMOD,
  crumbs: [],
  hasFaq: true,
};

/** The home and the inner pages, in this order. The projects are in projectMeta.ts. */
export const PAGE_METAS: readonly RouteMeta[] = [HOME_META, ...PAGES.map(pageMeta)];

/** A path without a trailing slash, a query string or a hash. */
export function normalizePath(path: string): string {
  const bare = path.split(/[?#]/)[0];
  return bare.length > 1 && bare.endsWith('/') ? bare.slice(0, -1) : bare;
}

const PAGE_BY_PATH: ReadonlyMap<string, RouteMeta> = new Map(PAGE_METAS.map((meta) => [meta.path, meta]));

/** The meta of the home or of an inner page. A trailing slash, a query string and a hash do not matter. A project or an unknown path gives undefined. */
export function pageMetaFor(path: string): RouteMeta | undefined {
  return PAGE_BY_PATH.get(normalizePath(path));
}
