/**
 * The text of the 404, in one place: the page (NotFound), the head the app writes (App) and the static 404.html that
 * the build writes (src/seo/headHtml.ts, only used by scripts/build-seo.mjs) all read it, so they cannot drift apart.
 * DRAFT copy, for the owner to review. The description is the sentence the page shows.
 */
export const notFoundCopy = {
  title: 'Página não encontrada',
  description: 'A página que você procura não existe ou foi movida para outro endereço.',
  back: 'Voltar ao início',
} as const;
