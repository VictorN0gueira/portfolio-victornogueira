// The text of /sobre that is not the founder's own (his words are in src/sections/about/founderVoice.ts, verbatim from
// the approved About text). RASCUNHO, revisão do Victor pendente: every string below is new, so the owner reviews it in
// chat before the merge. The facts come from what the site already says (SITE.description in lib/site.ts,
// data/process.ts, data/faqs.ts). No number, client, result or price that is not already public.

interface HowRow {
  title: string;
  text: string;
}

export const aboutCopy = {
  /** The caption of the photo: a fact, and the name of the company. */
  photoCaption: 'Victor Nogueira, fundador da VN One',
  company: {
    kicker: 'Empresa',
    heading: 'A VN One',
    paragraphs: [
      'A VN One monta automações e agentes de IA sob medida para empresas.',
      'A gente automatiza o trabalho repetitivo com IA e conecta as ferramentas que você já usa.',
      'O primeiro passo é uma conversa de 30 minutos, sem compromisso, para ver onde a automação mais ajuda.',
    ],
    howTitle: 'Como a gente trabalha',
    how: [
      { title: 'Ciclos semanais', text: 'Cada fluxo é construído e testado em ciclos curtos.' },
      { title: 'Entregas parciais', text: 'A cada ciclo você valida o que ficou pronto.' },
      { title: 'No ar com suporte', text: 'A gente coloca no ar com monitoramento e documentação de uso.' },
    ] satisfies readonly HowRow[],
  },
  tools: {
    kicker: 'Ferramentas',
    heading: 'Stack tecnológica',
    lead: 'Da automação de fluxos às interfaces rápidas.',
    trademarkNote: 'As logos são marcas dos seus donos e aparecem só para dizer com o que a gente trabalha.',
  },
  cta: {
    heading: 'Pronto para automatizar?',
    body: 'Uma conversa de 30 minutos para mapear onde a automação mais ajuda no seu negócio.',
    label: 'Vamos conversar',
    whatsappMessage: 'Olá! Vim pelo site da VN One e quero conversar sobre automação.',
  },
} as const;
