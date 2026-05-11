import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
}

const BASE_URL = 'https://vnone.com.br';
const DEFAULT_IMAGE = 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FLogo%20-%20s.%20fundo.png&version_id=null';

const defaults = {
  title: 'Victor Nogueira — Automação & IA',
  description:
    'Especialista em transformar processos manuais em fluxos automatizados e inteligentes. N8N, Inteligência Artificial e Desenvolvimento Web para escalar negócios.',
};

export default function SEO({
  title,
  description,
  path = '/',
  image,
}: SEOProps) {
  const pageTitle = title ? `${title} | Victor Nogueira` : defaults.title;
  const pageDescription = description || defaults.description;
  const pageUrl = `${BASE_URL}${path}`;
  const pageImage = image || 'https://vnone.com.br/og-banner.png';

  // Schema: Person
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Victor Nogueira',
    jobTitle: 'Especialista em Automação & Inteligência Artificial',
    url: BASE_URL,
    image: pageImage,
    sameAs: [
      'https://www.linkedin.com/in/victornogueira-vn',
      'https://github.com/VictorN0gueira',
    ],
    knowsAbout: ['Automação de Processos', 'N8N', 'Inteligência Artificial', 'Desenvolvimento Web'],
  };

  // Schema: WebSite
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Victor Nogueira - Portfólio',
    url: BASE_URL,
    description: defaults.description,
  };

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <link rel="canonical" href={pageUrl} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content="Victor Nogueira" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(personSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema)}
      </script>
    </Helmet>
  );
}
