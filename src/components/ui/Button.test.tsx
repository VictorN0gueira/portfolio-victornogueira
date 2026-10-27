import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findAccentElements } from '../../test/accent';
import { FINE_POINTER_QUERY, REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import Button from './Button';

const ELEMENT_WIDTH = 100;
const ELEMENT_HEIGHT = 40;

function stubRectAtOrigin(el: HTMLElement): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: ELEMENT_WIDTH,
    bottom: ELEMENT_HEIGHT,
    width: ELEMENT_WIDTH,
    height: ELEMENT_HEIGHT,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
}

describe('Button', () => {
  describe('rendering', () => {
    it('renders a native button with the primary light classes by default', () => {
      renderWithProviders(<Button>falar com a gente</Button>);

      const button = screen.getByRole('button', { name: 'falar com a gente' });
      expect(button).toHaveClass('bg-vn-ink', 'text-vn-white', 'rounded-full');
    });

    it('renders without any provider when it is not magnetic', () => {
      render(<Button>falar com a gente</Button>);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('uses the dark primary tone on black sections', () => {
      renderWithProviders(<Button tone="dark">falar com a gente</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-vn-white', 'text-vn-black');
      expect(button).not.toHaveClass('bg-vn-ink');
    });

    it('lightens the primary light button to dark gray on hover', () => {
      renderWithProviders(<Button>falar com a gente</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-vn-gray-dark');
      expect(button).not.toHaveClass('hover:bg-vn-black');
    });

    it('darkens the primary dark button to light gray on hover', () => {
      renderWithProviders(<Button tone="dark">falar com a gente</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('hover:bg-vn-gray-light');
      expect(button).not.toHaveClass('hover:bg-vn-cream');
    });

    it('draws the secondary intent with a gray border and a transparent fill', () => {
      renderWithProviders(<Button intent="secondary">ver projetos</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border', 'border-vn-gray-light', 'bg-transparent', 'text-vn-ink');
      expect(button).not.toHaveClass('bg-vn-ink');
    });

    it('draws the secondary intent with white text on dark tone', () => {
      renderWithProviders(
        <Button intent="secondary" tone="dark">
          ver projetos
        </Button>,
      );

      expect(screen.getByRole('button')).toHaveClass('border-vn-gray-light', 'bg-transparent', 'text-vn-white');
    });

    it('is never painted with the accent color', () => {
      const { container } = renderWithProviders(
        <>
          <Button>a</Button>
          <Button tone="dark">b</Button>
          <Button intent="secondary">c</Button>
          <Button intent="secondary" tone="dark">
            d
          </Button>
        </>,
      );

      for (const button of screen.getAllByRole('button')) {
        expect(button.className).not.toContain('accent');
      }
      expect(findAccentElements(container)).toHaveLength(0);
    });

    it('merges a consumer className', () => {
      renderWithProviders(<Button className="w-full">enviar</Button>);

      expect(screen.getByRole('button')).toHaveClass('w-full', 'bg-vn-ink');
    });

    it('passes native attributes through', () => {
      renderWithProviders(<Button type="submit">enviar</Button>);

      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });
  });

  describe('size and touch target', () => {
    it('gives the md size a 44px minimum height', () => {
      renderWithProviders(<Button>enviar</Button>);

      expect(screen.getByRole('button')).toHaveClass('min-h-11', 'px-5');
    });

    it('gives the lg size a 56px minimum height', () => {
      renderWithProviders(<Button size="lg">enviar</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('min-h-14', 'px-7');
      expect(button).not.toHaveClass('min-h-11');
    });

    it.each([
      ['md', 'text-sm'],
      ['lg', 'text-base'],
    ] as const)('keeps leading-tight after the %s font size so tailwind-merge does not drop it', (size, fontSize) => {
      renderWithProviders(<Button size={size}>enviar</Button>);

      const classes = screen.getByRole('button').className.split(/\s+/);
      expect(classes).toContain('leading-tight');
      expect(classes).toContain(fontSize);
      expect(classes.indexOf('leading-tight')).toBeGreaterThan(classes.indexOf(fontSize));
    });

    it('lets the label wrap on narrow screens', () => {
      renderWithProviders(<Button>um texto de botao bem comprido que precisa quebrar</Button>);

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('whitespace-nowrap');
      expect(button).toHaveClass('text-center');
    });
  });

  describe('focus ring', () => {
    it('draws an ink outline on light tones', () => {
      renderWithProviders(<Button>enviar</Button>);

      expect(screen.getByRole('button')).toHaveClass(
        'focus-visible:outline-2',
        'focus-visible:outline-offset-2',
        'focus-visible:outline-vn-ink',
      );
    });

    it('draws a white outline on the dark tone', () => {
      renderWithProviders(<Button tone="dark">enviar</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus-visible:outline-2', 'focus-visible:outline-offset-2', 'focus-visible:outline-vn-white');
      expect(button).not.toHaveClass('focus-visible:outline-vn-ink');
    });

    it('keeps the outline on the secondary intent too', () => {
      renderWithProviders(<Button intent="secondary">enviar</Button>);

      expect(screen.getByRole('button')).toHaveClass('focus-visible:outline-2', 'focus-visible:outline-vn-ink');
    });
  });

  describe('asChild', () => {
    it('renders the child anchor with the intent classes instead of a nested button', () => {
      renderWithProviders(
        <Button asChild>
          <a href="/x">ir para x</a>
        </Button>,
      );

      const link = screen.getByRole('link', { name: 'ir para x' });
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '/x');
      expect(link).toHaveClass('bg-vn-ink', 'text-vn-white', 'rounded-full', 'min-h-11');
      expect(screen.queryByRole('button')).toBeNull();
    });

    it('keeps the child className next to the button classes', () => {
      renderWithProviders(
        <Button asChild className="w-full">
          <a href="/x" className="underline-offset-4">
            ir para x
          </a>
        </Button>,
      );

      expect(screen.getByRole('link')).toHaveClass('w-full', 'underline-offset-4', 'bg-vn-ink');
    });

    it('wraps a react-router Link', () => {
      renderWithProviders(
        <Button asChild intent="secondary">
          <Link to="/projetos">projetos</Link>
        </Button>,
      );

      const link = screen.getByRole('link', { name: 'projetos' });
      expect(link).toHaveAttribute('href', '/projetos');
      expect(link).toHaveClass('border-vn-gray-light');
    });
  });

  describe('disabled', () => {
    it('is disabled, dimmed and ignores the pointer', () => {
      renderWithProviders(<Button disabled>enviar</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:pointer-events-none');
    });

    it('does not style aria-disabled, because only the native disabled attribute is enforced', () => {
      renderWithProviders(<Button>enviar</Button>);

      expect(screen.getByRole('button').className).not.toContain('aria-disabled');
    });

    it('does not fire onClick', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      renderWithProviders(
        <Button disabled onClick={onClick}>
          enviar
        </Button>,
      );

      await user.click(screen.getByRole('button'));

      expect(onClick).not.toHaveBeenCalled();
    });

    it('fires onClick when enabled', async () => {
      const onClick = vi.fn();
      const user = userEvent.setup();
      renderWithProviders(<Button onClick={onClick}>enviar</Button>);

      await user.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('type', () => {
    it('defaults to type="button" so it never submits a form by accident', () => {
      renderWithProviders(<Button>enviar</Button>);

      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('lets a consumer type="submit" override the default', () => {
      renderWithProviders(<Button type="submit">enviar</Button>);

      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('keeps type="button" on a magnetic button', () => {
      renderWithProviders(<Button isMagnetic>enviar</Button>);

      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('does not submit a surrounding form by default and submits with type="submit"', async () => {
      const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
      const user = userEvent.setup();
      renderWithProviders(
        <form onSubmit={onSubmit}>
          <Button>padrao</Button>
          <Button type="submit">enviar</Button>
        </form>,
      );

      await user.click(screen.getByRole('button', { name: 'padrao' }));
      expect(onSubmit).not.toHaveBeenCalled();

      await user.click(screen.getByRole('button', { name: 'enviar' }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('adds no type attribute to the child when asChild is set', () => {
      renderWithProviders(
        <Button asChild>
          <a href="/x">ir para x</a>
        </Button>,
      );

      expect(screen.getByRole('link')).not.toHaveAttribute('type');
    });
  });

  describe('isMagnetic', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('does not break without a fine pointer and leaves the transform alone', () => {
      stubMatchMedia();
      renderWithProviders(<Button isMagnetic>enviar</Button>);
      const button = screen.getByRole('button');
      stubRectAtOrigin(button);

      fireEvent.pointerMove(button, { clientX: 100, clientY: 20 });
      fireEvent.pointerLeave(button);

      expect(button).toBeInTheDocument();
      expect(button.style.transform).toBe('');
    });

    it('stays still when the visitor asks for reduced motion', () => {
      stubMatchMedia({ [FINE_POINTER_QUERY]: true, [REDUCED_MOTION_QUERY]: true });
      renderWithProviders(<Button isMagnetic>enviar</Button>);
      const button = screen.getByRole('button');
      stubRectAtOrigin(button);

      fireEvent.pointerMove(button, { clientX: 100, clientY: 20 });

      expect(button.style.transform).toBe('');
    });

    it('pulls toward the pointer with a fine pointer and releases on leave', () => {
      stubMatchMedia({ [FINE_POINTER_QUERY]: true });
      renderWithProviders(<Button isMagnetic>enviar</Button>);
      const button = screen.getByRole('button');
      stubRectAtOrigin(button);

      fireEvent.pointerMove(button, { clientX: 100, clientY: 20 });
      expect(button.style.transform).toBe('translate(9px, 0px)');

      fireEvent.pointerLeave(button);
      expect(button.style.transform).toBe('');
    });

    it('composes a consumer onPointerMove and onPointerLeave instead of replacing them', () => {
      stubMatchMedia({ [FINE_POINTER_QUERY]: true });
      const onPointerMove = vi.fn();
      const onPointerLeave = vi.fn();
      renderWithProviders(
        <Button isMagnetic onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
          enviar
        </Button>,
      );
      const button = screen.getByRole('button');
      stubRectAtOrigin(button);

      fireEvent.pointerMove(button, { clientX: 100, clientY: 20 });
      expect(onPointerMove).toHaveBeenCalledTimes(1);
      expect(button.style.transform).toBe('translate(9px, 0px)');

      fireEvent.pointerLeave(button);
      expect(onPointerLeave).toHaveBeenCalledTimes(1);
      expect(button.style.transform).toBe('');
    });

    it('still calls the consumer handlers when the pull is inactive', () => {
      stubMatchMedia();
      const onPointerMove = vi.fn();
      renderWithProviders(
        <Button isMagnetic onPointerMove={onPointerMove}>
          enviar
        </Button>,
      );

      fireEvent.pointerMove(screen.getByRole('button'), { clientX: 10, clientY: 10 });

      expect(onPointerMove).toHaveBeenCalledTimes(1);
    });

    it('does not attach pull handlers when it is not magnetic', () => {
      stubMatchMedia({ [FINE_POINTER_QUERY]: true });
      renderWithProviders(<Button>enviar</Button>);
      const button = screen.getByRole('button');
      stubRectAtOrigin(button);

      fireEvent.pointerMove(button, { clientX: 100, clientY: 20 });

      expect(button.style.transform).toBe('');
    });

    it('merges an object ref from the consumer with the magnetic ref', () => {
      stubMatchMedia({ [FINE_POINTER_QUERY]: true });
      const ref = createRef<HTMLButtonElement>();
      renderWithProviders(
        <Button isMagnetic ref={ref}>
          enviar
        </Button>,
      );
      const button = screen.getByRole('button');
      stubRectAtOrigin(button);

      fireEvent.pointerMove(button, { clientX: 100, clientY: 20 });

      expect(ref.current).toBe(button);
      expect(button.style.transform).toBe('translate(9px, 0px)');
    });

    it('merges a callback ref from the consumer with the magnetic ref', () => {
      stubMatchMedia({ [FINE_POINTER_QUERY]: true });
      const callbackRef = vi.fn();
      renderWithProviders(
        <Button isMagnetic ref={callbackRef}>
          enviar
        </Button>,
      );
      const button = screen.getByRole('button');
      stubRectAtOrigin(button);

      fireEvent.pointerMove(button, { clientX: 100, clientY: 20 });

      expect(callbackRef).toHaveBeenCalledWith(button);
      expect(button.style.transform).toBe('translate(9px, 0px)');
    });

    it('pulls a wrapped anchor when asChild is set', () => {
      stubMatchMedia({ [FINE_POINTER_QUERY]: true });
      renderWithProviders(
        <Button asChild isMagnetic>
          <a href="/x">ir para x</a>
        </Button>,
      );
      const link = screen.getByRole('link');
      stubRectAtOrigin(link);

      fireEvent.pointerMove(link, { clientX: 100, clientY: 20 });

      expect(link.style.transform).toBe('translate(9px, 0px)');
      expect(link).toHaveClass('bg-vn-ink');
    });
  });
});
