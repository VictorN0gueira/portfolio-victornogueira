import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  /** Bloqueia indexação (ex.: 404, slug inválido) */
  noindex?: boolean;
  /** Schemas JSON-LD específicos da página (ex.: FAQPage em /contato) */
  jsonLd?: object[];
}

const BASE_URL = 'https://vnone.com.br';

const DESCRIPTION =
  'Automações inteligentes com IA que eliminam processos manuais e escalam operações — sem equipe de TI. Fluxos que geram resultado real.';

const defaults = {
  title: 'Victor Nogueira | Automação Inteligente & IA',
  description: DESCRIPTION,
};

export default function SEO({
  title,
  description,
  path = '/',
  image,
  noindex,
  jsonLd,
}: SEOProps) {
  const pageTitle = title ? `${title} | Victor Nogueira` : defaults.title;
  const pageDescription = description || defaults.description;
  const pageUrl = `${BASE_URL}${path}`;
  const pageImage = image || 'https://vnone.com.br/og-banner.png?v=2';

  // Schema: Person
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Victor Nogueira',
    jobTitle: 'Especialista em Automação Inteligente e IA',
    description: DESCRIPTION,
    url: BASE_URL,
    image: pageImage,
    sameAs: [
      'https://www.linkedin.com/in/victornogueira-vn',
      'https://github.com/VictorN0gueira',
    ],
    knowsAbout: [
      'Automação de Processos',
      'Inteligência Artificial',
      'Agentes de IA',
      'Integração de Sistemas',
      'Eliminação de Processos Manuais',
      'Desenvolvimento Web',
    ],
    hasOccupation: {
      '@type': 'Occupation',
      name: 'Especialista em Automação Inteligente e IA',
      occupationLocation: { '@type': 'Country', name: 'Brasil' },
    },
    offers: {
      '@type': 'Offer',
      name: 'Serviços de Automação e Inteligência Artificial',
      description:
        'Criação de fluxos automatizados com IA para eliminar processos manuais, integrar sistemas e escalar operações sem equipe de TI.',
    },
  };

  // Schema: WebSite
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Victor Nogueira — Portfólio',
    url: BASE_URL,
    description: DESCRIPTION,
  };

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta
        name="keywords"
        content="automação de processos, automação inteligente, inteligência artificial, agentes de IA, integração de sistemas, automação empresarial, eliminar processos manuais, fluxos automatizados"
      />
      <link rel="canonical" href={pageUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta
        property="og:image:alt"
        content="Victor Nogueira — Especialista em Automação Inteligente e IA"
      />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content="Victor Nogueira" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />
      <meta
        name="twitter:image:alt"
        content="Victor Nogueira — Especialista em Automação Inteligente e IA"
      />

      {/* Structured Data — Person/WebSite só na home para evitar entidade duplicada */}
      {path === '/' && (
        <script type="application/ld+json">{JSON.stringify(personSchema)}</script>
      )}
      {path === '/' && (
        <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
      )}
      {jsonLd?.map((schema, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(schema)}</script>
      ))}
    </Helmet>
  );
}
