// Types for scripts/db-credentials.mjs, so the unit tests can import it under strict TypeScript without allowJs.
export function generatePassword(): string;
export function scramSha256Verifier(password: string, iterations?: number, salt?: Buffer): string;
export function mintRoleToken(options: {
  jwtSecret: string;
  role: 'news_writer';
  days?: number;
  now?: () => Date;
}): string;
