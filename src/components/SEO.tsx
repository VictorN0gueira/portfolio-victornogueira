import { useEffect } from 'react';
import { serializeJsonLd } from '../lib/jsonLd';
import { SITE, pageTitle } from '../lib/site';
import { routeMetaFor, type RouteMeta } from '../seo/routeMeta';
import { homeEntityNodes, structuredDataFor } from '../seo/structuredData';

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

// The banner of the site is 1200x630. A share image of a page can have another size.
const DEFAULT_IMAGE_WIDTH = 1200;
const DEFAULT_IMAGE_HEIGHT = 630;

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

/**
 * What the head says about the page: what the page passes, else what the route metadata says, else the site defaults. A
 * title the page passes still goes through pageTitle (the brand suffix); the title of the metadata already has the brand.
 */
function resolveShareTags({ title, description, path = '/', image, imageAlt, imageWidth, imageHeight }: SEOProps, meta: RouteMeta | undefined): ShareTags {
  const routeImage = image ? undefined : meta?.image;
  const isDefaultImage = !image && !routeImage;
  return {
    fullTitle: title ? pageTitle(title) : (meta?.title ?? SITE.title),
    description: description || meta?.description || SITE.description,
    pageUrl: `${SITE.url}${path}`,
    image: image || routeImage?.url || SITE.ogImage,
    imageAlt: imageAlt || routeImage?.alt || SITE.ogImageAlt,
    imageWidth: isDefaultImage ? DEFAULT_IMAGE_WIDTH : (routeImage?.width ?? imageWidth),
    imageHeight: isDefaultImage ? DEFAULT_IMAGE_HEIGHT : (routeImage?.height ?? imageHeight),
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

/** The attribute of the static tags of index.html that this component takes over (see the comment there). */
const STATIC_TAG_ATTR = 'data-static-seo';

/**
 * index.html carries the home tags for the crawlers that do not run JavaScript. React hoists the tags of the page into
 * the head next to them instead of replacing them, so once the page is running the static ones are removed: a page then
 * has one description, one og:title and one og:url, and a noindex page does not keep the og:url of the home.
 */
function useDropStaticTags(): void {
  useEffect(() => {
    document.head.querySelectorAll(`[${STATIC_TAG_ATTR}]`).forEach((tag) => tag.remove());
  }, []);
}

/**
 * The JSON-LD of a page. A page that passes its own list keeps it (and the home keeps its entities next to it); a page
 * that passes none gets the nodes of its route. A page out of the index has none.
 */
function schemasFor(path: string, meta: RouteMeta | undefined, isNoindex: boolean, jsonLd: object[] | undefined): object[] {
  if (isNoindex) return [];
  if (jsonLd) return [...(path === '/' ? homeEntityNodes() : []), ...jsonLd];
  return meta ? structuredDataFor(meta) : [];
}

export function SEO(props: SEOProps) {
  const { path = '/', jsonLd } = props;
  useDropStaticTags();
  const meta = routeMetaFor(path);
  // An explicit noindex wins; without one, the route metadata decides (the blog is out of the index).
  const isNoindex = props.noindex ?? meta?.isIndexable === false;
  const tags = resolveShareTags(props, meta);

  return (
    <>
      <title>{tags.fullTitle}</title>
      <meta name="description" content={tags.description} />
      {!isNoindex && <link rel="canonical" href={tags.pageUrl} />}
      {isNoindex && <meta name="robots" content="noindex, nofollow" />}

      {openGraphMeta(tags, isNoindex)}
      {twitterMeta(tags, isNoindex)}

      {/* Uma página noindex (404, projeto removido, blog) não declara canonical, og:url nem dados estruturados. */}
      {schemasFor(path, meta, isNoindex, jsonLd).map((schema, index) => jsonLdScript(schema, index))}
    </>
  );
}

// PrivacyPage and LgpdPage are kept byte identical and still import this default.
export default SEO;
