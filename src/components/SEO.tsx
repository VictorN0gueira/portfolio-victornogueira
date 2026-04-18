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
  const pageImage = image || DEFAULT_IMAGE;

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
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content="Victor Nogueira" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />

      {/* Structured Data - Professional Service */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'ProfessionalService',
          name: 'Victor Nogueira - Automação & IA',
          description: pageDescription,
          url: BASE_URL,
          areaServed: 'BR',
          serviceType: [
            'Automação de Processos',
            'Inteligência Artificial',
            'Desenvolvimento Web',
          ],
          contactPoint: {
            '@type': 'ContactPoint',
            email: 'contato@vnone.com.br',
            telephone: '+55-81-98734-8633',
            contactType: 'customer service',
            availableLanguage: ['Portuguese', 'English'],
          },
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Recife',
            addressRegion: 'PE',
            addressCountry: 'BR',
          },
        })}
      </script>
    </Helmet>
  );
}
