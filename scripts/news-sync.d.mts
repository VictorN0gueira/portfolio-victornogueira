export interface ArticleRow {
  url: string;
  title: string;
  summary: string;
  image: string;
  published_at: string;
  source: string;
  language: 'pt' | 'en';
}

export interface SyncDeps {
  fetchSources: () => Promise<ArticleRow[]>;
  upsert: (rows: ArticleRow[]) => Promise<void>;
  deleteOlderThan: (days: number) => Promise<number>;
  now?: () => Date;
}

export interface SyncResult {
  fetched: number;
  kept: number;
  removed: number;
}

export declare function syncNews(deps: SyncDeps): Promise<SyncResult>;
