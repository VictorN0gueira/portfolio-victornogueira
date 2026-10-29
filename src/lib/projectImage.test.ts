import { describe, expect, it } from 'vitest';
import { projectImageManifest } from '../data/projectImages';
import { projectImage } from './projectImage';

describe('projectImage', () => {
  it('points src at the widest WebP and the thumbnail at the narrowest', () => {
    const image = projectImage('diagnostico-empresarial/cover');

    expect(image.src).toBe('/projects/diagnostico-empresarial/cover-1600.webp');
    expect(image.thumbSrc).toBe('/projects/diagnostico-empresarial/cover-800.webp');
  });

  it('lists every width in srcSet with a w descriptor, narrowest first', () => {
    const image = projectImage('diagnostico-empresarial/cover');

    expect(image.srcSet).toBe('/projects/diagnostico-empresarial/cover-800.webp 800w, /projects/diagnostico-empresarial/cover-1600.webp 1600w');
  });

  it('copies the size of the widest file from the manifest', () => {
    const entry = projectImageManifest['diagnostico-empresarial/cover'];
    const image = projectImage('diagnostico-empresarial/cover');

    expect(image.width).toBe(entry.width);
    expect(image.height).toBe(entry.height);
    expect(image.width).toBeGreaterThan(0);
    expect(image.height).toBeGreaterThan(0);
  });

  it('gives a cover an absolute share URL on the site domain', () => {
    expect(projectImage('diagnostico-empresarial/cover').shareUrl).toBe('https://vnone.com.br/projects/diagnostico-empresarial/cover-share.jpg');
  });

  it('gives a gallery image no share URL', () => {
    expect(projectImage('diagnostico-empresarial/dashboard').shareUrl).toBeUndefined();
  });

  it('throws on a key the manifest does not know', () => {
    expect(() => projectImage('diagnostico-empresarial/nao-existe')).toThrow(/Unknown project image/);
  });
});
