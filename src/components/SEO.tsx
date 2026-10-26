import { Helmet } from 'react-helmet-async';
import { SITE, pageTitle } from '../lib/site';

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  /** Texto alternativo da imagem de compartilhamento. Padrão: o do banner do site */
  imageAlt?: string;
  /** Bloqueia indexação (ex.: 404, slug inválido) */
  noindex?: boolean;
  /** Schemas JSON-LD específicos da página (ex.: FAQPage em /contato) */
  jsonLd?: object[];
}

const LOGO_URL = `${SITE.url}/brand/vn-one-logo-dark.webp`;

const FOUNDER_PROFILES = [
  'https://www.linkedin.com/in/victornogueira-vn',
  'https://github.com/VictorN0gueira',
];

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE.name,
  url: SITE.url,
  logo: LOGO_URL,
  email: SITE.email,
  telephone: SITE.telephone,
  areaServed: 'BR',
  founder: {
    '@type': 'Person',
    name: 'Victor Nogueira',
    sameAs: FOUNDER_PROFILES,
  },
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
};

export default function SEO({
  title,
  description,
  path = '/',
  image,
  imageAlt,
  noindex,
  jsonLd,
}: SEOProps) {
  const fullTitle = pageTitle(title);
  const pageDescription = description || SITE.description;
  const pageUrl = `${SITE.url}${path}`;
  const pageImage = image || SITE.ogImage;
  const pageImageAlt = imageAlt || SITE.ogImageAlt;
  // O banner padrão tem 1200x630. Uma imagem própria pode ter outro tamanho.
  const isDefaultImage = !image;
  const isHome = path === '/';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={pageDescription} />
      <link rel="canonical" href={pageUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={pageImage} />
      {isDefaultImage && <meta property="og:image:width" content="1200" />}
      {isDefaultImage && <meta property="og:image:height" content="630" />}
      <meta property="og:image:alt" content={pageImageAlt} />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content={SITE.name} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />
      <meta name="twitter:image:alt" content={pageImageAlt} />

      {/* Dados estruturados: Organization e WebSite só na home para evitar entidade duplicada */}
      {isHome && (
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
      )}
      {isHome && (
        <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
      )}
      {jsonLd?.map((schema, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(schema)}</script>
      ))}
    </Helmet>
  );
}
