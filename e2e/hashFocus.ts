import type { Page } from '@playwright/test';
import { expect } from './n8nGuard';

// Opening /#contato makes the page claim the focus for the section heading (useScrollToHash, scrollToIdWhenMounted) and
// guard it for a second (focusGuard): any focus move in that second that no key, touch, wheel or click caused is taken
// back to the heading, so the next Tab continues from the section. That is the product doing its job, but a test that
// moves the focus with .focus() or .fill() inside that second has its focus pulled away and its keys land on the
// heading. The second runs from the moment the section mounts, so how much of it is left when the test acts depends on
// the speed of the machine. The test acts like a visitor does: it waits until the page has claimed the focus, then
// gives the page its first input, which hands the focus over for good.

const SECTION_HEADING = '#contato h2';
// A modifier on its own types nothing and moves nothing, but it is a key of the visitor: the guard lets go of the focus.
const HAND_OVER_KEY = 'Shift';

/** Waits until the page has put the focus on the heading of the contact section, then takes the focus over from its guard. */
export async function takeFocusFromHashGuard(page: Page): Promise<void> {
  await expect(page.locator(SECTION_HEADING).first()).toBeFocused();
  await page.keyboard.press(HAND_OVER_KEY);
}
