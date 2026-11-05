export type FounderSegment = { text: string; isStrong?: boolean };

interface FounderSpecialty {
  id: '01' | '02' | '03';
  title: string;
  desc: string;
}

/**
 * The founder's own words, verbatim from the About text the owner approved. They are in the first person singular on
 * purpose (src/test/copy-rules.test.ts lists this file in VOICE_OWNER_DECISION) and nothing here is reworded.
 */
export const founderVoice = {
  title: 'Sobre mim',
  place: 'Recife e remoto',
  paragraphs: [
    [{ text: 'Especialista em montar fluxos ' }, { text: 'automatizados e inteligentes', isStrong: true }, { text: ', sem precisar de equipes grandes.' }],
    [
      { text: 'Foco em ' },
      { text: 'Inteligência Artificial e Desenvolvimento Web', isStrong: true },
      { text: ', para a operação gastar menos tempo com tarefa manual.' },
    ],
  ] satisfies readonly (readonly FounderSegment[])[],
  cvLabel: 'Baixa o currículo',
  cvUrlPath: '/cv/cv-joao-victor-nogueira.pdf',
  cvFileName: 'CV-Joao-Victor-Nogueira.pdf',
  specialtiesTitle: 'Minhas Especialidades',
  specialties: [
    { id: '01', title: 'Automação de Processos', desc: 'Fluxos automáticos que tiram o retrabalho da rotina.' },
    { id: '02', title: 'Inteligência Artificial', desc: 'LLMs e agentes inteligentes integrados às operações do negócio.' },
    { id: '03', title: 'Desenvolvimento Web', desc: 'Interfaces rápidas, feitas para o visitante virar contato.' },
  ] satisfies readonly FounderSpecialty[],
} as const;
