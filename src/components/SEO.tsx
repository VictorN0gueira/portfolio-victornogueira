import { SOCIAL_LINKS } from '../lib/constants';
import { serializeJsonLd } from '../lib/jsonLd';
import { SITE, pageTitle } from '../lib/site';

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  /** Texto alternativo da imagem de compartilhamento. Padrão: o do banner do site */
  imageAlt?: string;
  /** Tamanho da imagem própria, quando conhecido (as imagens de compartilhamento dos projetos têm 1200x630) */
  imageWidth?: number;
  imageHeight?: number;
  /** Bloqueia indexação (ex.: 404, slug inválido) */
  noindex?: boolean;
  /** Schemas JSON-LD específicos da página (ex.: FAQPage em /contato) */
  jsonLd?: object[];
}

const LOGO_URL = `${SITE.url}/brand/vn-one-logo-dark.webp`;
// O banner padrão tem 1200x630. Uma imagem própria pode ter outro tamanho.
const DEFAULT_IMAGE_WIDTH = 1200;
const DEFAULT_IMAGE_HEIGHT = 630;

/** The profile links of the constants for these networks. A network with no link (an empty href) is left out, never written as "". */
function profileUrls(...labels: Array<'LinkedIn' | 'GitHub' | 'Instagram'>): string[] {
  return labels.flatMap((label) => SOCIAL_LINKS.find((link) => link.label === label)?.href || []);
}

const organizationProfiles = profileUrls('Instagram');

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE.name,
  url: SITE.url,
  logo: LOGO_URL,
  email: SITE.email,
  telephone: SITE.telephone,
  areaServed: 'BR',
  ...(organizationProfiles.length > 0 ? { sameAs: organizationProfiles } : {}),
  founder: {
    '@type': 'Person',
    name: 'Victor Nogueira',
    sameAs: profileUrls('LinkedIn', 'GitHub'),
  },
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
};

// React hoists the title, meta and link elements into the document head, so these builders are plain functions that return
// elements (arrays are flattened), never components.

/** One JSON-LD script. The text goes through serializeJsonLd, so no value can close the element. */
function jsonLdScript(schema: object, key: string | number) {
  return (
    <script key={key} type="application/ld+json">
      {serializeJsonLd(schema)}
    </script>
  );
}

interface ShareTags {
  fullTitle: string;
  description: string;
  pageUrl: string;
  image: string;
  imageAlt: string;
  imageWidth: number | undefined;
  imageHeight: number | undefined;
}

/** What the head says about the page, with the site defaults filled in. */
function resolveShareTags({ title, description, path = '/', image, imageAlt, imageWidth, imageHeight }: SEOProps): ShareTags {
  const isDefaultImage = !image;
  return {
    fullTitle: pageTitle(title),
    description: description || SITE.description,
    pageUrl: `${SITE.url}${path}`,
    image: image || SITE.ogImage,
    imageAlt: imageAlt || SITE.ogImageAlt,
    imageWidth: isDefaultImage ? DEFAULT_IMAGE_WIDTH : imageWidth,
    imageHeight: isDefaultImage ? DEFAULT_IMAGE_HEIGHT : imageHeight,
  };
}

function openGraphMeta(tags: ShareTags, noindex?: boolean) {
  const { fullTitle, description, pageUrl, image, imageAlt, imageWidth, imageHeight } = tags;
  return [
    <meta key="og:type" property="og:type" content="website" />,
    !noindex && <meta key="og:url" property="og:url" content={pageUrl} />,
    <meta key="og:title" property="og:title" content={fullTitle} />,
    <meta key="og:description" property="og:description" content={description} />,
    <meta key="og:image" property="og:image" content={image} />,
    imageWidth && <meta key="og:image:width" property="og:image:width" content={String(imageWidth)} />,
    imageHeight && <meta key="og:image:height" property="og:image:height" content={String(imageHeight)} />,
    <meta key="og:image:alt" property="og:image:alt" content={imageAlt} />,
    <meta key="og:locale" property="og:locale" content="pt_BR" />,
    <meta key="og:site_name" property="og:site_name" content={SITE.name} />,
  ];
}

function twitterMeta(tags: ShareTags, noindex?: boolean) {
  const { fullTitle, description, pageUrl, image, imageAlt } = tags;
  return [
    <meta key="twitter:card" name="twitter:card" content="summary_large_image" />,
    !noindex && <meta key="twitter:url" name="twitter:url" content={pageUrl} />,
    <meta key="twitter:title" name="twitter:title" content={fullTitle} />,
    <meta key="twitter:description" name="twitter:description" content={description} />,
    <meta key="twitter:image" name="twitter:image" content={image} />,
    <meta key="twitter:image:alt" name="twitter:image:alt" content={imageAlt} />,
  ];
}

export function SEO(props: SEOProps) {
  const { path = '/', noindex, jsonLd } = props;
  const tags = resolveShareTags(props);
  // Uma página noindex (404, projeto removido) não declara canonical, og:url nem entidades da home.
  const isHome = path === '/' && !noindex;

  return (
    <>
      <title>{tags.fullTitle}</title>
      <meta name="description" content={tags.description} />
      {!noindex && <link rel="canonical" href={tags.pageUrl} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {openGraphMeta(tags, noindex)}
      {twitterMeta(tags, noindex)}

      {/* Dados estruturados: Organization e WebSite só na home para evitar entidade duplicada */}
      {isHome && jsonLdScript(organizationSchema, 'organization')}
      {isHome && jsonLdScript(websiteSchema, 'website')}
      {!noindex && jsonLd?.map((schema, index) => jsonLdScript(schema, index))}
    </>
  );
}

// PrivacyPage and LgpdPage are kept byte identical and still import this default.
export default SEO;
