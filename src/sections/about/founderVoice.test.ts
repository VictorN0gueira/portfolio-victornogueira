// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { founderVoice, type FounderSegment } from './founderVoice';

// The literals below were copied from src/components/About.tsx as it was on b439532 (the text the owner approved). The
// founder's own words do not change with the redesign: this is the guard that says so.
const APPROVED = {
  title: 'Sobre mim',
  place: 'Recife e remoto',
  paragraphs: [
    'Especialista em montar fluxos automatizados e inteligentes, sem precisar de equipes grandes.',
    'Foco em Inteligência Artificial e Desenvolvimento Web, para a operação gastar menos tempo com tarefa manual.',
  ],
  strongParts: ['automatizados e inteligentes', 'Inteligência Artificial e Desenvolvimento Web'],
  cvLabel: 'Baixa o currículo',
  cvUrlPath: '/cv/cv-joao-victor-nogueira.pdf',
  cvFileName: 'CV-Joao-Victor-Nogueira.pdf',
  specialtiesTitle: 'Minhas Especialidades',
  specialties: [
    { id: '01', title: 'Automação de Processos', desc: 'Fluxos automáticos que tiram o retrabalho da rotina.' },
    {
      id: '02',
      title: 'Inteligência Artificial',
      desc: 'LLMs e agentes inteligentes integrados às operações do negócio.',
    },
    { id: '03', title: 'Desenvolvimento Web', desc: 'Interfaces rápidas, feitas para o visitante virar contato.' },
  ],
};

const join = (segments: readonly FounderSegment[]) => segments.map((segment) => segment.text).join('');

describe('founderVoice', () => {
  it('keeps the heading, the place and the specialties title word for word', () => {
    expect(founderVoice.title).toBe(APPROVED.title);
    expect(founderVoice.place).toBe(APPROVED.place);
    expect(founderVoice.specialtiesTitle).toBe(APPROVED.specialtiesTitle);
  });

  it('keeps the two paragraphs word for word, joining their segments', () => {
    expect(founderVoice.paragraphs.map(join)).toEqual(APPROVED.paragraphs);
  });

  it('marks as strong exactly the two phrases the owner highlighted', () => {
    const strong = founderVoice.paragraphs.flatMap((segments) => segments.filter((segment) => segment.isStrong));

    expect(strong.map((segment) => segment.text)).toEqual(APPROVED.strongParts);
  });

  it('keeps the three specialties, their numbers and their lines word for word', () => {
    expect(founderVoice.specialties).toEqual(APPROVED.specialties);
  });

  it('keeps the CV label, the file served by the site and the name it downloads as', () => {
    expect(founderVoice.cvLabel).toBe(APPROVED.cvLabel);
    expect(founderVoice.cvUrlPath).toBe(APPROVED.cvUrlPath);
    expect(founderVoice.cvFileName).toBe(APPROVED.cvFileName);
  });
});
