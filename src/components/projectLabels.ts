// Every fixed sentence of the projects pages, in one place: the components render them and the copy guard
// (src/test/projectCopy.ts) scans the same constants, so a text changed here is seen by the guard.

export const PROJECTS_TITLE = 'Projetos';
export const PROJECTS_INTRO =
  'Sistemas que a gente construiu, do atendimento no WhatsApp aos dashboards de vendas. Cada um com as telas e o que faz.';
export const PROJECTS_PAGE_DESCRIPTION =
  'Sistemas de atendimento, automação e IA que a gente construiu, com as telas de cada um: DizPara, Hub081, diagnóstico empresarial, dashboard de CRM e outros.';

export const CARD_CTA_TEXT = 'Ver detalhes';
export const FEATURES_LABEL = 'O que faz';
export const TAGS_LABEL = 'Tecnologias e recursos';
export const BACK_LABEL = 'Todos os projetos';
export const CONTACT_LABEL = 'Vamos conversar';
export const PROJECT_CTA_TEXT = 'Quer algo assim no seu negócio?';
export const NOT_FOUND_TITLE = 'Projeto não encontrado';
export const BREADCRUMB_HOME = 'Início';

/** The accessible name of the group of screenshots of a case page. */
export function galleryLabel(title: string): string {
  return `Telas de ${title}`;
}
