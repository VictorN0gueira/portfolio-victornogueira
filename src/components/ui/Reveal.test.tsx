import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { IntersectionObserverMock, triggerIntersection } from '../../test/intersection';
import { renderWithProviders } from '../../test/render';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { RevealGroup, RevealItem, type RevealVariant } from './Reveal';

const A11Y_STORAGE_KEY = 'a11y-preferences';
const WIDE_QUERY = '(min-width: 768px)';
const REVEALED_TIMEOUT_MS = 3000;
const NO_DELAY_TIMEOUT_MS = 500;

function getGroup(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

function getItem(testId: string): HTMLElement {
  return screen.getByTestId(testId);
}

describe('RevealItem with motion allowed', () => {
  beforeEach(() => {
    localStorage.clear();
    stubMatchMedia({ [WIDE_QUERY]: true });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('is hidden (opacity 0) until its group enters the view', () => {
    renderWithProviders(
      <RevealGroup>
        <RevealItem>
          <p data-testid="item">oi</p>
        </RevealItem>
      </RevealGroup>,
    );

    expect(getItem('item').parentElement?.style.opacity).toBe('0');
  });

  it('becomes visible once the group enters the view', async () => {
    const { container } = renderWithProviders(
      <RevealGroup>
        <RevealItem>
          <p data-testid="item">oi</p>
        </RevealItem>
      </RevealGroup>,
    );
    const wrapper = getItem('item').parentElement as HTMLElement;

    triggerIntersection(getGroup(container));

    await waitFor(() => expect(wrapper.style.opacity).toBe('1'), { timeout: REVEALED_TIMEOUT_MS });
    expect(wrapper.style.transform).toMatch(/^(none|translateY\(0(px)?\))?$/);
  });

  it('shows an item that mounts after its group was revealed in its final state, never hiding it again', async () => {
    const { container, rerender } = renderWithProviders(
      <RevealGroup>
        <RevealItem>
          <p data-testid="first">um</p>
        </RevealItem>
      </RevealGroup>,
    );
    const first = getItem('first').parentElement as HTMLElement;
    triggerIntersection(getGroup(container));
    await waitFor(() => expect(first.style.opacity).toBe('1'), { timeout: REVEALED_TIMEOUT_MS });

    rerender(
      <RevealGroup>
        <RevealItem>
          <p data-testid="first">um</p>
        </RevealItem>
        <RevealItem>
          <p data-testid="late">tarde</p>
        </RevealItem>
      </RevealGroup>,
    );

    expect((getItem('late').parentElement as HTMLElement).style.opacity).toBe('1');
  });

  it('stops observing the group after the first reveal (once)', async () => {
    const { container } = renderWithProviders(
      <RevealGroup>
        <RevealItem>
          <p data-testid="item">oi</p>
        </RevealItem>
      </RevealGroup>,
    );
    const wrapper = getItem('item').parentElement as HTMLElement;

    triggerIntersection(getGroup(container));
    await waitFor(() => expect(wrapper.style.opacity).toBe('1'), { timeout: REVEALED_TIMEOUT_MS });

    expect(() => triggerIntersection(getGroup(container), false)).toThrow(/no IntersectionObserver/);
  });

  it.each<[RevealVariant, string | null]>([
    ['up', 'translateY(32px)'],
    ['left', 'translateX(-40px)'],
    ['right', 'translateX(40px)'],
    ['zoom', 'translateY(16px) scale(0.94)'],
    ['fade', null],
  ])('starts the %s variant hidden at its offset', (variant, transform) => {
    renderWithProviders(
      <RevealGroup>
        <RevealItem variant={variant}>
          <p data-testid="item">oi</p>
        </RevealItem>
      </RevealGroup>,
    );
    const wrapper = getItem('item').parentElement as HTMLElement;

    expect(wrapper.style.opacity).toBe('0');
    if (transform === null) {
      expect(wrapper.style.transform).toBe('');
    } else {
      expect(wrapper.style.transform).toBe(transform);
    }
  });

  it('defaults to the up variant', () => {
    renderWithProviders(
      <RevealGroup>
        <RevealItem>
          <p data-testid="item">oi</p>
        </RevealItem>
      </RevealGroup>,
    );

    expect((getItem('item').parentElement as HTMLElement).style.transform).toBe('translateY(32px)');
  });

  it('merges the className of group and item and renders the group as the requested tag', () => {
    const { container } = renderWithProviders(
      <RevealGroup as="section" className="grid gap-4">
        <RevealItem className="col-span-2">
          <p data-testid="item">oi</p>
        </RevealItem>
      </RevealGroup>,
    );

    expect(getGroup(container).tagName).toBe('SECTION');
    expect(getGroup(container)).toHaveClass('grid', 'gap-4');
    expect(getItem('item').parentElement).toHaveClass('col-span-2');
  });

  it('renders the group as a div by default', () => {
    const { container } = renderWithProviders(<RevealGroup>texto</RevealGroup>);

    expect(getGroup(container).tagName).toBe('DIV');
  });

  it('observes once per group, however many items it holds, with the 8 percent bottom margin', () => {
    const created: Array<{ rootMargin: string }> = [];
    class CountingObserver extends IntersectionObserverMock {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        super(callback, options);
        created.push({ rootMargin: this.rootMargin });
      }
    }
    vi.stubGlobal('IntersectionObserver', CountingObserver);

    renderWithProviders(
      <RevealGroup>
        {[0, 1, 2, 3, 4].map((index) => (
          <RevealItem key={index}>
            <p>{index}</p>
          </RevealItem>
        ))}
      </RevealGroup>,
    );

    expect(created).toEqual([{ rootMargin: '0px 0px -8% 0px' }]);
  });

  it('staggers the items in document order, also through wrapper elements', async () => {
    const { container } = renderWithProviders(
      <RevealGroup stagger={1}>
        <RevealItem>
          <p data-testid="first">um</p>
        </RevealItem>
        <div>
          <RevealItem>
            <p data-testid="second">dois</p>
          </RevealItem>
        </div>
      </RevealGroup>,
    );
    const first = getItem('first').parentElement as HTMLElement;
    const second = getItem('second').parentElement as HTMLElement;

    triggerIntersection(getGroup(container));

    // The first item has no delay, the second waits a full second: when the first one is moving the second is not.
    await waitFor(() => expect(first.style.opacity).not.toBe('0'), { timeout: REVEALED_TIMEOUT_MS });
    expect(second.style.opacity).toBe('0');
  });

  it('does not count the items of a nested group in the outer stagger', async () => {
    const { container } = renderWithProviders(
      <RevealGroup stagger={1}>
        <RevealGroup>
          <RevealItem>
            <p data-testid="nested">aninhado</p>
          </RevealItem>
        </RevealGroup>
        <RevealItem>
          <p data-testid="outer">fora</p>
        </RevealItem>
      </RevealGroup>,
    );
    const outer = getItem('outer').parentElement as HTMLElement;

    triggerIntersection(getGroup(container));

    // The nested item belongs to the nested group, so the outer item is the first of the outer group: no
    // delay. Counted wrongly it would wait a full second, longer than this timeout.
    await waitFor(() => expect(outer.style.opacity).not.toBe('0'), { timeout: NO_DELAY_TIMEOUT_MS });
  });

  it('shows an item that has no group around it in its final state', () => {
    renderWithProviders(
      <RevealItem>
        <p data-testid="item">oi</p>
      </RevealItem>,
    );

    expect((getItem('item').parentElement as HTMLElement).style.opacity).toBe('');
  });
});

describe('RevealItem below the md breakpoint', () => {
  beforeEach(() => {
    stubMatchMedia({ [WIDE_QUERY]: false });
  });

  it.each<RevealVariant>(['left', 'right'])('turns %s into up so no sideways offset can scroll the page', (variant) => {
    renderWithProviders(
      <RevealGroup>
        <RevealItem variant={variant}>
          <p data-testid="item">oi</p>
        </RevealItem>
      </RevealGroup>,
    );

    expect((getItem('item').parentElement as HTMLElement).style.transform).toBe('translateY(32px)');
  });

  it('keeps zoom and fade as they are', () => {
    renderWithProviders(
      <RevealGroup>
        <RevealItem variant="zoom">
          <p data-testid="zoom">oi</p>
        </RevealItem>
        <RevealItem variant="fade">
          <p data-testid="fade">oi</p>
        </RevealItem>
      </RevealGroup>,
    );

    expect((getItem('zoom').parentElement as HTMLElement).style.transform).toBe('translateY(16px) scale(0.94)');
    expect((getItem('fade').parentElement as HTMLElement).style.transform).toBe('');
  });
});

describe('RevealItem with reduced motion', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('renders the child in its final state at once when the system asks for reduced motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true, [WIDE_QUERY]: true });

    renderWithProviders(
      <RevealGroup>
        <RevealItem variant="left">
          <p data-testid="item">oi</p>
        </RevealItem>
      </RevealGroup>,
    );
    const wrapper = getItem('item').parentElement as HTMLElement;

    expect(wrapper.style.opacity).not.toBe('0');
    expect(wrapper).not.toHaveAttribute('style');
  });

  it('renders the child in its final state at once when the accessibility toggle paused animations', () => {
    stubMatchMedia({ [WIDE_QUERY]: true });
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));

    renderWithProviders(
      <RevealGroup>
        <RevealItem variant="zoom" className="card">
          <p data-testid="item">oi</p>
        </RevealItem>
      </RevealGroup>,
    );
    const wrapper = getItem('item').parentElement as HTMLElement;

    expect(wrapper).not.toHaveAttribute('style');
    expect(wrapper).toHaveClass('card');
  });
});

