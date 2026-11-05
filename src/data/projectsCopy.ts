// The sentences the projects pages added with the redesign of plan 3. RASCUNHO: the owner reviews them in chat.
// The older ones stay in src/components/projectLabels.ts. Both are read by src/test/projectCopy.ts, and this file is in
// src/data, so src/test/copy-rules.test.ts scans it too.

export const projectsCopy = {
  /** The kicker over the h1 of /projetos. */
  listKicker: 'projetos',
  /** The closing band of /projetos and of a case page, under the heading PROJECT_CTA_TEXT. */
  ctaBody: 'Conta o que você quer montar e a gente diz por onde começar.',
  ctaWhatsappMessage: 'Olá! Vi os projetos no site da VN One e quero conversar sobre algo parecido.',
  /** The heading of the closing band of a case page. The invite in the column of facts keeps PROJECT_CTA_TEXT. */
  caseCtaHeading: 'Tem uma ideia parecida?',
  /** The label of the category in the column of facts of a case page. */
  categoryLabel: 'Categoria',
  /** The kicker of the next project, at the end of a case page. */
  nextKicker: 'próximo projeto',
} as const;
