export interface Check {
  name: 'articles-readable' | 'leads-not-readable' | 'articles-not-writable' | 'articles-not-deletable';
  ok: boolean;
}

export interface VerifyOptions {
  url: string;
  anonKey: string;
  fetch?: typeof fetch;
}

export declare function verifyAsAnon(options: VerifyOptions): Promise<Check[]>;
