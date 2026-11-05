/**
 * The text of the /servicos page. The services themselves are in data/services.ts. Strings marked "existing" are the
 * ones the page already shows; the rest is a draft the owner reviews.
 */
export const servicesCopy = {
  hero: {
    kicker: 'O que a gente entrega',
    title: 'Serviços',
    lead: 'Escopo claro e prazo definido, do primeiro fluxo automatizado ao sistema completo.',
  },
  // The list has no heading of its own (the h1 comes right before it and every card is an h2): this names the region.
  gridLabel: 'Lista de serviços',
  combos: {
    // Draft: the old kicker promised a discount, and the combos carry none in the data.
    kicker: 'Pacotes',
    heading: 'Combos',
  },
  cta: {
    heading: 'Não sabe por onde começar?',
    body: 'Na consulta gratuita a gente identifica qual serviço resolve o seu gargalo, sem compromisso.',
    label: 'Agenda uma consulta gratuita',
    // Draft.
    whatsappMessage: 'Olá! Vim pelo site da VN One e quero ajuda para escolher um serviço.',
  },
} as const;
