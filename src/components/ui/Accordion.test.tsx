import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { Accordion } from './Accordion';

const ITEMS = [
  { question: 'quanto tempo leva', answer: 'depende do escopo' },
  { question: 'como funciona o suporte', answer: 'a gente responde no mesmo dia' },
  { question: 'posso cancelar', answer: 'sim, quando quiser' },
];

function getDetails(container: HTMLElement): HTMLDetailsElement[] {
  return [...container.querySelectorAll('details')];
}

function getSummary(question: string): HTMLElement {
  return screen.getByText(question).closest('summary') as HTMLElement;
}

describe('Accordion', () => {
  it('renders one native details per item with the question in its summary', () => {
    const { container } = renderWithProviders(<Accordion items={ITEMS} name="faq" />);

    const details = getDetails(container);
    expect(details).toHaveLength(3);
    ITEMS.forEach((item, index) => {
      expect(details[index].querySelector('summary')).toHaveTextContent(item.question);
      expect(details[index]).toHaveTextContent(item.answer);
    });
  });

  it('opens the first item initially', () => {
    const { container } = renderWithProviders(<Accordion items={ITEMS} name="faq" />);

    const [first, second, third] = getDetails(container);
    expect(first).toHaveAttribute('open');
    expect(second).not.toHaveAttribute('open');
    expect(third).not.toHaveAttribute('open');
  });

  it('opens the item given by defaultOpenIndex', () => {
    const { container } = renderWithProviders(<Accordion items={ITEMS} name="faq" defaultOpenIndex={2} />);

    const [first, second, third] = getDetails(container);
    expect(first).not.toHaveAttribute('open');
    expect(second).not.toHaveAttribute('open');
    expect(third).toHaveAttribute('open');
  });

  it('can start with every item closed', () => {
    const { container } = renderWithProviders(<Accordion items={ITEMS} name="faq" defaultOpenIndex={-1} />);

    expect(getDetails(container).filter((details) => details.open)).toHaveLength(0);
  });

  it('opens the second item when its summary is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<Accordion items={ITEMS} name="faq" />);

    await user.click(getSummary('como funciona o suporte'));

    expect(getDetails(container)[1]).toHaveAttribute('open');
  });

  it('keeps the state the visitor chose when the parent re-renders', async () => {
    const user = userEvent.setup();
    const { container, rerender } = renderWithProviders(<Accordion items={ITEMS} name="faq" />);
    await user.click(getSummary('posso cancelar'));

    rerender(<Accordion items={ITEMS} name="faq" />);

    expect(getDetails(container)[2]).toHaveAttribute('open');
  });

  it('shares the name on every item so the browser keeps one open at a time', () => {
    const { container } = renderWithProviders(<Accordion items={ITEMS} name="faq-home" />);

    getDetails(container).forEach((details) => {
      expect(details).toHaveAttribute('name', 'faq-home');
    });
  });

  it('gives each summary a 44px touch target and a visible focus ring', () => {
    renderWithProviders(<Accordion items={ITEMS} name="faq" />);

    const summary = getSummary('quanto tempo leva');
    expect(summary).toHaveClass('min-h-11');
    expect(summary.className).toMatch(/focus-visible:outline-2/);
  });

  it('draws the plus as an SVG icon hidden from assistive tech, never a literal plus sign', () => {
    renderWithProviders(<Accordion items={ITEMS} name="faq" />);

    const summary = getSummary('quanto tempo leva');
    const icon = summary.querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon).toHaveClass('vn-accordion-icon');
    expect(summary.textContent).not.toContain('+');
  });

  it('wires the classes tokens.css animates (details, panel)', () => {
    const { container } = renderWithProviders(<Accordion items={ITEMS} name="faq" />);

    const [first] = getDetails(container);
    expect(first).toHaveClass('vn-accordion');
    expect(first.querySelector('.vn-accordion-panel')).not.toBeNull();
  });

  it('renders nothing but the wrapper for an empty list', () => {
    const { container } = renderWithProviders(<Accordion items={[]} name="faq" />);

    expect(getDetails(container)).toHaveLength(0);
  });
});
