import type { Page } from '@playwright/test';

// What the specs of the blog share: the answer of the news source they route in place of the real network. The blog reads
// its articles from third party sites, so no spec ever lets a request leave the machine: the Supabase proxy the blog asks
// first is routed here (n8nGuard answers the public feeds itself, with an empty list, and blocks anything else).

export const EDGE_FUNCTION = '**/functions/v1/gnews-proxy*';
const CORS_JSON = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
const DAY_MS = 86_400_000;
const FRESH_MS = 30 * 60 * 1000;

export type SampleArticle = ReturnType<typeof sampleArticle>;

export function sampleArticle(index: number, language: 'pt' | 'en') {
  return {
    title: `Artigo de teste ${index}`,
    description: `Resumo do artigo ${index}`,
    url: `https://example.com/artigo-${index}`,
    image: '',
    publishedAt: new Date(Date.now() - (index + 1) * DAY_MS).toISOString(),
    source: { name: 'Fonte', url: 'https://example.com' },
    language,
  };
}

export function defaultArticles(): SampleArticle[] {
  return [sampleArticle(1, 'pt'), sampleArticle(2, 'en'), sampleArticle(3, 'pt'), sampleArticle(4, 'pt')];
}

/**
 * A list that is hard on the layout: a fresh featured article with a long title, a title that is one unbreakable address,
 * a long source name, English and Portuguese, fresh and old.
 */
export function stressArticles(): SampleArticle[] {
  const fresh = new Date(Date.now() - FRESH_MS).toISOString();
  const longSource = { name: 'Uma fonte com um nome bem comprido que precisa quebrar', url: 'https://example.com' };
  return [
    {
      ...sampleArticle(0, 'pt'),
      title:
        'Automação de processos para equipes pequenas, com um título bem longo que ocupa várias linhas do destaque',
      description:
        'Um resumo que também é comprido, para o destaque mostrar o texto inteiro em quatro linhas sem cortar palavra.',
      publishedAt: fresh,
      source: longSource,
    },
    {
      ...sampleArticle(1, 'en'),
      title: 'Machine learning in production: a title long enough to wrap onto three lines of the card',
      publishedAt: fresh,
      source: longSource,
    },
    {
      ...sampleArticle(2, 'pt'),
      title: 'Automação de fluxos com n8n e inteligência artificial',
      description: 'Resumo',
    },
    { ...sampleArticle(3, 'pt'), title: 'Workflow n8n do começo ao fim', publishedAt: fresh },
    { ...sampleArticle(4, 'en'), title: 'Autonomous agent loop', source: longSource },
    { ...sampleArticle(5, 'pt'), title: 'Machine learning em produção' },
    { ...sampleArticle(6, 'en'), title: 'Retrieval augmented generation explained' },
    { ...sampleArticle(7, 'pt'), title: 'Agentes de IA no atendimento' },
  ];
}

/**
 * An article whose title is one unbroken address, which no line break can split: the card has to wrap it inside itself
 * (overflow-wrap) instead of letting it run out. It is the one case where a word is broken in the middle, on purpose.
 */
export function addressTitleArticles(): SampleArticle[] {
  const address = 'https://example.com/um-caminho-muito-comprido-que-nao-tem-espaco-nenhum-para-quebrar-em-lugar-algum';
  return [
    { ...sampleArticle(0, 'pt'), title: address, description: address },
    { ...sampleArticle(1, 'en'), title: address, source: { name: address, url: 'https://example.com' } },
    sampleArticle(2, 'pt'),
  ];
}

/**
 * Answers the blog's news source with these articles. Call it before the page opens. With a `gate`, the answer waits for it
 * to settle, so a spec can look at the page while the sources are still loading.
 */
export async function routeNews(
  page: Page,
  articles: SampleArticle[] = defaultArticles(),
  gate?: Promise<void>,
): Promise<void> {
  await page.route(EDGE_FUNCTION, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_JSON });
      return;
    }
    await gate;
    await route.fulfill({
      status: 200,
      headers: CORS_JSON,
      contentType: 'application/json',
      body: JSON.stringify({ articles, source: 'edge-function' }),
    });
  });
}

/** Collects the layout-shift entries of the page in window.__shifts, from the first paint. */
export async function watchShifts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const shifts: number[] = [];
    (window as unknown as { __shifts: number[] }).__shifts = shifts;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as Array<{ value: number; hadRecentInput: boolean }>) {
        if (!entry.hadRecentInput) shifts.push(entry.value);
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
}
