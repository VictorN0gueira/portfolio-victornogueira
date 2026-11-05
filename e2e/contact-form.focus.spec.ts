import type { Locator, Page } from '@playwright/test';
import { takeFocusFromHashGuard } from './hashFocus';
import { N8N_WEBHOOK_PATTERN, expect, fulfillOk, n8nRoute, test } from './n8nGuard';

// The service list and the focus moves of the contact form, split from contact-form.spec.ts (webhooks, number
// integrity, failures, small screens) so no spec grows past the size limit. Same form, same guard, same mocked webhook.
const FORM_PATH = '/#contato';

const SERVICE = 'Automação de processos';
const NAME = 'Ana Lima';
// Typed data is fictitious on purpose (example.com is reserved): a mock that fails open could never put a fake lead on
// the real channel.
const EMAIL = 'ana@example.com';
const MESSAGE = 'Quero automatizar a emissão de notas fiscais';
const SUCCESS_TITLE = 'A gente recebeu sua mensagem';
const MIN_TOUCH_PX = 44;
const TOUCH_ROUNDING_PX = 0.01;

function formOf(page: Page): Locator {
  return page.locator('form[name="contact"]');
}

async function openForm(page: Page): Promise<Locator> {
  // The same URL again is a navigation inside the same document: nothing loads, and the page would not claim the focus
  // for the heading a second time. A reload is a new visit, as the first one is.
  if (page.url().endsWith(FORM_PATH)) await page.reload();
  else await page.goto(FORM_PATH);
  const form = formOf(page);
  await form.scrollIntoViewIfNeeded();
  await expect(form).toBeVisible();
  await takeFocusFromHashGuard(page);
  return form;
}

async function pickService(form: Locator) {
  await form.getByRole('button', { name: 'Escolhe um serviço' }).click();
  await form.getByRole('option', { name: SERVICE }).click();
  await expect(form.getByRole('listbox')).toHaveCount(0);
}

async function fillCommon(form: Locator) {
  await form.getByLabel('Nome', { exact: true }).fill(NAME);
  await pickService(form);
  await form.getByLabel('Mensagem', { exact: true }).fill(MESSAGE);
}

async function fillEmailForm(form: Locator) {
  await fillCommon(form);
  await form.getByLabel('E-mail', { exact: true }).fill(EMAIL);
  await form.getByRole('checkbox').check();
}

const submit = (form: Locator): Locator => form.getByRole('button', { name: 'Enviar', exact: true });

const SERVICE_TRIGGER = 'Escolhe um serviço';
const OPTION_COUNT = 6;
const LISTBOX_WIDTHS = [280, 320, 390, 768, 1440];
const VIEWPORT_HEIGHT_PX = 800;

function serviceTrigger(form: Locator): Locator {
  return form.getByRole('button', { name: SERVICE_TRIGGER });
}

/** Opens the service list from the keyboard: the trigger focused, then Enter. */
async function openServiceList(form: Locator): Promise<Locator> {
  await serviceTrigger(form).focus();
  await form.page().keyboard.press('Enter');
  const listbox = form.getByRole('listbox');
  await expect(listbox).toBeVisible();
  return listbox;
}

