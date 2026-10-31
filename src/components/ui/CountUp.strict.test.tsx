import { screen, waitFor } from '@testing-library/react';
import { Profiler } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { triggerIntersection } from '../../test/intersection';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { CountUp } from './CountUp';

const SHORT_DURATION_MS = 60;
const SETTLE_TIMEOUT_MS = 2000;

// main.tsx wraps the app in StrictMode, so every effect mounts, cleans up and mounts again in development. The count must
// survive that: one number on screen, settling on the written value, with the first animation stopped by its cleanup.
describe('CountUp in StrictMode', () => {
  beforeEach(() => {
    stubMatchMedia();
  });

  it('renders one counting number and one screen reader copy, not two', () => {
    const { container } = renderWithProviders(<CountUp value="85%" />, { strict: true });

    expect(screen.getAllByText('85%')).toHaveLength(1);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });

  it('counts up and settles on the written value after the effect ran twice', async () => {
    const { container } = renderWithProviders(<CountUp value="500h+" durationMs={SHORT_DURATION_MS} />, { strict: true });
    const wrapper = container.firstElementChild as HTMLElement;
    const numberNode = wrapper.children[1] as HTMLElement;

    triggerIntersection(wrapper);

    await waitFor(() => expect(numberNode).toHaveTextContent(/^500$/), { timeout: SETTLE_TIMEOUT_MS });
    await new Promise((resolve) => setTimeout(resolve, SHORT_DURATION_MS * 2));
    expect(numberNode).toHaveTextContent(/^500$/);
  });

  it('does not re-render on every frame of the count', async () => {
    let commits = 0;
    const { container } = renderWithProviders(
      <Profiler id="count" onRender={() => (commits += 1)}>
        <CountUp value="500h+" durationMs={SHORT_DURATION_MS * 3} />
      </Profiler>,
      { strict: true },
    );
    const wrapper = container.firstElementChild as HTMLElement;

    triggerIntersection(wrapper);
    await waitFor(() => expect(wrapper.children[1]).toHaveTextContent(/^500$/), { timeout: SETTLE_TIMEOUT_MS });

    expect(commits).toBeLessThan(10);
  });
});
