import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { findAccentElements } from '../test/accent';
import { expectNoConsoleOutput } from '../test/consoleGuard';
import { offPaletteClasses, offPaletteInHtml } from '../test/palette';
import ServiceSelect from './ServiceSelect';

const OPTIONS = ['Automação de processos', 'Agente de IA ou chatbot', 'Site ou landing page'];
const PLACEHOLDER = 'Selecione um serviço';

expectNoConsoleOutput();

interface HarnessProps {
  initial?: string;
  invalid?: boolean;
  onChange?: (value: string) => void;
}

function Harness({ initial = '', invalid = false, onChange }: HarnessProps) {
  const [value, setValue] = useState(initial);

  return (
    <ServiceSelect
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
      options={OPTIONS}
      placeholder={PLACEHOLDER}
      invalid={invalid}
      describedBy="servico-error"
    />
  );
}

const trigger = (): HTMLElement => document.querySelector('button[aria-haspopup="listbox"]') as HTMLElement;
const tokensOf = (element: Element): string[] => (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);

describe('ServiceSelect behavior', () => {
  it('starts closed, with the placeholder in a listbox popup trigger', () => {
    render(<Harness />);

    expect(trigger()).toHaveTextContent(PLACEHOLDER);
    expect(trigger()).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens a listbox with one option per item and links it to the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness initial={OPTIONS[1]} />);

    await user.click(trigger());

    const listbox = screen.getByRole('listbox');
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(trigger()).toHaveAttribute('aria-controls', listbox.id);
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length);
    expect(screen.getByRole('option', { name: OPTIONS[1] })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: OPTIONS[0] })).toHaveAttribute('aria-selected', 'false');
  });

  it('chooses an option, reports it and closes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(trigger());
    await user.click(within(screen.getByRole('listbox')).getByRole('button', { name: OPTIONS[2] }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(OPTIONS[2]);
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(trigger()).toHaveTextContent(OPTIONS[2]);
  });

  it('closes with Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(trigger());

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('closes on a pointer down outside, and stays open on one inside', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(trigger());

    fireEvent.pointerDown(screen.getByRole('listbox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.pointerDown(document.body);

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('toggles from the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(trigger());
    await user.click(trigger());

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('links an error to the trigger only while it is invalid', () => {
    const { rerender } = render(<ServiceSelect value="" onChange={() => {}} options={OPTIONS} invalid describedBy="e" />);

    expect(trigger()).toHaveAttribute('aria-invalid', 'true');
    expect(trigger()).toHaveAttribute('aria-describedby', 'e');

    rerender(<ServiceSelect value="" onChange={() => {}} options={OPTIONS} describedBy="e" />);

    expect(trigger()).not.toHaveAttribute('aria-invalid');
    expect(trigger()).not.toHaveAttribute('aria-describedby');
  });
});

describe('ServiceSelect colors on the dark surface', () => {
  it('draws the closed trigger with palette tokens, 16px text and a white focus ring', () => {
    render(<Harness />);
    const tokens = tokensOf(trigger());

    expect(tokens).toEqual(expect.arrayContaining(['bg-vn-white/5', 'text-base', 'min-h-11', 'focus-visible:outline-vn-white']));
    expect(tokens.filter((token) => /(^|:)text-(xs|sm)$/.test(token))).toEqual([]);
    expect(offPaletteInHtml(trigger().innerHTML)).toEqual([]);
    expect(findAccentElements(trigger())).toEqual([]);
    expect(offPaletteClasses(trigger().className)).toEqual([]);
  });

  it('shows the placeholder in gray and a chosen value in white', () => {
    const { rerender } = render(<ServiceSelect value="" onChange={() => {}} options={OPTIONS} placeholder={PLACEHOLDER} />);
    expect(screen.getByText(PLACEHOLDER)).toHaveClass('text-vn-gray-mid');

    rerender(<ServiceSelect value={OPTIONS[0]} onChange={() => {}} options={OPTIONS} placeholder={PLACEHOLDER} />);
    expect(screen.getByText(OPTIONS[0])).toHaveClass('text-vn-white');
  });

  it('marks an invalid trigger with a white border, not a red one', () => {
    render(<Harness invalid />);

    expect(trigger()).toHaveClass('border-vn-white');
    expect(offPaletteClasses(trigger().className)).toEqual([]);
  });

  it('paints the listbox, the hover, the selected option and the focus ring with tokens', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness initial={OPTIONS[0]} />);

    await user.click(trigger());

    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveClass('bg-vn-ink', 'border-vn-gray-mid');
    const selected = within(listbox).getByRole('button', { name: OPTIONS[0] });
    const other = within(listbox).getByRole('button', { name: OPTIONS[1] });
    expect(selected).toHaveClass('bg-vn-white/10', 'text-vn-white');
    expect(other).toHaveClass('text-vn-gray-light', 'hover:bg-vn-white/10');
    for (const option of [selected, other]) {
      expect(option).toHaveClass('focus-visible:outline-vn-white', 'min-h-11');
    }
    expect(offPaletteInHtml(container.innerHTML)).toEqual([]);
    expect(findAccentElements(container)).toEqual([]);
  });
});

describe('ServiceSelect label and motion', () => {
  it('names the trigger by the label it points at, then by its own text', () => {
    render(
      <>
        <span id="servico-label">Serviço de interesse</span>
        <ServiceSelect value="" onChange={() => {}} options={OPTIONS} placeholder={PLACEHOLDER} labelledBy="servico-label" />
      </>,
    );

    expect(trigger()).toHaveAccessibleName(`Serviço de interesse ${PLACEHOLDER}`);
    expect(trigger()).toHaveAttribute('aria-labelledby', `servico-label ${trigger().id}`);
    expect(trigger().id).not.toBe('');
  });

  it('keeps naming the trigger by its own text when there is no label to point at', () => {
    render(<ServiceSelect value="" onChange={() => {}} options={OPTIONS} placeholder={PLACEHOLDER} />);

    expect(trigger()).not.toHaveAttribute('aria-labelledby');
    expect(trigger()).toHaveAccessibleName(PLACEHOLDER);
  });

  it('eases the chevron with the system easing class and gives the list a token shadow', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(trigger().querySelector('svg')).toHaveClass('transition-transform', 'duration-300', 'ease-out');
    await user.click(trigger());
    expect(screen.getByRole('listbox')).toHaveClass('shadow-vn-black/40');
  });
});
