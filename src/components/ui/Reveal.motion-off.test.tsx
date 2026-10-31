import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { REDUCED_MOTION_QUERY, stubMatchMedia } from '../../test/matchMedia';
import { triggerIntersection } from '../../test/intersection';
import { renderWithProviders } from '../../test/render';
import { useAccessibility } from '../../contexts/useAccessibility';
import { RevealGroup, RevealItem } from './Reveal';
import { A11Y_STORAGE_KEY } from '../../contexts/AccessibilityContext';

const REVEALED_TIMEOUT_MS = 3000;
const MOTION_BACK_ON_WINDOW_MS = 1000;

function getItem(testId: string): HTMLElement {
  return screen.getByTestId(testId);
}

describe('RevealItem with reduced motion', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('renders the child in its final state at once when the system asks for reduced motion', () => {
    stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });

    renderWithProviders(
      <RevealGroup>
        <RevealItem variant="rise-blur">
          <p data-testid="item">oi</p>
        </RevealItem>
      </RevealGroup>,
    );
    const wrapper = getItem('item').parentElement as HTMLElement;

    expect(wrapper.style.opacity).not.toBe('0');
    expect(wrapper).not.toHaveAttribute('style');
  });

  it('renders the child in its final state at once when the accessibility toggle paused animations', () => {
    stubMatchMedia();
    localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify({ noAnimations: true }));

    renderWithProviders(
      <RevealGroup>
        <RevealItem variant="fade" className="card">
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
    const media = stubMatchMedia();
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
    stubMatchMedia();
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
    const media = stubMatchMedia();
    renderFormItem();
    const wrapper = getItem('field').parentElement as HTMLElement;
    expect(wrapper.style.opacity).toBe('0');

    act(() => media.set(REDUCED_MOTION_QUERY, true));

    await waitFor(() => expect(wrapper.style.opacity).toBe('1'));
    expect(wrapper.style.transform).toMatch(/^(none|translateY\(0(px)?\))?$/);
  });

  it('does not hide an item again when motion turns back on after its group was revealed', async () => {
    const media = stubMatchMedia();
    const { container } = renderFormItem();
    triggerIntersection(getFormGroup(container));
    const wrapper = getItem('field').parentElement as HTMLElement;
    await waitFor(() => expect(wrapper.style.opacity).toBe('1'), { timeout: REVEALED_TIMEOUT_MS });
    act(() => media.set(REDUCED_MOTION_QUERY, true));
    await waitFor(() => expect(wrapper.style.opacity).toBe('1'));
    // The element has been driven by motion before, so motion knows where it is. A regression that
    // animates it toward hidden when motion comes back would show up as an opacity below 1 in the window.
    const opacities: string[] = [];
    const observer = new MutationObserver(() => opacities.push(wrapper.style.opacity));
    observer.observe(wrapper, { attributes: true, attributeFilter: ['style'] });

    act(() => media.set(REDUCED_MOTION_QUERY, false));
    // Longer than the 0.7s reveal: an item that started to animate toward hidden would be well on its way.
    await new Promise((resolve) => setTimeout(resolve, MOTION_BACK_ON_WINDOW_MS));
    observer.disconnect();

    expect(getItem('field').parentElement).toBe(wrapper);
    expect(opacities.filter((opacity) => opacity !== '' && opacity !== '1')).toEqual([]);
    expect(wrapper.style.opacity).toBe('1');
    expect(wrapper.style.transform).toMatch(/^(none|translateY\(0(px)?\))?$/);
  });

  // jsdom has no computed opacity, so motion cannot tell where an element it never drove is: this can check the
  // element identity and that nothing hides it at the flip, and the test above checks the animation window.
  it('keeps the element of an item that was revealed while motion was off, and visible, when motion turns on', () => {
    const media = stubMatchMedia({ [REDUCED_MOTION_QUERY]: true });
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
