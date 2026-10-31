import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { stubMatchMedia } from '../test/matchMedia';
import { About } from './About';

const CV_PUBLIC_PATH = '/cv/cv-joao-victor-nogueira.pdf';
const CV_DISK_PATH = resolve(process.cwd(), 'public/cv/cv-joao-victor-nogueira.pdf');
const ABOUT_SOURCE_PATH = resolve(process.cwd(), 'src/components/About.tsx');
const PDF_MAGIC = '%PDF-';

describe('About CV download', () => {
  it('points the download link at the CV served from the site itself', () => {
    stubMatchMedia();
    render(<About />);

    const link = screen.getByRole('link', { name: 'Baixar Currículo' });

    expect(link.getAttribute('href')).toMatch(/\/cv\/cv-joao-victor-nogueira\.pdf$/);
    expect(link).toHaveAttribute('download', 'CV-Joao-Victor-Nogueira.pdf');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('ships a real PDF file under public/cv', () => {
    expect(existsSync(CV_DISK_PATH)).toBe(true);
    expect(statSync(CV_DISK_PATH).size).toBeGreaterThan(0);
    expect(readFileSync(CV_DISK_PATH).subarray(0, PDF_MAGIC.length).toString('latin1')).toBe(PDF_MAGIC);
    expect(CV_DISK_PATH.replaceAll('\\', '/').endsWith(`public${CV_PUBLIC_PATH}`)).toBe(true);
  });

  it('keeps no MinIO URL or env override in the About source', () => {
    const source = readFileSync(ABOUT_SOURCE_PATH, 'utf8');

    expect(source).not.toMatch(/minio/i);
    expect(source).not.toContain('VITE_CV_URL');
  });
});
