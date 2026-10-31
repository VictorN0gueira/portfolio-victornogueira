import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { findAccentElements } from '../../test/accent';
import { expectNoConsoleOutput } from '../../test/consoleGuard';
import { offPaletteClasses, offPaletteInHtml } from '../../test/palette';
import ServiceSelect from './ServiceSelect';

const OPTIONS = ['Automação de processos', 'Agente de IA ou chatbot', 'Site ou landing page', 'Sistema web sob medida'];
const PLACEHOLDER = 'Escolhe um serviço';

expectNoConsoleOutput();

interface HarnessProps {
  initial?: string;
  invalid?: boolean;
  onChange?: (value: string) => void;
}

function Harness({ initial = '', invalid = false, onChange }: HarnessProps) {
  const [value, setValue] = useState(initial);

  return (
    <>
      <button type="button">antes</button>
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
      <button type="button">depois</button>
    </>
  );
}

const trigger = (): HTMLElement => document.querySelector('button[aria-haspopup="listbox"]') as HTMLElement;
const tokensOf = (element: Element): string[] => (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
const option = (name: string) => screen.getByRole('option', { name });
const closed = () => waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

async function openWithKeyboard(user: ReturnType<typeof userEvent.setup>) {
  trigger().focus();
  await user.keyboard('{Enter}');
  return screen.findByRole('listbox');
}

describe('ServiceSelect as a listbox', () => {
  it('starts closed: a button that announces a listbox popup, with the placeholder', () => {
    render(<Harness />);

    expect(trigger()).toHaveTextContent(PLACEHOLDER);
    expect(trigger()).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens a listbox with one real option per item (no button inside) and links it to the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness initial={OPTIONS[1]} />);

    await user.click(trigger());

    const listbox = await screen.findByRole('listbox', { name: 'Serviço de interesse' });
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    expect(trigger()).toHaveAttribute('aria-controls', listbox.id);
    expect(within(listbox).getAllByRole('option')).toHaveLength(OPTIONS.length);
    expect(within(listbox).queryAllByRole('button')).toHaveLength(0);
    expect(option(OPTIONS[1])).toHaveAttribute('aria-selected', 'true');
    expect(option(OPTIONS[0])).toHaveAttribute('aria-selected', 'false');
  });

  it('marks no option as chosen while nothing is chosen, and starts on the first one', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await openWithKeyboard(user);

    for (const item of screen.getAllByRole('option')) expect(item).toHaveAttribute('aria-selected', 'false');
    await waitFor(() => expect(option(OPTIONS[0])).toHaveFocus());
  });

  it('opens on the chosen option', async () => {
    const user = userEvent.setup();
    render(<Harness initial={OPTIONS[2]} />);

    await openWithKeyboard(user);

    await waitFor(() => expect(option(OPTIONS[2])).toHaveFocus());
  });

  it('chooses with a click, reports the plain label once, closes and gives the focus back to the trigger', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(trigger());
    await user.click(await screen.findByRole('option', { name: OPTIONS[2] }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(OPTIONS[2]);
    await closed();
    expect(trigger()).toHaveTextContent(OPTIONS[2]);
    await waitFor(() => expect(trigger()).toHaveFocus());
  });

  it('moves with ArrowDown and ArrowUp (stopping at the ends), Home and End', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await openWithKeyboard(user);
    await waitFor(() => expect(option(OPTIONS[0])).toHaveFocus());

    await user.keyboard('{ArrowDown}');
    expect(option(OPTIONS[1])).toHaveFocus();
    await user.keyboard('{End}');
    expect(option(OPTIONS[3])).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(option(OPTIONS[3])).toHaveFocus();
    await user.keyboard('{Home}');
    expect(option(OPTIONS[0])).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(option(OPTIONS[0])).toHaveFocus();
  });

  it('jumps to the option that starts with the typed letters', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await openWithKeyboard(user);
    await waitFor(() => expect(option(OPTIONS[0])).toHaveFocus());

    await user.keyboard('si');
    expect(option('Site ou landing page')).toHaveFocus();
    await new Promise((resolve) => setTimeout(resolve, 700));
    await user.keyboard('sis');
    expect(option('Sistema web sob medida')).toHaveFocus();
  });

  it('chooses the active option with Enter, and with Space', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await openWithKeyboard(user);
    await waitFor(() => expect(option(OPTIONS[0])).toHaveFocus());

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(OPTIONS[1]);
    await closed();
    await waitFor(() => expect(trigger()).toHaveFocus());

    await user.keyboard('{Enter}');
    await screen.findByRole('listbox');
    await waitFor(() => expect(option(OPTIONS[1])).toHaveFocus());
    await user.keyboard('{ArrowDown} ');
    expect(onChange).toHaveBeenLastCalledWith(OPTIONS[2]);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('does not submit the form when Enter chooses an option', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <ServiceSelect value="" onChange={() => {}} options={OPTIONS} placeholder={PLACEHOLDER} />
      </form>,
    );
    await openWithKeyboard(user);
    await waitFor(() => expect(option(OPTIONS[0])).toHaveFocus());

    await user.keyboard('{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it.each(['{ArrowDown}', '{ArrowUp}'])('opens from the closed trigger with %s, with the focus in the list', async (key) => {
    const user = userEvent.setup();
    render(<Harness initial={OPTIONS[1]} />);
    trigger().focus();

    await user.keyboard(key);

    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(trigger()).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(option(OPTIONS[1])).toHaveFocus());
  });

  it('has no aria-controls while the list is closed, and points it at the list only while it is open', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(trigger()).not.toHaveAttribute('aria-controls');

    await user.click(trigger());
    const listbox = await screen.findByRole('listbox');
    expect(trigger()).toHaveAttribute('aria-controls', listbox.id);

    await user.keyboard('{Escape}');
    await closed();
    expect(trigger()).not.toHaveAttribute('aria-controls');
  });

  it('cancels the arrow key that opens the list, so the page does not scroll', () => {
    render(<Harness />);
    trigger().focus();

    const down = fireEvent.keyDown(trigger(), { key: 'ArrowDown' });

    expect(down).toBe(false);
  });

  it('closes with Escape, keeps the value, and returns the focus to the trigger', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={OPTIONS[1]} onChange={onChange} />);
    await openWithKeyboard(user);
    await user.keyboard('{ArrowDown}{Escape}');

    await closed();
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger()).toHaveTextContent(OPTIONS[1]);
    await waitFor(() => expect(trigger()).toHaveFocus());
  });

  it('closes with Tab and the same Tab moves on to the next control', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await openWithKeyboard(user);

    await user.keyboard('{Tab}');

    await closed();
    await waitFor(() => expect(screen.getByRole('button', { name: 'depois' })).toHaveFocus());
  });

  it('closes on a pointer down outside, and stays open on one inside', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(trigger());

    fireEvent.pointerDown(await screen.findByRole('listbox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.pointerDown(document.body);

    await closed();
  });

  it('toggles from the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(trigger());
    await screen.findByRole('listbox');
    await user.click(trigger());

    await closed();
  });

  it('renders the list inside its own field, so the form subtree holds the options', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);

    await user.click(trigger());

    expect(container).toContainElement(await screen.findByRole('listbox'));
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

  it('paints the list on the ink surface with tokens, 44px rows and a white ring on the active one', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness initial={OPTIONS[0]} />);

    await user.click(trigger());

    const listbox = await screen.findByRole('listbox');
    expect(listbox).toHaveClass('bg-vn-ink', 'border-vn-gray-mid');
    for (const item of within(listbox).getAllByRole('option')) {
      expect(item).toHaveClass('min-h-11', 'focus-visible:outline-vn-white', 'data-[active=true]:outline-vn-white');
    }
    expect(listbox).toHaveClass('max-h-[var(--radix-popover-content-available-height)]', 'overflow-y-auto');
    expect(offPaletteInHtml(container.innerHTML)).toEqual([]);
    expect(findAccentElements(container)).toEqual([]);
  });
});

