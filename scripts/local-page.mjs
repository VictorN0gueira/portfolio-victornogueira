// What the measuring scripts share so they can never load the real site or its third party hosts: they only open a
// page served from this machine, and every request to another origin is aborted (nothing leaves the computer, and
// the lead webhooks of the business are never reached).

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const DEV_SERVER_PORT = '3000';

/** Throws unless the url is a page on this machine and not the dev server (the owner's own, port 3000). */
export function assertLocalPage(url) {
  const { hostname, port } = new URL(url);
  if (!LOCAL_HOSTS.has(hostname)) throw new Error(`Refusing ${url}: only a page on this machine (localhost or 127.0.0.1)`);
  if (port === DEV_SERVER_PORT) throw new Error('Refusing port 3000: it is the dev server. Use a preview on another port.');
}

/** The route handler that lets the origin of `url` through and aborts everything else. */
export function abortForeignOrigins(url) {
  const origin = new URL(url).origin;
  return (route) => {
    const target = new URL(route.request().url());
    if (target.origin === origin || target.protocol === 'data:' || target.protocol === 'blob:') return route.continue();
    return route.abort();
  };
}
