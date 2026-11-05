import { PROJECTS_TITLE } from '../components/projectLabels';
import { coverOf, projects, type Project } from '../data/projects';
import { HOME_CRUMB, PROJECTS_PATH, withBrand, type RouteMeta } from './pageMeta';

// What the head says about each project page. Only the page of a project and the build step load this module: it reads
// src/data/projects.ts (with its image manifest), which the main chunk must not carry. The name, the cover image and its
// alt come from that data, so there is one copy of them; only the title and the description are written here.

const PROJECTS_LASTMOD = '2026-10-29';
const SHARE_IMAGE_WIDTH = 1200;
const SHARE_IMAGE_HEIGHT = 630;

interface ProjectEntry {
  readonly slug: string;
  /** Starts with the title of the project, as src/data/projects.ts has it (a test checks it). */
  readonly title: string;
  readonly description: string;
}

// RASCUNHO. Each description starts from the one of src/data/projects.ts and adds one sentence, with no new fact.
// src/seo/routeMeta.test.ts proves that every project has an entry and that the title starts with the name of the project.
const PROJECT_ENTRIES: readonly ProjectEntry[] = [
  {
    slug: 'dizpara',
    title: withBrand('DizPara: leads do Google Maps e envios no WhatsApp'),
    description:
      'Painel para captar leads no Google Maps, importar de CSV e do Google Sheets e disparar campanhas por e-mail e por WhatsApp. Veja as telas e o que cada uma faz.',
  },
  {
    slug: 'hub081',
    title: withBrand('Hub081: atendimento no WhatsApp e agentes de IA'),
    description:
      'Painel com as conversas do WhatsApp, contatos, agentes de IA, pipelines, propostas, produtos e financeiro. Veja as telas e o que cada uma faz.',
  },
  {
    slug: 'diagnostico-empresarial',
    title: withBrand('Diagnóstico Empresarial online e painel de leads'),
    description:
      'Página com um diagnóstico de 5 minutos para o dono da empresa e painel de leads com login, indicadores e funil. Veja as telas e o que cada uma faz.',
  },
  {
    slug: 'dashboard-consumo-crm',
    title: withBrand('Dashboard de Consumo CRM com agente de IA'),
    description:
      'Formulário em que se informa o CNPJ e o e-mail de uma empresa. Um agente de IA consulta o histórico de compras no Supabase e monta o dashboard do cliente.',
  },
  {
    slug: 'portal-link-in-bio',
    title: withBrand('Portal Link-in-Bio: páginas de links para celular'),
    description:
      'Páginas de links para o celular, com botões de contato, endereço, horários e destaques de ofertas. Aqui estão a da VN One, a de um mercadinho e a de uma loja.',
  },
  {
    slug: 'ai-playlist-maker',
    title: withBrand('AI Playlist Maker: playlists do Spotify com IA'),
    description:
      'Formulário em que se descreve a playlist, escolhe o número de faixas e informa o e-mail da conta Spotify. A playlist chega por e-mail, com o botão para ouvir.',
  },
  {
    slug: 'travel-ia',
    title: withBrand('Travel IA: roteiro de viagem por e-mail, dia a dia'),
    description:
      'Formulário em que se escolhe o destino, a duração e o estilo da viagem. O roteiro chega por e-mail, dia a dia, com a previsão do tempo.',
  },
];

function projectMeta(entry: ProjectEntry, project: Project): RouteMeta {
  const path = `${PROJECTS_PATH}/${project.slug}`;
  const cover = coverOf(project);

  return {
    path,
    kind: 'project',
    title: entry.title,
    description: entry.description,
    isIndexable: true,
    lastmod: PROJECTS_LASTMOD,
    ...(cover.shareUrl
      ? { image: { url: cover.shareUrl, alt: project.shots[0].alt, width: SHARE_IMAGE_WIDTH, height: SHARE_IMAGE_HEIGHT } }
      : {}),
    crumbs: [HOME_CRUMB, { name: PROJECTS_TITLE, path: PROJECTS_PATH }, { name: project.title, path }],
  };
}

/** One entry per project of src/data/projects.ts that has a title and a description here, in the order of the data. */
export const PROJECT_METAS: readonly RouteMeta[] = projects.flatMap((project) => {
  const entry = PROJECT_ENTRIES.find((candidate) => candidate.slug === project.slug);
  return entry ? [projectMeta(entry, project)] : [];
});

const PROJECT_BY_SLUG: ReadonlyMap<string, RouteMeta> = new Map(PROJECT_METAS.map((meta) => [meta.path.slice(PROJECTS_PATH.length + 1), meta]));

/** The meta of the page of a project, by its slug. A slug that is not a project (or has no entry) gives undefined. */
export function projectMetaFor(slug: string): RouteMeta | undefined {
  return PROJECT_BY_SLUG.get(slug);
}
