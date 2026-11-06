import type { CatFilter, LangFilter } from './blogMeta';

/**
 * Every fixed phrase of the /blog page. They are the words that were already live on the page, moved here unchanged so the
 * copy rules read them. The articles themselves (and the fixed list of newsService) are somebody else's text and are not here.
 */
export const blogCopy = {
  kicker: 'Blog',
  title: 'Leituras sobre IA e automação',
  lead: 'A gente junta artigos sobre inteligência artificial e automação, em português e em inglês. Dá para filtrar por idioma e por tópico.',
  refresh: 'Atualizar',
  loadingLabel: 'Carregando artigos',
  listHeading: 'Artigos',
  thirdPartyNote: 'Os artigos vêm de sites de terceiros e os links levam aos sites de quem publicou.',
  dataSource: {
    live: 'Lista carregada agora',
    browserCache: 'Lista salva neste navegador',
    staleBrowserCache: 'As fontes não responderam. Esta é a última lista salva neste navegador.',
    fallback: 'As fontes não responderam. Esta é uma lista fixa de artigos.',
  },
  filters: {
    searchLabel: 'Buscar artigos',
    searchPlaceholder: 'Buscar artigos...',
    clearSearch: 'Limpar busca',
    languageGroup: 'Filtrar por idioma',
    topicGroup: 'Filtrar por tópico',
    clear: 'Limpar filtros',
  },
  states: {
    errorTitle: 'Ops! Algo deu errado',
    errorFallback: 'Erro ao carregar notícias',
    emptyTitle: 'Nenhuma notícia encontrada',
    emptyHint: 'Tenta atualizar em alguns instantes.',
    noMatchTitle: 'Nenhum artigo encontrado',
    noMatchHint: 'Tenta outros filtros ou limpa a busca.',
  },
  card: {
    featured: 'Destaque',
    isNew: 'NOVO',
    read: 'Ler artigo',
    readTime: 'leitura',
    noSummary: 'Clica para ler o artigo completo.',
    coverUnavailable: 'Imagem indisponível',
  },
} as const;

/** The count line of the filters: the word agrees with the number. */
export function countLabel(count: number): string {
  const plural = count !== 1 ? 's' : '';
  return `${count} artigo${plural} encontrado${plural}`;
}

// The flags are decoration: the name of a filter is its word.
export const LANG_LABELS: Record<LangFilter, { text: string; flag?: string; lang?: string }> = {
  all: { text: 'Todos idiomas' },
  pt: { text: 'Português', flag: '🇧🇷' },
  en: { text: 'English', flag: '🇺🇸', lang: 'en' },
};

export const CAT_LABELS: Record<CatFilter, string> = {
  all: 'Todos tópicos',
  ia: 'IA',
  automação: 'Automação',
  n8n: 'N8N',
  agentes: 'Agentes',
  llms: 'LLMs',
  ml: 'Machine Learning',
};
