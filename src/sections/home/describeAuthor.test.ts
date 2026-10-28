import { describe, expect, it } from 'vitest';
import { testimonials } from '../../data/testimonials';
import { describeAuthor } from './describeAuthor';

describe('describeAuthor', () => {
  it('gives the role and the company, joined by a comma', () => {
    expect(describeAuthor({ name: 'Paulo Santos', role: 'CEO', company: 'Proplast' })).toBe('CEO, Proplast');
  });

  it('gives the role alone when the company is the author name again', () => {
    expect(describeAuthor({ name: 'Micael Santiago', role: 'Desenvolvedor', company: 'Micael Santiago' })).toBe('Desenvolvedor');
  });

  it('ignores spaces around the company and the name and the case of their letters', () => {
    expect(describeAuthor({ name: 'Micael Santiago', role: 'Desenvolvedor', company: ' micael santiago ' })).toBe('Desenvolvedor');
    expect(describeAuthor({ name: ' MICAEL SANTIAGO', role: 'Desenvolvedor', company: 'Micael Santiago  ' })).toBe('Desenvolvedor');
  });

  it('ignores accents when it compares them', () => {
    expect(describeAuthor({ name: 'Karla Alvares', role: 'Proprietária', company: 'Karla Alvarés' })).toBe('Proprietária');
    expect(describeAuthor({ name: 'Henrique França', role: 'CEO', company: 'Henrique Franca' })).toBe('CEO');
  });

  it('keeps a company that only contains the name, such as a store that carries it', () => {
    expect(describeAuthor({ name: 'Karla Alvarés', role: 'Proprietária', company: 'Loja Karla Alvarés' })).toBe(
      'Proprietária, Loja Karla Alvarés',
    );
  });

  it('gives the company alone when there is no role', () => {
    expect(describeAuthor({ name: 'Paulo Santos', role: '', company: 'Proplast' })).toBe('Proplast');
  });

  it('gives an empty text when there is nothing to say', () => {
    expect(describeAuthor({ name: 'Paulo Santos', role: '', company: 'Paulo Santos' })).toBe('');
  });

  it('never repeats the author name in the real testimonials', () => {
    for (const item of testimonials) {
      const text = describeAuthor(item);

      expect(text.startsWith(item.role)).toBe(true);
      expect(text === item.role || text === `${item.role}, ${item.company}`).toBe(true);
    }
    expect(describeAuthor(testimonials[3])).toBe('Desenvolvedor');
    expect(describeAuthor(testimonials[4])).toBe('CEO');
    expect(describeAuthor(testimonials[0])).toBe('CEO, Contador de Padarias');
  });
});
