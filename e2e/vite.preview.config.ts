import { existsSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { mergeConfig, type ConfigEnv, type Plugin, type UserConfig } from 'vite';
import { SECURITY_HEADERS } from '../config/securityHeaders.mjs';
import baseConfig from '../vite.config';

// The config of `vite preview` in the Playwright runs. It is the config of the site plus one middleware that answers the way
// nginx.conf does for a build with the prerendered routes (scripts/build-seo.mjs):
//   /servicos        the file servicos/index.html (try_files $uri $uri/index.html)
//   an unknown path  404 with the body of 404.html, which is the app, out of the index
// Without it `vite preview` answers every extensionless path with the home page, and a spec could not tell the HTML of a route
// from the home HTML. The production build config is untouched.

const NOT_FOUND_FILE = '404.html';
const INDEX_FILE = 'index.html';
const HTTP_NOT_FOUND = 404;

function nginxLikeRoutes(): Plugin {
  return {
    name: 'nginx-like-routes',
    configurePreviewServer(server) {
      const outDir = resolve(server.config.root, server.config.build.outDir);

      server.middlewares.use((request, response, next) => {
        const isRead = request.method === 'GET' || request.method === 'HEAD';
        const [pathname, query = ''] = (request.url ?? '/').split('?');
        const hasExtension = extname(pathname) !== '';
        const isRoute = isRead && pathname !== '/' && !pathname.endsWith('/') && !hasExtension;
        if (!isRoute) return next();

        if (existsSync(join(outDir, pathname, INDEX_FILE))) {
          request.url = `${pathname}/${INDEX_FILE}${query ? `?${query}` : ''}`;
          return next();
        }

        // Not a file, not a folder with a page: what nginx answers with error_page 404 /404.html.
        response.statusCode = HTTP_NOT_FOUND;
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.setHeader('Cache-Control', 'no-cache');
        for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.setHeader(name, value);
        response.end(request.method === 'HEAD' ? undefined : readFileSync(join(outDir, NOT_FOUND_FILE)));
      });
    },
  };
}

export default async (env: ConfigEnv): Promise<UserConfig> => {
  const base = typeof baseConfig === 'function' ? await baseConfig(env) : await baseConfig;
  return mergeConfig(base, { plugins: [nginxLikeRoutes()] });
};
