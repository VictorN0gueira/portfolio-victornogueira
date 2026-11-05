import { describe, expect, it } from 'vitest';
import { getProjectBySlug, projects, type Project } from '../../data/projects';
import { STICKY_COLUMN_CLASSES, STICKY_MIN_HEIGHT_PX, STICKY_TOP_PX, stickyColumnOf } from './stickyColumn';

// What was measured on the rendered case pages (lg and up): the tallest column that sticks is the gallery of Hub081, 577px.
const TALLEST_STICKY_COLUMN_PX = 577;

function projectOf(slug: string): Project {
  const project = getProjectBySlug(slug);
  if (!project) throw new Error(`project ${slug} is missing`);
  return project;
}

describe('stickyColumnOf', () => {
  it('sticks the gallery of a featured project that lists what it does: long facts beside a short gallery', () => {
    expect(stickyColumnOf(projectOf('dizpara'))).toBe('gallery');
    expect(stickyColumnOf(projectOf('hub081'))).toBe('gallery');
  });

  it('sticks the facts of a regular project: short facts beside three stacked shots', () => {
    for (const project of projects.filter((item) => !item.featured)) expect(stickyColumnOf(project)).toBe('facts');
  });

  it('follows the content and not the flag alone: a featured project without features sticks its facts', () => {
    expect(stickyColumnOf({ ...projectOf('dizpara'), features: undefined })).toBe('facts');
    expect(stickyColumnOf({ ...projectOf('dizpara'), features: [] })).toBe('facts');
  });

  it('keeps the facts sticky for a regular project that gets features, because its stacked gallery is still the taller column', () => {
    expect(stickyColumnOf({ ...projectOf('travel-ia'), features: ['Faz uma coisa.', 'Faz outra.'] })).toBe('facts');
  });
});

describe('the height a column needs to stick', () => {
  it('leaves room for the tallest sticky column under the sticky offset, with some air', () => {
    expect(STICKY_MIN_HEIGHT_PX).toBeGreaterThanOrEqual(STICKY_TOP_PX + TALLEST_STICKY_COLUMN_PX);
  });

  it('sticks only from lg and only in a window tall enough, with the one shared class string', () => {
    expect(STICKY_COLUMN_CLASSES).toContain(`[@media(min-height:${STICKY_MIN_HEIGHT_PX}px)]`);
    expect(STICKY_COLUMN_CLASSES).toContain('lg:');
    expect(STICKY_COLUMN_CLASSES).toContain('top-28');
    expect(STICKY_TOP_PX).toBe(112);
  });
});