describe('RevealItem when motion is switched on or off while the page is open', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  function PauseAnimationsButton() {
    const { toggle } = useAccessibility();
    return (
      <button type="button" onClick={() => toggle('noAnimations')}>
        pausar animações
      </button>
    );
  }

  function renderFormItem() {
    return renderWithProviders(
      <>
        <PauseAnimationsButton />
        <RevealGroup>
          <RevealItem>
            <input aria-label="nome" data-testid="field" />
          </RevealItem>
        </RevealGroup>
      </>,
    );
  }

  function getFormGroup(container: HTMLElement): HTMLElement {
    return container.querySelector('[data-reveal-group]') as HTMLElement;
  }

  it('keeps the same element and the typed text of its children when reduced motion turns on', async () => {
    const user = userEvent.setup();
    const media = stubMatchMedia({ [WIDE_QUERY]: true });
    const { container } = renderFormItem();
    triggerIntersection(getFormGroup(container));
    const wrapper = getItem('field').parentElement as HTMLElement;
    await waitFor(() => expect(wrapper.style.opacity).toBe('1'), { timeout: REVEALED_TIMEOUT_MS });
    const field = getItem('field') as HTMLInputElement;
    await user.type(field, 'Ana');

    act(() => media.set(REDUCED_MOTION_QUERY, true));

    expect(getItem('field')).toBe(field);
    expect(getItem('field').parentElement).toBe(wrapper);
    expect(field).toHaveValue('Ana');
  });

  it('keeps the same element and the typed text when the accessibility toggle pauses animations', async () => {
    const user = userEvent.setup();
    stubMatchMedia({ [WIDE_QUERY]: true });
    const { container } = renderFormItem();
    triggerIntersection(getFormGroup(container));
    const wrapper = getItem('field').parentElement as HTMLElement;
    await waitFor(() => expect(wrapper.style.opacity).toBe('1'), { timeout: REVEALED_TIMEOUT_MS });
    const field = getItem('field') as HTMLInputElement;
    await user.type(field, 'Ana');

    await user.click(screen.getByRole('button', { name: 'pausar animações' }));

    expect(getItem('field')).toBe(field);
    expect(field).toHaveValue('Ana');
  });

  it('reveals an item that was still hidden when reduced motion turns on, instead of leaving it invisible', async () => {
    const media = stubMatchMedia({ [WIDE_QUERY]: true });
    renderFormItem();
    const wrapper = getItem('field').parentElement as HTMLElement;
    expect(wrapper.style.opacity).toBe('0');

    act(() => media.set(REDUCED_MOTION_QUERY, true));

    await waitFor(() => expect(wrapper.style.opacity).toBe('1'));
    expect(wrapper.style.transform).toMatch(/^(none|translateY\(0(px)?\))?$/);
  });

  it('does not hide an item again when motion turns back on after its group was revealed', async () => {
    const media = stubMatchMedia({ [WIDE_QUERY]: true, [REDUCED_MOTION_QUERY]: true });
    const { container } = renderFormItem();
    triggerIntersection(getFormGroup(container));
    const wrapper = getItem('field').parentElement as HTMLElement;
    expect(wrapper).not.toHaveAttribute('style');

    act(() => media.set(REDUCED_MOTION_QUERY, false));

    expect(getItem('field').parentElement).toBe(wrapper);
    expect(wrapper.style.opacity).not.toBe('0');
  });

  it('accepts only intrinsic tags for as, because a component might not forward the ref', () => {
    const NotATag = () => null;

    // @ts-expect-error a component is not an intrinsic tag
    const rejected = <RevealGroup as={NotATag} />;

    expect(rejected).toBeDefined();
  });
});
