import * as Popover from '@radix-ui/react-popover';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { ChoiceList, type ChoiceTone } from './ChoiceList';
import { OPTION_CLASSES } from './choiceListStyles';

const OPTIONS = [
  { value: 'a', label: 'Primeira' },
  { value: 'b', label: 'Segunda' },
];

function renderList(tone: ChoiceTone, container?: HTMLElement) {
  return renderWithProviders(
    <Popover.Root open>
      <Popover.Trigger>abrir</Popover.Trigger>
      <ChoiceList
        options={OPTIONS}
        selectedIndex={0}
        activeIndex={1}
        label="Lista"
        registerOption={() => () => {}}
        onKeyDown={() => {}}
        onOpenFocus={() => {}}
        onChoose={() => {}}
        onActivate={() => {}}
        tone={tone}
        portalContainer={container}
      />
    </Popover.Root>,
  );
}

const tokens = (element: Element) => (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);

describe('ChoiceList focus ring', () => {
  for (const tone of ['light', 'dark'] as const) {
    it(`${tone}: no option or panel carries outline-none, which would cancel the 2px ring`, () => {
      renderList(tone);

      expect(OPTION_CLASSES[tone]).not.toContain('outline-none');
      expect(tokens(screen.getByRole('listbox'))).not.toContain('outline-none');
      for (const option of screen.getAllByRole('option')) {
        const classes = tokens(option);
        expect(classes).not.toContain('outline-none');
        expect(classes).toContain('focus-visible:outline-2');
        expect(classes).toContain('data-[active=true]:outline-2');
        expect(classes).toContain('focus-visible:-outline-offset-2');
      }
    });
  }

  it('light: the ring is ink and the active tint is the visible gray one', () => {
    renderList('light');
    const classes = tokens(screen.getAllByRole('option')[1]);

    expect(classes).toEqual(
      expect.arrayContaining([
        'focus-visible:outline-vn-ink',
        'data-[active=true]:outline-vn-ink',
        'data-[active=true]:bg-vn-gray-light/40',
      ]),
    );
    expect(classes).not.toContain('data-[active=true]:bg-vn-cream');
  });

  it('dark: the ring is white, and the panel is as wide as the trigger', () => {
    renderList('dark');
    const panel = screen.getByRole('listbox');

    expect(tokens(screen.getAllByRole('option')[1])).toEqual(
      expect.arrayContaining(['focus-visible:outline-vn-white', 'data-[active=true]:outline-vn-white']),
    );
    expect(tokens(panel)).toEqual(expect.arrayContaining(['bg-vn-ink', 'w-[var(--radix-popover-trigger-width)]']));
  });

  it('renders inside the container it is given', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    renderList('dark', container);

    expect(container).toContainElement(screen.getByRole('listbox'));
    container.remove();
  });
});
