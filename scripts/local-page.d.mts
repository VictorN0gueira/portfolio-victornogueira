// Types for scripts/local-page.mjs, so the unit tests can import it under strict TypeScript without allowJs.
export interface RoutedRequest {
  request(): { url(): string };
  continue(): Promise<void>;
  abort(): Promise<void>;
}

export function assertLocalPage(url: string): void;
export function abortForeignOrigins(url: string): (route: RoutedRequest) => Promise<void>;
