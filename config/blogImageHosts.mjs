// The hosts a cover image of the blog may come from. One list, two readers: src/utils/newsSanitize.ts (an image from any
// other host is never requested) and the Content-Security-Policy (config/securityHeaders.mjs can build `img-src` from
// BLOG_IMG_SRC instead of the wildcard `https:`). Plain data in a .mjs file so a Node config can import it without TypeScript.

/** The hosts, bare, lowercase, no port. Every one is https only. */
export const BLOG_IMAGE_HOSTS = [
  'images.unsplash.com',
  'media.dev.to',
  'media2.dev.to',
  'dev-to-uploads.s3.amazonaws.com',
  'res.cloudinary.com',
];

/**
 * res.cloudinary.com serves every Cloudinary account, so only the account dev.to uses for its covers counts: a path under
 * it, never another account (that would be a free tracking pixel host for anyone).
 */
export const CLOUDINARY_HOST = 'res.cloudinary.com';
export const CLOUDINARY_PATH_PREFIX = '/practicaldev/';

/**
 * The sources for the `img-src` directive: each host as an https origin, plus `data:` (the fallback image of the blog is a
 * data:image/svg+xml URI). Add 'self' in the policy; this list is only what the blog needs beyond it.
 */
export const BLOG_IMG_SRC = [...BLOG_IMAGE_HOSTS.map((host) => `https://${host}`), 'data:'];