test.describe('contact form service listbox', () => {
  test('is a real listbox of options inside the form, opened and walked with the keyboard', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);

    const listbox = await openServiceList(form);

    await expect(serviceTrigger(form)).toHaveAttribute('aria-expanded', 'true');
    await expect(listbox.getByRole('option')).toHaveCount(OPTION_COUNT);
    await expect(listbox.getByRole('button')).toHaveCount(0);
    const options = listbox.getByRole('option');
    await expect(options.first()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(options.nth(1)).toBeFocused();
    await page.keyboard.press('End');
    await expect(options.last()).toBeFocused();
    await page.keyboard.press('Home');
    await expect(options.first()).toBeFocused();
    await page.keyboard.type('si');
    await expect(listbox.getByRole('option', { name: 'Site ou landing page' })).toBeFocused();
  });

  test('chooses with Enter, closes, and gives the focus back to the trigger showing the choice', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);
    const listbox = await openServiceList(form);

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(listbox).toHaveCount(0);
    await expect(form.getByRole('button', { name: 'Serviço de interesse Agente de IA' })).toBeFocused();
  });

  test('closes with Escape and the focus returns to the trigger', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);
    await openServiceList(form);

    await page.keyboard.press('Escape');

    await expect(form.getByRole('listbox')).toHaveCount(0);
    await expect(serviceTrigger(form)).toBeFocused();
  });

  test('closes with Tab and the same Tab moves on to the next field', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);
    await openServiceList(form);

    await page.keyboard.press('Tab');

    await expect(form.getByRole('listbox')).toHaveCount(0);
    await expect(form.getByLabel('E-mail', { exact: true })).toBeFocused();
  });

  test('keeps 44px options and stays inside the screen from 280 to 1440 px, scrolling when it is short of room', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    for (const width of LISTBOX_WIDTHS) {
      await page.setViewportSize({ width, height: VIEWPORT_HEIGHT_PX });
      const form = await openForm(page);
      const listbox = await openServiceList(form);

      const box = await listbox.boundingBox();
      expect(box, `list at ${width}`).not.toBeNull();
      expect(box?.x ?? -1, `left edge at ${width}`).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0), `right edge at ${width}`).toBeLessThanOrEqual(width);
      expect((box?.y ?? 0) + (box?.height ?? 0), `bottom edge at ${width}`).toBeLessThanOrEqual(VIEWPORT_HEIGHT_PX);
      // The layout height, not the drawn box: the list opens with a 160ms scale that would read a little short.
      const heights = await listbox.getByRole('option').evaluateAll((items) => items.map((item) => parseFloat(getComputedStyle(item).height)));
      for (const height of heights) expect(height, `option at ${width}`).toBeGreaterThanOrEqual(MIN_TOUCH_PX - TOUCH_ROUNDING_PX);
      await page.keyboard.press('Escape');
    }
  });

  test('never opens under the fixed header, even when the trigger sits low and the list flips up', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    for (const width of [280, 390]) {
      await page.setViewportSize({ width, height: 560 });
      const form = await openForm(page);
      const trigger = serviceTrigger(form);
      // The trigger near the bottom edge: there is no room below, so the list opens above it.
      await trigger.evaluate((element) => window.scrollBy(0, element.getBoundingClientRect().top - window.innerHeight + 90));
      const listbox = await openServiceList(form);

      const header = await page.locator('header').first().boundingBox();
      const box = await listbox.boundingBox();
      expect(header, `header at ${width}`).not.toBeNull();
      expect(box?.y ?? -1, `list top at ${width}`).toBeGreaterThanOrEqual((header?.y ?? 0) + (header?.height ?? 0));
      await page.keyboard.press('Escape');
    }
  });

  for (const key of ['ArrowDown', 'ArrowUp']) {
    test(`opens from the closed trigger with ${key}, with the focus in the list`, async ({ page, network }) => {
      await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
      const form = await openForm(page);
      await serviceTrigger(form).focus();

      await page.keyboard.press(key);

      await expect(serviceTrigger(form)).toHaveAttribute('aria-expanded', 'true');
      await expect(form.getByRole('listbox').getByRole('option').first()).toBeFocused();
    });
  }

  test('points aria-controls at the list only while it is open', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);
    await expect(serviceTrigger(form)).not.toHaveAttribute('aria-controls');

    const listbox = await openServiceList(form);
    const listId = await listbox.getAttribute('id');
    await expect(serviceTrigger(form)).toHaveAttribute('aria-controls', listId ?? '');

    await page.keyboard.press('Escape');
    await expect(serviceTrigger(form)).not.toHaveAttribute('aria-controls');
  });

  test('opens the list when its label is clicked, and the name of the trigger holds the label once', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);

    await form.locator('label', { hasText: 'Serviço de interesse' }).click();

    await expect(form.getByRole('listbox')).toBeVisible();
    await expect(form.getByRole('button', { name: 'Serviço de interesse Escolhe um serviço', exact: true })).toBeVisible();
  });

  test('keeps the chosen service name as the servico value of the lead', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);
    await fillCommon(form);
    await form.getByLabel('E-mail', { exact: true }).fill(EMAIL);
    await form.getByRole('checkbox').check();

    await submit(form).click();

    await expect(page.getByRole('heading', { level: 3, name: SUCCESS_TITLE })).toBeVisible();
    expect(network.calls[0]?.payload.servico).toBe(SERVICE);
  });
});

test.describe('contact form focus', () => {
  test('goes to the service trigger when only the service is missing', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);
    await form.getByLabel('Nome', { exact: true }).fill(NAME);
    await form.getByLabel('E-mail', { exact: true }).fill(EMAIL);
    await form.getByLabel('Mensagem', { exact: true }).fill(MESSAGE);
    await form.getByRole('checkbox').check();

    await submit(form).click();

    await expect(serviceTrigger(form)).toBeFocused();
    expect(network.calls).toHaveLength(0);
  });

  test('lands on the thanks heading, and on the name field after Enviar outra', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);
    await fillEmailForm(form);

    await submit(form).click();

    await expect(page.getByRole('heading', { level: 3, name: SUCCESS_TITLE })).toBeFocused();
    await page.getByRole('button', { name: 'Enviar outra' }).click();
    await expect(form.getByLabel('Nome', { exact: true })).toBeFocused();
  });

  test('walks the whole form with the keyboard alone, from the name to a sent lead', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);
    const keys = page.keyboard;

    await form.getByLabel('Nome', { exact: true }).focus();
    await keys.type(NAME);
    await keys.press('Tab');
    await expect(serviceTrigger(form)).toBeFocused();
    await keys.press('Enter');
    await keys.press('Enter');
    await expect(form.getByRole('listbox')).toHaveCount(0);
    await expect(form.getByRole('button', { name: `Serviço de interesse ${SERVICE}` })).toBeFocused();
    await keys.press('Tab');
    await keys.type(EMAIL);
    await keys.press('Tab');
    await keys.type(MESSAGE);
    await keys.press('Tab');
    await keys.press('Space');
    await expect(form.getByRole('checkbox')).toBeChecked();
    await keys.press('Tab');
    await expect(form.getByRole('link', { name: /Política de Privacidade/ })).toBeFocused();
    await keys.press('Tab');
    await expect(submit(form)).toBeFocused();
    await keys.press('Enter');

    await expect(page.getByRole('heading', { level: 3, name: SUCCESS_TITLE })).toBeVisible();
    expect(network.calls).toHaveLength(1);
    expect(network.calls[0]?.payload).toMatchObject({ nome: NAME, email: EMAIL, servico: SERVICE });
  });
});
