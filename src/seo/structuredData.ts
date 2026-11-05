import { faqs, type Faq } from '../data/faqs';
import { services } from '../data/services';
import { SOCIAL_LINKS } from '../lib/constants';
import { buildFaqJsonLd } from '../lib/faqJsonLd';
import { SITE } from '../lib/site';
import type { RouteCrumb, RouteMeta } from './routeMeta';

// Schema.org nodes as plain objects. They say only what the site itself says: no rating, no review, no offer, no price,
// no street address (so no LocalBusiness). The services come from the data of the services page, so a change of the list
// changes the nodes with it.

const CONTEXT = 'https://schema.org';
const ORGANIZATION_ID = `${SITE.url}/#organization`;
const WEBSITE_ID = `${SITE.url}/#website`;
const FOUNDER_ID = `${SITE.url}/#founder`;
const LOGO_PATH = '/brand/favicon-512.png';
const LOGO_SIZE = 512;
const SERVICES_PATH = '/servicos';
const SITE_LANGUAGE = 'pt-BR';
const FOUNDER_NAME = 'Victor Nogueira';
const CITY = 'Recife';
const COUNTRY = 'BR';
// Draft of the owner: the names the site is also known by.
const SITE_ALTERNATE_NAMES = ['VN One Automação e IA', 'vnone.com.br'];

/** The profile links of the constants for these networks. A network with no link (an empty href) is left out, never written as "". */
function profileUrls(...labels: Array<'LinkedIn' | 'GitHub' | 'Instagram'>): string[] {
  return labels.flatMap((label) => SOCIAL_LINKS.find((link) => link.label === label)?.href || []);
}

const idRef = (id: string) => ({ '@id': id });

export function organizationNode(): object {
  const organizationProfiles = profileUrls('Instagram');
  const founderProfiles = profileUrls('LinkedIn', 'GitHub');

  return {
    '@context': CONTEXT,
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: SITE.name,
    url: SITE.url,
    logo: { '@type': 'ImageObject', url: `${SITE.url}${LOGO_PATH}`, width: LOGO_SIZE, height: LOGO_SIZE },
    email: SITE.email,
    telephone: SITE.telephone,
    areaServed: COUNTRY,
    address: { '@type': 'PostalAddress', addressLocality: CITY, addressCountry: COUNTRY },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: SITE.telephone,
      availableLanguage: SITE_LANGUAGE,
    },
    ...(organizationProfiles.length > 0 ? { sameAs: organizationProfiles } : {}),
    founder: {
      '@type': 'Person',
      '@id': FOUNDER_ID,
      name: FOUNDER_NAME,
      ...(founderProfiles.length > 0 ? { sameAs: founderProfiles } : {}),
    },
  };
}

export function websiteNode(): object {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE.name,
    alternateName: SITE_ALTERNATE_NAMES,
    url: SITE.url,
    description: SITE.description,
    inLanguage: SITE_LANGUAGE,
    publisher: idRef(ORGANIZATION_ID),
  };
}

/**
 * The provider of a Service, written out in the page. The full Organization is only on the home, and a crawler does not follow
 * an @id to another page, so a bare reference would name nobody. The same @id ties it to the Organization of the home.
 */
function providerNode(): object {
  return { '@type': 'Organization', '@id': ORGANIZATION_ID, name: SITE.name, url: SITE.url };
}

/** One Service per entry of the services data. No Offer and no price: the site does not publish prices. */
export function serviceNodes(): object[] {
  return services.map((service) => ({
    '@context': CONTEXT,
    '@type': 'Service',
    name: service.nome,
    description: service.descricao,
    serviceType: service.categoria,
    url: `${SITE.url}${SERVICES_PATH}#${service.slug}`,
    provider: providerNode(),
    areaServed: COUNTRY,
  }));
}

export function breadcrumbNode(crumbs: readonly RouteCrumb[]): object {
  return {
    '@context': CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${SITE.url}${crumb.path}`,
    })),
  };
}

export function faqNode(items: readonly Faq[]): object {
  return buildFaqJsonLd(items);
}

/** The entities of the home, written whenever the home is the page, whatever else the page adds. */
export function homeEntityNodes(): object[] {
  return [organizationNode(), websiteNode()];
}

/** The nodes of a route, in the order they are written. A route out of the index has none. */
export function structuredDataFor(meta: RouteMeta): object[] {
  if (!meta.isIndexable) return [];

  return [
    ...(meta.kind === 'home' ? homeEntityNodes() : []),
    ...(meta.crumbs.length > 0 ? [breadcrumbNode(meta.crumbs)] : []),
    ...(meta.path === SERVICES_PATH ? serviceNodes() : []),
    ...(meta.hasFaq ? [faqNode(faqs)] : []),
  ];
}
