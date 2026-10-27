import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { ChoicePill } from './ChoicePill';

const OPTIONS = [
  { value: 5, label: '5 horas' },
  { value: 10, label: '10 horas' },
  { value: 20, label: '20 horas' },
  { value: 40, label: '40 horas' },
] as const;

const TASK_OPTIONS = [
  { value: 'planilha', label: 'planilha e WhatsApp' },
  { value: 'atendimento', label: 'atendimento no WhatsApp' },
  { value: 'notas', label: 'emissão de notas' },
  { value: 'follow-up', label: 'follow-up de vendas' },
] as const;

const ariaLabel = (label: string) => `Horas por semana: ${label}. Alterar`;
const TRIGGER_NAME = 'Horas por semana: 10 horas. Alterar';

interface HarnessProps {
  initial?: number;
  onChange?: (value: number) => void;
}

// The pill is controlled, like in the hero: the harness keeps the value the way a parent would.
function Harness({ initial = 10, onChange }: HarnessProps) {
  const [value, setValue] = useState(initial);

  return (
    <>
      <ChoicePill
        value={value}
        options={OPTIONS}
        ariaLabel={ariaLabel}
        listLabel="Horas por semana"
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
      <button type="button">outro botão</button>
    </>
  );
}

function setup(props: HarnessProps = {}) {
  const user = userEvent.setup();
  const view = renderWithProviders(<Harness {...props} />);
  return { user, ...view };
}

function getTrigger(name = TRIGGER_NAME): HTMLElement {
  return screen.getByRole('button', { name });
}

