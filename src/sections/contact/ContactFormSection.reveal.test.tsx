import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { removeScrollIntoViewStub, stubScrollIntoViewEverywhere } from '../../test/scroll';
import { stubMatchMedia } from '../../test/matchMedia';
import { renderWithProviders } from '../../test/render';
import { ContactFormSection } from './ContactFormSection';

const MAX_TABS_TO_THE_MESSAGE = 20;

describe('ContactFormSection: the message box is shown whole when Tab reaches it', () => {
  let scrollIntoView: ReturnType<typeof stubScrollIntoViewEverywhere>;

  beforeEach(() => {
    stubMatchMedia();
    scrollIntoView = stubScrollIntoViewEverywhere();
    // The reveal waits one frame for the browser's own scroll: run the frame at once.
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 0;
    });
  });

  afterEach(() => {
    removeScrollIntoViewStub();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function renderSection() {
    renderWithProviders(<ContactFormSection />);
    return screen.getByRole('textbox', { name: 'Mensagem' });
  }

  async function tabUntilFocused(user: ReturnType<typeof userEvent.setup>, field: HTMLElement, key = '{Tab}') {
    for (let press = 0; press < MAX_TABS_TO_THE_MESSAGE && document.activeElement !== field; press += 1) {
      await user.keyboard(key);
    }
    expect(field).toHaveFocus();
  }

  it('scrolls the whole textarea into the scroll padding, only as far as needed (block nearest)', async () => {
    const user = userEvent.setup();
    const message = renderSection();

    await tabUntilFocused(user, message);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
    expect(scrollIntoView.mock.contexts[0]).toBe(message);
  });

  it('does it for Shift+Tab too', async () => {
    const user = userEvent.setup();
    const message = renderSection();
    await tabUntilFocused(user, message);
    scrollIntoView.mockClear();

    await user.tab();
    await user.tab({ shift: true });

    expect(message).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('leaves the fields Tab passes on the way alone', async () => {
    const user = userEvent.setup();
    const message = renderSection();
    const before = new Set<Element | null>();

    for (let press = 0; press < MAX_TABS_TO_THE_MESSAGE && document.activeElement !== message; press += 1) {
      await user.tab();
      if (document.activeElement !== message) before.add(document.activeElement);
    }

    expect(before.size).toBeGreaterThan(1);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(message);
  });

  it('does not move the page for a click: the visitor aimed at what they see', async () => {
    const user = userEvent.setup();
    const message = renderSection();

    await user.click(message);

    expect(message).toHaveFocus();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('does not move the page when the page itself puts focus in the box (the quote of the simulator)', () => {
    const message = renderSection();

    act(() => message.focus({ preventScroll: true }));

    expect(message).toHaveFocus();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("does not take a focus that comes long after the last Tab for that Tab's", async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const message = renderSection();
    const [firstField] = screen.getAllByRole('textbox');
    act(() => firstField.focus());
    await user.tab();
    scrollIntoView.mockClear();

    vi.setSystemTime(Date.now() + 5000);
    act(() => message.focus({ preventScroll: true }));

    expect(message).toHaveFocus();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('does not move the page for a click that lands right after a Tab: only keyboard focus scrolls', async () => {
    const user = userEvent.setup();
    const message = renderSection();
    const [firstField] = screen.getAllByRole('textbox');
    act(() => firstField.focus());
    await user.tab();

    await user.click(message);

    expect(message).toHaveFocus();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('does not move the page for the focus a press outside the form gives the box right after a Tab', async () => {
    const user = userEvent.setup();
    const message = renderSection();
    const [firstField] = screen.getAllByRole('textbox');
    act(() => firstField.focus());
    await user.tab();

    fireEvent.pointerDown(document.body);
    act(() => message.focus());

    expect(message).toHaveFocus();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('scrolls again for the next Tab after a click: the press only clears the last Tab, it does not turn the reveal off', async () => {
    const user = userEvent.setup();
    const message = renderSection();
    const [firstField] = screen.getAllByRole('textbox');
    await user.click(firstField);

    await tabUntilFocused(user, message);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(message);
  });

  describe('when the box is taller than the band the scroll padding leaves visible', () => {
    const WINDOW_HEIGHT_PX = 400;
    const PADDING_TOP_PX = 96;
    const PADDING_BOTTOM_PX = 80;
    // 400 - 96 - 80: what a phone on its side shows between the header and the floating buttons.
    const VISIBLE_BAND_PX = 224;
    let scrollPaddingRules: HTMLStyleElement;

    beforeEach(() => {
      vi.stubGlobal('innerHeight', WINDOW_HEIGHT_PX);
      scrollPaddingRules = document.createElement('style');
      document.head.append(scrollPaddingRules);
      setScrollPadding(PADDING_TOP_PX, PADDING_BOTTOM_PX);
    });

    afterEach(() => {
      scrollPaddingRules.remove();
      vi.unstubAllGlobals();
    });

    function setScrollPadding(top: number, bottom: number) {
      scrollPaddingRules.textContent = `html { scroll-padding-top: ${top}px; scroll-padding-bottom: ${bottom}px; }`;
    }

    function renderBoxOfHeight(height: number) {
      const message = renderSection();
      vi.spyOn(message, 'getBoundingClientRect').mockReturnValue({ height } as DOMRect);
      return message;
    }

    it('aligns its top under the header (block start), so the caret line is not left below the band', async () => {
      const user = userEvent.setup();
      const message = renderBoxOfHeight(VISIBLE_BAND_PX + 1);

      await tabUntilFocused(user, message);

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', inline: 'nearest' });
    });

    it('keeps block nearest for a box that fits the band, the exact fit included', async () => {
      const user = userEvent.setup();
      const message = renderBoxOfHeight(VISIBLE_BAND_PX);

      await tabUntilFocused(user, message);

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
    });

    it('reads the padding when the focus lands, because the tab band of the page changes it', async () => {
      const user = userEvent.setup();
      const message = renderBoxOfHeight(VISIBLE_BAND_PX);
      // The same box no longer fits once the tab band takes more of the bottom edge: 400 - 96 - 130 = 174.
      setScrollPadding(PADDING_TOP_PX, 130);

      await tabUntilFocused(user, message);

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', inline: 'nearest' });
    });
  });

  it('waits for one frame, so the scroll of the browser to the caret does not replace it', async () => {
    const user = userEvent.setup();
    const message = renderSection();
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => frames.push(callback));

    await tabUntilFocused(user, message);
    expect(scrollIntoView).not.toHaveBeenCalled();

    frames.forEach((callback) => callback(0));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('skips a box that lost focus before the frame ran', async () => {
    const user = userEvent.setup();
    const message = renderSection();
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => frames.push(callback));

    await tabUntilFocused(user, message);
    act(() => message.blur());
    frames.forEach((callback) => callback(0));

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