describe('ServiceSelect label', () => {
  it('names the trigger by the label it points at, then by its own text', () => {
    render(
      <>
        <span id="servico-label">Serviço de interesse</span>
        <ServiceSelect value="" onChange={() => {}} options={OPTIONS} placeholder={PLACEHOLDER} labelledBy="servico-label" />
      </>,
    );

    expect(trigger()).toHaveAccessibleName(`Serviço de interesse ${PLACEHOLDER}`);
    expect(trigger()).toHaveAttribute('aria-labelledby', `servico-label ${trigger().id}-value`);
    expect(document.getElementById(`${trigger().id}-value`)).toHaveTextContent(PLACEHOLDER);
    expect(trigger().id).not.toBe('');
  });

  it('keeps naming the trigger by its own text when there is no label to point at', () => {
    render(<ServiceSelect value="" onChange={() => {}} options={OPTIONS} placeholder={PLACEHOLDER} />);

    expect(trigger()).not.toHaveAttribute('aria-labelledby');
    expect(trigger()).toHaveAccessibleName(PLACEHOLDER);
  });

  it('has the default placeholder of the contact copy', () => {
    render(<ServiceSelect value="" onChange={() => {}} options={OPTIONS} />);

    expect(trigger()).toHaveTextContent('Escolhe uma opção');
  });

  it('eases the chevron with the system easing class', () => {
    render(<Harness />);

    expect(trigger().querySelector('svg')).toHaveClass('transition-transform', 'duration-300', 'ease-out');
  });
});