async function openList(user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> {
  await user.click(getTrigger());
  return screen.findByRole('listbox', { name: 'Horas por semana' });
}

describe('ChoicePill trigger', () => {
  it('is a button that announces a listbox, with the aria label built from the current label', () => {
    setup();

    const trigger = getTrigger();
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveTextContent('10 horas');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('is at least 44px tall, so a finger can hit it', () => {
    setup();

    expect(getTrigger()).toHaveClass('min-h-11');
  });

  it('draws the chevron with an icon that screen readers skip, never with a glyph', () => {
    setup();

    const trigger = getTrigger();
    const icon = trigger.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(trigger.textContent).toBe('10 horas');
  });

  it('keeps the chevron out of the flow, so the text is the only item and the baseline of the pill is its text baseline', () => {
    setup();

    const trigger = getTrigger();
    expect(trigger).toHaveClass('relative');
    expect(trigger.querySelector('svg')).toHaveClass('absolute', 'right-[0.6em]', 'top-1/2');
    expect(trigger.children).toHaveLength(2);
    // The chevron is drawn in the right padding: 0.55em icon + 0.6em margin + 0.3em gap.
    expect(trigger).toHaveClass('pr-[1.45em]');
  });

  it('is a pill on a white surface with a light gray border and an ink focus ring', () => {
    setup();

    expect(getTrigger()).toHaveClass(
      'rounded-full',
      'bg-vn-white',
      'border-vn-gray-light',
      'hover:bg-vn-cream',
      'focus-visible:outline-vn-ink',
    );
  });

  it('merges a className given by the parent', () => {
    renderWithProviders(
      <ChoicePill
        value={5}
        options={OPTIONS}
        ariaLabel={ariaLabel}
        listLabel="Horas por semana"
        onChange={() => undefined}
        className="lowercase"
      />,
    );

    expect(screen.getByRole('button', { name: 'Horas por semana: 5 horas. Alterar' })).toHaveClass('lowercase', 'min-h-11');
  });

  it('names the listbox with the list label, not with the label of the trigger', async () => {
    const { user } = setup();

    const list = await openList(user);

    expect(list).toHaveAccessibleName('Horas por semana');
  });

  it('requires a list label, so a list is never named after the action of its trigger', () => {
    // @ts-expect-error listLabel is required
    const rejected = <ChoicePill value={5} options={OPTIONS} ariaLabel={ariaLabel} onChange={() => undefined} />;

    expect(rejected).toBeDefined();
  });
});

describe('ChoicePill opening', () => {
  it('stays closed until the trigger is clicked', () => {
    setup();

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the listbox with one option per choice and flips aria-expanded', async () => {
    const { user } = setup();

    const list = await openList(user);

    expect(within(list).getAllByRole('option').map((option) => option.textContent)).toEqual([
      '5 horas',
      '10 horas',
      '20 horas',
      '40 horas',
    ]);
    expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
  });

  it('marks only the current option as selected', async () => {
    const { user } = setup();

    const list = await openList(user);

    const selected = within(list)
      .getAllByRole('option')
      .filter((option) => option.getAttribute('aria-selected') === 'true');
    expect(selected.map((option) => option.textContent)).toEqual(['10 horas']);
    expect(within(list).getByRole('option', { name: '5 horas' })).toHaveAttribute('aria-selected', 'false');
  });

  it('moves the focus to the current option', async () => {
    const { user } = setup();

    await openList(user);

    await waitFor(() => expect(screen.getByRole('option', { name: '10 horas' })).toHaveFocus());
  });

  it('gives every option a 44px minimum height', async () => {
    const { user } = setup();

    const list = await openList(user);

    within(list)
      .getAllByRole('option')
      .forEach((option) => expect(option).toHaveClass('min-h-11'));
  });

  it('renders the options in a portal on the body, above the header, and not inside the pill', async () => {
    const { user, container } = setup();

    const list = await openList(user);

    expect(container.contains(list)).toBe(false);
    expect(document.body.contains(list)).toBe(true);
    expect(list).toHaveClass('z-[100]');
  });

  it('is not wider than 92vw or 20rem, and scrolls when the screen is short', async () => {
    const { user } = setup();

    const list = await openList(user);

    expect(list.className).toContain('max-w-[min(92vw,20rem)]');
    expect(list).toHaveClass('overflow-y-auto');
  });

  it('closes when the trigger is clicked again', async () => {
    const { user } = setup();
    await openList(user);

    await user.click(getTrigger());

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on a click outside', async () => {
    const { user } = setup();
    await openList(user);
    await waitFor(() => expect(screen.getByRole('option', { name: '10 horas' })).toHaveFocus());

    await user.click(document.body);

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });
});

describe('ChoicePill keyboard', () => {
  it('moves down twice from the current option and chooses it with Enter', async () => {
    const onChange = vi.fn();
    const { user } = setup({ initial: 5, onChange });
    await user.click(getTrigger('Horas por semana: 5 horas. Alterar'));
    await screen.findByRole('listbox');

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(20);
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('moves the focus with the active option', async () => {
    const { user } = setup();
    await openList(user);
    await waitFor(() => expect(screen.getByRole('option', { name: '10 horas' })).toHaveFocus());

    await user.keyboard('{ArrowDown}');

    expect(screen.getByRole('option', { name: '20 horas' })).toHaveFocus();
    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(screen.getByRole('option', { name: '5 horas' })).toHaveFocus();
  });

  it('stops at the first and at the last option', async () => {
    const onChange = vi.fn();
    const { user } = setup({ initial: 5, onChange });
    await user.click(getTrigger('Horas por semana: 5 horas. Alterar'));
    await screen.findByRole('listbox');

    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(screen.getByRole('option', { name: '5 horas' })).toHaveFocus();
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('option', { name: '40 horas' })).toHaveFocus();
  });

  it('jumps to the last option with End and to the first with Home', async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    await openList(user);

    await user.keyboard('{End}');
    expect(screen.getByRole('option', { name: '40 horas' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('option', { name: '5 horas' })).toHaveFocus();
    await user.keyboard('{End}{Enter}');

    expect(onChange).toHaveBeenCalledWith(40);
  });

  it('chooses with Space', async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    await openList(user);

    await user.keyboard('{ArrowUp} ');

    expect(onChange).toHaveBeenCalledWith(5);
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('closes with Escape and gives the focus back to the trigger', async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    await openList(user);

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await waitFor(() => expect(getTrigger()).toHaveFocus());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('gives the focus back to the trigger after a choice', async () => {
    const { user } = setup();
    await openList(user);

    await user.keyboard('{ArrowDown}{Enter}');

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await waitFor(() => expect(getTrigger('Horas por semana: 20 horas. Alterar')).toHaveFocus());
  });

  it('closes with Tab and keeps the focus on the trigger, so the next Tab leaves the pill', async () => {
    const { user } = setup();
    await openList(user);

    await user.keyboard('{Tab}');

    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    await waitFor(() => expect(getTrigger()).toHaveFocus());
  });

  it('opens from the keyboard with Enter on the trigger', async () => {
    const { user } = setup();
    getTrigger().focus();

    await user.keyboard('{Enter}');

    expect(await screen.findByRole('listbox')).toBeInTheDocument();
  });

  it('jumps to the option that starts with the typed character', async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    await openList(user);

    await user.keyboard('4');
    expect(screen.getByRole('option', { name: '40 horas' })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith(40);
  });

  it('keeps typing a prefix with several characters, space included', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ChoicePill
        value="planilha"
        options={TASK_OPTIONS}
        ariaLabel={(l) => `Tarefa: ${l}. Alterar`}
        listLabel="Tarefa"
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Tarefa: planilha e WhatsApp. Alterar' }));
    await screen.findByRole('listbox');

    await user.keyboard('follow-up d');

    expect(screen.getByRole('option', { name: 'follow-up de vendas' })).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('cycles through the options that share a first letter when the letter repeats', async () => {
    const user = userEvent.setup();
    const options = [
      { value: 'a', label: 'alfa' },
      { value: 'b', label: 'beta' },
      { value: 'c', label: 'alto' },
    ];
    renderWithProviders(
      <ChoicePill value="a" options={options} ariaLabel={(l) => `Letra: ${l}`} listLabel="Letra" onChange={() => undefined} />,
    );
    await user.click(screen.getByRole('button', { name: 'Letra: alfa' }));
    await screen.findByRole('listbox');

    await user.keyboard('a');
    expect(screen.getByRole('option', { name: 'alto' })).toHaveFocus();
    await user.keyboard('a');
    expect(screen.getByRole('option', { name: 'alfa' })).toHaveFocus();
  });

  it('ignores characters that start no option', async () => {
    const { user } = setup();
    await openList(user);
    await waitFor(() => expect(screen.getByRole('option', { name: '10 horas' })).toHaveFocus());

    await user.keyboard('z');

    expect(screen.getByRole('option', { name: '10 horas' })).toHaveFocus();
  });
});

describe('ChoicePill pointer', () => {
  it('chooses the clicked option, closes, and shows it on the trigger', async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    const list = await openList(user);

    await user.click(within(list).getByRole('option', { name: '40 horas' }));

    expect(onChange).toHaveBeenCalledWith(40);
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
    expect(getTrigger('Horas por semana: 40 horas. Alterar')).toHaveTextContent('40 horas');
  });

  it('highlights the option under the pointer, so a click and the keyboard agree on the active one', async () => {
    const { user } = setup();
    const list = await openList(user);

    await user.hover(within(list).getByRole('option', { name: '5 horas' }));
    await user.keyboard('{ArrowDown}');

    expect(screen.getByRole('option', { name: '10 horas' })).toHaveFocus();
  });

  it('shows the same option as selected when it is chosen again', async () => {
    const onChange = vi.fn();
    const { user } = setup({ onChange });
    const list = await openList(user);

    await user.click(within(list).getByRole('option', { name: '10 horas' }));

    expect(onChange).toHaveBeenCalledWith(10);
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
  });

  it('opens on the current option every time, also after a new choice', async () => {
    const { user } = setup();
    const list = await openList(user);
    await user.click(within(list).getByRole('option', { name: '40 horas' }));
    await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());

    await user.click(getTrigger('Horas por semana: 40 horas. Alterar'));
    await screen.findByRole('listbox');

    await waitFor(() => expect(screen.getByRole('option', { name: '40 horas' })).toHaveFocus());
    expect(screen.getByRole('option', { name: '40 horas' })).toHaveAttribute('aria-selected', 'true');
  });
});
