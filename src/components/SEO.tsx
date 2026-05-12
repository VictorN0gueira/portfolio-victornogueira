import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
}

const BASE_URL = 'https://vnone.com.br';

const DESCRIPTION =
  'Automações com N8N e IA que eliminam processos manuais e escalam operações — sem equipe de TI. Fluxos inteligentes que geram resultado real.';

const defaults = {
  title: 'Victor Nogueira | Especialista em Automação N8N & IA',
  description: DESCRIPTION,
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
    jobTitle: 'Especialista em Automação N8N e Inteligência Artificial',
    description: DESCRIPTION,
    url: BASE_URL,
    image: pageImage,
    sameAs: [
      'https://www.linkedin.com/in/victornogueira-vn',
      'https://github.com/VictorN0gueira',
    ],
    knowsAbout: [
      'Automação de Processos',
      'N8N',
      'Inteligência Artificial',
      'Agentes de IA',
      'Integração de Sistemas',
      'Eliminação de Processos Manuais',
      'Desenvolvimento Web',
    ],
    hasOccupation: {
      '@type': 'Occupation',
      name: 'Especialista em Automação N8N e IA',
      occupationLocation: { '@type': 'Country', name: 'Brasil' },
    },
    offers: {
      '@type': 'Offer',
      name: 'Serviços de Automação e Inteligência Artificial',
      description:
        'Criação de fluxos automatizados com N8N e IA para eliminar processos manuais, integrar sistemas e escalar operações sem equipe de TI.',
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

  // Schema: FAQPage — pode aparecer como accordion nos resultados do Google
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'O que é automação de processos com N8N?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'N8N é uma plataforma de automação open-source que conecta sistemas e APIs. Com ela, criamos fluxos que executam tarefas repetitivas automaticamente — como envio de e-mails, atualização de planilhas, notificações e integrações entre ferramentas — eliminando trabalho manual.',
        },
      },
      {
        '@type': 'Question',
        name: 'Quais processos posso automatizar com N8N e IA?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'É possível automatizar integrações entre sistemas (CRM, ERP, planilhas), disparo de e-mails e mensagens, extração e transformação de dados, relatórios automáticos e fluxos de aprovação — eliminando trabalho manual e reduzindo erros operacionais.',
        },
      },
      {
        '@type': 'Question',
        name: 'Preciso de uma equipe de TI para implementar automações?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Não. A proposta é justamente escalar operações sem a necessidade de uma equipe de TI interna. As automações são criadas, documentadas e entregues prontas para uso, com suporte e manutenção incluídos.',
        },
      },
    ],
  };

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta
        name="keywords"
        content="automação N8N, especialista N8N, automação de processos, inteligência artificial, agentes de IA, integração de sistemas, automação empresarial, eliminar processos manuais, fluxos automatizados"
      />
      <link rel="canonical" href={pageUrl} />

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
        content="Victor Nogueira — Especialista em Automação N8N e Inteligência Artificial"
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
        content="Victor Nogueira — Especialista em Automação N8N e Inteligência Artificial"
      />

      {/* Structured Data */}
      <script type="application/ld+json">{JSON.stringify(personSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
    </Helmet>
  );
}
