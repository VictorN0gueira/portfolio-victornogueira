import { BLOG_IMAGE_HOSTS } from '../config/blogImageHosts.mjs';

/**
 * The hosts the network guard (./n8nGuard) knows. This file has no Playwright import, so a unit test can read it.
 * The n8n host is the lead channel of the business: the guard never answers it for a test, the test's own route does.
 */
export const N8N_HOST = 'n8n.vnone.com.br';

/**
 * Hosts the pages load images from: the cover images of the blog (config/blogImageHosts.mjs, the same list the Content
 * Security Policy and the sanitizer use). The guard answers them with a one pixel PNG, so they are never really requested.
 */
export const MOCKED_IMAGE_HOSTS: readonly string[] = [...BLOG_IMAGE_HOSTS];

/** The article feeds the blog reads (the last one is its edge function). The guard answers them with an empty list. */
export const MOCKED_FEED_HOSTS: readonly string[] = ['dev.to', 'www.tabnews.com.br', 'qpcwoioflaxiasmcdfbd.supabase.co'];

/** Every host the guard answers itself. It never holds the n8n host or the host of the page under test. */
export const MOCKED_HOSTS: readonly string[] = [...MOCKED_IMAGE_HOSTS, ...MOCKED_FEED_HOSTS];
