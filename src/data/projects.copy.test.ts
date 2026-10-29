// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { projects, type Project } from './projects';

const DASHES = /[\u2013\u2014]/;
const SLASH_SEPARATOR = / \/ /;
const SALES_WORDS = /orquestrad|moderna|inteligente|revolucion|incr[ií]vel/i;

/** Every sentence a visitor can read on the projects pages, plus the alt texts of the images. */
function copyOf(project: Project): string[] {
  return [
    project.title,
    project.category,
    project.description,
    project.highlight ?? '',
    ...(project.features ?? []),
    ...project.tags,
    ...(project.impact ?? []).flatMap((item) => [item.label, item.value]),
    ...project.shots.map((shot) => shot.alt),
  ].filter((text) => text.length > 0);
}

function offendersOf(pattern: RegExp): string[] {
  return projects.flatMap((project) =>
    copyOf(project)
      .filter((text) => pattern.test(text))
      .map((text) => `${project.slug}: ${text}`),
  );
}

describe('projects copy', () => {
  it('uses no em dash and no en dash anywhere in a project', () => {
    expect(offendersOf(DASHES)).toEqual([]);
  });

  it('uses no " / " as a separator anywhere in a project', () => {
    expect(offendersOf(SLASH_SEPARATOR)).toEqual([]);
  });

  it('keeps sales wording out of the copy', () => {
    expect(offendersOf(SALES_WORDS)).toEqual([]);
  });
});
