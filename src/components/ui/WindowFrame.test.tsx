import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { findAccentElements } from '../../test/accent';
import { renderWithProviders } from '../../test/render';
import { WindowFrame } from './WindowFrame';

function renderFrame(props: { title?: string; status?: string; className?: string } = {}) {
  return renderWithProviders(
    <WindowFrame title={props.title ?? 'fluxo.n8n'} status={props.status} className={props.className}>
      <p>conteudo</p>
    </WindowFrame>,
  );
}

describe('WindowFrame', () => {
  it('is a plain div, not a figure', () => {
    const { container } = renderFrame();

    expect(container.firstElementChild?.tagName).toBe('DIV');
    expect(container.querySelector('figure')).toBeNull();
  });

  it('shows the title in the mono font', () => {
    renderFrame({ title: 'fluxo.n8n' });

    expect(screen.getByText('fluxo.n8n')).toHaveClass('font-mono');
  });

  it('shows the status at the right when given, and no pill without it', () => {
    const { rerender, container } = renderFrame({ status: 'ativo' });

    expect(screen.getByText('ativo')).toBeInTheDocument();
    expect(screen.getByText('ativo')).toHaveClass('ml-auto');

    rerender(
      <WindowFrame title="fluxo.n8n">
        <p>conteudo</p>
      </WindowFrame>,
    );
    expect(screen.queryByText('ativo')).toBeNull();
    expect(container.querySelectorAll('.ml-auto')).toHaveLength(0);
  });

  it('draws three gray decorative dots hidden from assistive tech', () => {
    renderFrame();
    const bar = screen.getByText('fluxo.n8n').parentElement as HTMLElement;
    const dots = bar.firstElementChild as HTMLElement;

    expect(dots).toHaveAttribute('aria-hidden', 'true');
    expect(dots.children).toHaveLength(3);
    [...dots.children].forEach((dot) => expect(dot).toHaveClass('bg-vn-gray-dark'));
  });

  it('renders its children', () => {
    renderFrame();

    expect(screen.getByText('conteudo')).toBeInTheDocument();
  });

  it('merges a consumer className on the frame', () => {
    const { container } = renderFrame({ className: 'max-w-xl' });

    expect(container.firstElementChild).toHaveClass('max-w-xl', 'overflow-hidden');
  });

  it('uses palette colors only and never the accent', () => {
    const { container } = renderFrame({ status: 'ativo' });

    expect(findAccentElements(container)).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('lets a long title and the status wrap instead of cutting text on narrow screens', () => {
    const { container } = renderFrame({ title: 'um-titulo-muito-longo-de-fluxo.n8n', status: 'ativo' });
    const header = screen.getByText('um-titulo-muito-longo-de-fluxo.n8n').parentElement as HTMLElement;

    expect(header).toHaveClass('flex-wrap');
    expect(screen.getByText('um-titulo-muito-longo-de-fluxo.n8n')).toHaveClass('min-w-0', 'break-words');
    expect(container.innerHTML).not.toContain('truncate');
  });

  it('shows actions in the title bar, after the status, and keeps one auto margin for the pair', () => {
    const { container } = renderWithProviders(
      <WindowFrame title="fluxo.n8n" status="ativo" actions={<button type="button">pausar</button>}>
        <p>conteudo</p>
      </WindowFrame>,
    );

    const bar = screen.getByText('fluxo.n8n').parentElement as HTMLElement;
    const status = screen.getByText('ativo');
    const action = screen.getByRole('button', { name: 'pausar' });
    expect(bar.contains(action)).toBe(true);
    expect(status.compareDocumentPosition(action) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelectorAll('.ml-auto')).toHaveLength(1);
  });

  it('pushes the actions to the right edge on their own when there is no status', () => {
    renderWithProviders(
      <WindowFrame title="fluxo.n8n" actions={<button type="button">pausar</button>}>
        <p>conteudo</p>
      </WindowFrame>,
    );

    expect(screen.getByRole('button', { name: 'pausar' }).parentElement).toHaveClass('ml-auto');
  });
});
