import { normalizePath, PAGE_METAS, type RouteMeta } from './pageMeta';
import { PROJECT_METAS } from './projectMeta';

// One source for what the head says about each public route. Pure data, no React. The build step (batch R) reads this
// module for the static HTML and the sitemap, and the tests read it for the whole list.
//
// The SEO component does NOT import this module: it would pull the project data into the critical path of every page.
// It loads pageMeta.ts (the home and the inner pages), and the page of a project hands it the meta from projectMeta.ts.

export type { RouteCrumb, RouteImage, RouteKind, RouteMeta } from './pageMeta';

export const ROUTE_METAS: readonly RouteMeta[] = [...PAGE_METAS, ...PROJECT_METAS];

const ROUTE_BY_PATH: ReadonlyMap<string, RouteMeta> = new Map(ROUTE_METAS.map((meta) => [meta.path, meta]));

/** The meta of a path. A trailing slash, a query string and a hash do not matter. A path the site does not serve gives undefined. */
export function routeMetaFor(path: string): RouteMeta | undefined {
  return ROUTE_BY_PATH.get(normalizePath(path));
}
