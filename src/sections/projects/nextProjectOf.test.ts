import { describe, expect, it } from 'vitest';
import { projects } from '../../data/projects';
import { nextProjectOf } from './nextProjectOf';

describe('nextProjectOf', () => {
  it('gives the project that follows in the list', () => {
    expect(nextProjectOf('dizpara')?.slug).toBe('hub081');
    expect(nextProjectOf('hub081')?.slug).toBe('diagnostico-empresarial');
  });

  it('goes through the whole list once and comes back to the first', () => {
    const walked = projects.map((project) => nextProjectOf(project.slug)?.slug);

    expect(walked).toEqual([...projects.slice(1), projects[0]].map((project) => project.slug));
  });

  it('sends the last project back to the first', () => {
    expect(nextProjectOf(projects[projects.length - 1].slug)).toBe(projects[0]);
  });

  it('gives the project itself when the list has only one', () => {
    const [only] = projects;

    expect(nextProjectOf(only.slug, [only])).toBe(only);
  });

  it('gives the first project of the list for a slug that is not in it', () => {
    expect(nextProjectOf('nao-existe')).toBe(projects[0]);
    expect(nextProjectOf('nao-existe', projects.slice(2))).toBe(projects[2]);
  });

  it('gives nothing for an empty list, instead of throwing', () => {
    expect(nextProjectOf('dizpara', [])).toBeUndefined();
  });
});
