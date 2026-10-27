import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAIN_NAV } from '../../data/navigation';
import { services } from '../../data/services';
import { CONTACT_EMAIL, SOCIAL_LINKS, WHATSAPP_DISPLAY, WHATSAPP_NUMBER } from '../../lib/constants';
import { triggerIntersection } from '../../test/intersection';
import { renderWithProviders } from '../../test/render';
import Footer from './Footer';

const A11Y_STORAGE_KEY = 'a11y-preferences';
const HIDDEN_CLIP = /inset\(100%/;
const SHOWN_CLIP = /inset\(0(%| 0| ?\))/;

function renderFooter() {
  renderWithProviders(<Footer />);
  return screen.getByRole('contentinfo');
}

function column(footer: HTMLElement, title: string): HTMLElement {
  const heading = within(footer).getByRole('heading', { name: title });
  return heading.parentElement as HTMLElement;
}

function wordmark(footer: HTMLElement): HTMLElement {
  return footer.querySelector('[data-footer-wordmark]') as HTMLElement;
}

describe('Footer', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  describe('shell', () => {
    it('is the black rodape landmark with rounded top corners', () => {
      const footer = renderFooter();

      expect(footer).toHaveAttribute('id', 'rodape');
      expect(footer).toHaveClass('bg-vn-black', 'text-vn-white', 'rounded-t-[clamp(24px,4vw,40px)]');
    });

    it('lays the columns out as 4 at lg, 2 from 360px and 1 below that', () => {
      const footer = renderFooter();

      const grid = column(footer, 'Navegação').parentElement as HTMLElement;
      expect(grid).toHaveClass('grid', 'grid-cols-1', 'min-[360px]:grid-cols-2', 'lg:grid-cols-4');
      expect(grid.children).toHaveLength(4);
    });

    it('shows the logo for dark surfaces, loaded lazily, inside the home link', () => {
      const footer = renderFooter();

      const logo = within(footer).getByAltText('VN One');
      expect(logo.getAttribute('src')).toMatch(/vn-one-logo-chrome\.webp$/);
      expect(logo).toHaveAttribute('loading', 'lazy');
      expect(logo.closest('a')).toHaveAttribute('href', '/');
    });

    it('reserves bottom padding so the floating WhatsApp button never covers a link', () => {
      const footer = renderFooter();

      expect(footer.querySelector('[class*="pb-[calc(6rem+env(safe-area-inset-bottom))]"]')).toBeInTheDocument();
    });
  });

  describe('columns', () => {
    it('has the four columns, with titles lowercased by CSS', () => {
      const footer = renderFooter();

      const titles = within(footer)
        .getAllByRole('heading')
        .map((heading) => heading.textContent);
      expect(titles).toEqual(['Navegação', 'Serviços', 'Contato', 'Legal']);
      for (const heading of within(footer).getAllByRole('heading')) {
        expect(heading).toHaveClass('lowercase');
      }
    });

    it('exposes the sitemap and the legal links as two named navigation landmarks', () => {
      const footer = renderFooter();

      const sitemap = within(footer).getByRole('navigation', { name: 'Rodapé' });
      expect(within(sitemap).getByRole('heading', { name: 'Navegação' })).toBeInTheDocument();
      expect(within(sitemap).getByRole('link', { name: 'Serviços' })).toHaveAttribute('href', '/servicos');
      expect(within(sitemap).getByRole('link', { name: 'Contato' })).toHaveAttribute('href', '/contato');

      const legal = within(footer).getByRole('navigation', { name: 'Legal' });
      expect(within(legal).getByRole('heading', { name: 'Legal' })).toBeInTheDocument();
      expect(within(legal).getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade');
      expect(within(legal).getByRole('link', { name: 'LGPD' })).toHaveAttribute('href', '/lgpd');
      expect(within(footer).getAllByRole('navigation')).toHaveLength(2);
    });

    it('lists the main nav and a Contato link in Navegação', () => {
      const footer = renderFooter();

      const links = within(column(footer, 'Navegação')).getAllByRole('link');
      expect(links.map((link) => link.textContent)).toEqual([...MAIN_NAV.map((item) => item.label), 'Contato']);
      expect(links.map((link) => link.getAttribute('href'))).toEqual([...MAIN_NAV.map((item) => item.to), '/contato']);
    });

    it('links to /servicos once per category of service', () => {
      const footer = renderFooter();

      const categories = [...new Set(services.map((service) => service.categoria))];
      const links = within(column(footer, 'Serviços')).getAllByRole('link');
      expect(links.map((link) => link.textContent)).toEqual(categories);
      for (const link of links) {
        expect(link).toHaveAttribute('href', '/servicos');
      }
    });

    it('gives the WhatsApp number, the e-mail and the city in Contato', () => {
      const footer = renderFooter();
      const contact = within(column(footer, 'Contato'));

      const whatsapp = contact.getByRole('link', { name: WHATSAPP_DISPLAY });
      expect(whatsapp.getAttribute('href')).toContain(`https://wa.me/${WHATSAPP_NUMBER}`);
      expect(whatsapp).toHaveAttribute('target', '_blank');
      expect(whatsapp).toHaveAttribute('rel', 'noopener noreferrer');
      expect(contact.getByRole('link', { name: CONTACT_EMAIL })).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`);
      expect(contact.getByText('Recife e remoto')).toBeInTheDocument();
    });

    it('links the privacy policy and the LGPD page in Legal', () => {
      const footer = renderFooter();
      const legal = within(column(footer, 'Legal'));

      expect(legal.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade');
      expect(legal.getByRole('link', { name: 'LGPD' })).toHaveAttribute('href', '/lgpd');
    });

    it('makes every footer link at least 44px tall', () => {
      const footer = renderFooter();

      const textLinks = within(footer)
        .getAllByRole('link')
        .filter((link) => !SOCIAL_LINKS.some((social) => social.label === link.getAttribute('aria-label')));
      expect(textLinks.length).toBeGreaterThan(8);
      for (const link of textLinks) {
        expect(link).toHaveClass('min-h-11');
      }
    });
  });

  describe('bottom bar', () => {
    it('shows the current year and the brand', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2031-06-15T12:00:00Z'));

      const footer = renderFooter();

      expect(within(footer).getByText(/2031 VN One/)).toBeInTheDocument();
    });

    it('links every social profile in a new tab with a name and a 44px target', () => {
      const footer = renderFooter();

      for (const { label, href } of SOCIAL_LINKS) {
        const link = within(footer).getByRole('link', { name: label });
        expect(link).toHaveAttribute('href', href);
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        expect(link).toHaveClass('size-11');
        expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
      }
    });
  });

  describe('wordmark', () => {
    it('is the giant "vn one" in chrome, hidden from assistive tech and replaced by a screen reader text', () => {
      const footer = renderFooter();
      const mark = wordmark(footer);

      expect(mark).toHaveTextContent('vn one');
      expect(mark).toHaveAttribute('aria-hidden', 'true');
      expect(mark).toHaveClass('font-display', 'font-bold', 'vn-chrome-text', 'whitespace-nowrap', 'overflow-clip');
      expect(mark.getAttribute('style')).toContain('min(clamp(4.5rem, 22vw, 20rem), 33cqw)');
      expect(within(footer).getAllByText('VN One').some((node) => node.className.includes('sr-only'))).toBe(true);
    });

    it('never outgrows its box: the size is also capped at 33cqw of a container-sized wrapper', () => {
      const footer = renderFooter();

      expect(wordmark(footer).parentElement).toHaveClass('[container-type:inline-size]');
    });

    it('keeps 2rem free on each side below sm, so the fixed accessibility tab never covers the last letter', () => {
      const footer = renderFooter();

      expect(wordmark(footer).parentElement).toHaveClass('max-sm:px-8');
    });

    it('starts clipped away and unveils once it enters the view', async () => {
      const footer = renderFooter();
      const mark = wordmark(footer);

      expect(mark.style.clipPath).toMatch(HIDDEN_CLIP);

      triggerIntersection(mark.parentElement as HTMLElement);

      await waitFor(() => expect(mark.style.clipPath).toMatch(SHOWN_CLIP), { timeout: 3000 });
    });

    it('is shown at once, with no hidden state, when the visitor turned animations off', () => {
      localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));

      const footer = renderFooter();

      expect(wordmark(footer).style.clipPath).toMatch(SHOWN_CLIP);
    });
  });
});
