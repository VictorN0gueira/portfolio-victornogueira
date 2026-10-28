import type { Locator, Page } from '@playwright/test';
import {
  N8N_WEBHOOK_PATTERN,
  abortRequest,
  expect,
  fulfillOk,
  fulfillStatus,
  n8nRoute,
  test,
  type N8nAnswer,
  type NetworkGuard,
} from './n8nGuard';

// Where the form lives. Today it is the legacy /contato page. Task 18 mounts the FinalCta on the home: it repoints
// this constant to '/#contato' and keeps a short smoke test of /contato. Everything below goes through the constant.
const FORM_PATH = '/contato';

const SERVICE = 'Automação de processos';
const NAME = 'Ana Lima';
// Typed data is fictitious on purpose (example.com is reserved, 11 90000-0000 is not a line): a mock that fails open
// could never put a fake lead on the real channel. The Evolution value is what toEvolutionFormat gives.
const EMAIL = 'ana@example.com';
const MESSAGE = 'Quero automatizar a emissão de notas fiscais';
const WHATSAPP_TYPED = '11900000000';
const WHATSAPP_DISPLAY = '+55 11 9 0000-0000';
const WHATSAPP_EVOLUTION = '551100000000';
const WHATSAPP_LINK = 'wa.me/5581984451243';
const EMAIL_PATH = '/webhook/portfolio-vn-email';
const WHATSAPP_PATH = '/webhook/portfolio-vn-whatsapp';
const EMAIL_KEYS = ['email', 'mensagem', 'nome', 'servico', 'timestamp'];
const WHATSAPP_KEYS = ['mensagem', 'nome', 'servico', 'timestamp', 'whatsapp'];
const SUCCESS_TITLE = 'Recebemos sua mensagem';
const ERROR_TEXT = 'Não deu pra enviar. Tenta de novo ou fala direto pelo WhatsApp.';
const MIN_TEXT_PX = 16;
const MIN_TOUCH_PX = 44;
const LARGE_FONT_RATIO = 1.2;

function formOf(page: Page): Locator {
  return page.locator('form[name="contact"]');
}

async function openForm(page: Page): Promise<Locator> {
  await page.goto(FORM_PATH);
  const form = formOf(page);
  await form.scrollIntoViewIfNeeded();
  await expect(form).toBeVisible();
  return form;
}

async function pickService(form: Locator) {
  await form.getByRole('button', { name: 'Selecione um serviço' }).click();
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

// The polite status region that says the send worked (the legacy page may have other status regions).
const announcement = (page: Page): Locator => page.getByRole('status').filter({ hasText: SUCCESS_TITLE });
const submit = (form: Locator): Locator => form.getByRole('button', { name: 'Enviar', exact: true });
const errorAlert = (form: Locator): Locator => form.getByRole('alert').filter({ hasText: 'Não deu pra enviar' });

async function useWhatsapp(page: Page, form: Locator) {
  await page.getByRole('button', { name: 'Por WhatsApp' }).click();
  await expect(form.getByLabel('WhatsApp', { exact: true })).toBeVisible();
}

test.describe('contact form webhooks', () => {
  test('sends the e-mail payload to the e-mail webhook and thanks the visitor', async ({ page, network }, testInfo) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);

    await fillEmailForm(form);
    await submit(form).click();

    await expect(page.getByRole('heading', { level: 4, name: SUCCESS_TITLE })).toBeVisible();
    // The region was mounted before the send, outside the success markup, and now holds the title and the text.
    await expect(announcement(page)).toHaveText('Recebemos sua mensagem. Obrigado! A gente responde pelo e-mail em breve.');
    expect(network.calls).toHaveLength(1);
    const [call] = network.calls;
    expect(new URL(call.url).pathname).toBe(EMAIL_PATH);
    expect(call.method).toBe('POST');
    expect(Object.keys(call.payload).sort()).toEqual(EMAIL_KEYS);
    expect(call.payload).toMatchObject({ nome: NAME, email: EMAIL, servico: SERVICE, mensagem: MESSAGE });
    expect(new Date(call.payload.timestamp).toISOString()).toBe(call.payload.timestamp);
    await testInfo.attach('email-payload.json', { body: JSON.stringify(call, null, 2), contentType: 'application/json' });
  });

  test('sends the WhatsApp payload, in Evolution format, to the WhatsApp webhook', async ({ page, network }, testInfo) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);

    await useWhatsapp(page, form);
    await fillCommon(form);
    // A tap at the very start of the field puts the caret before the +55 prefix: the field moves it behind the prefix,
    // so the digits come out in order and the lead goes to the number that was typed.
    const whatsapp = form.getByLabel('WhatsApp', { exact: true });
    await whatsapp.click({ position: { x: 2, y: 20 } });
    await whatsapp.pressSequentially(WHATSAPP_TYPED);
    await expect(whatsapp).toHaveValue(WHATSAPP_DISPLAY);
    await form.getByRole('checkbox').check();
    await submit(form).click();

    await expect(page.getByRole('heading', { level: 4, name: SUCCESS_TITLE })).toBeVisible();
    await expect(page.getByText('Obrigado! A gente responde pelo WhatsApp em breve.', { exact: true })).toBeVisible();
    await expect(announcement(page)).toHaveText('Recebemos sua mensagem. Obrigado! A gente responde pelo WhatsApp em breve.');
    expect(network.calls).toHaveLength(1);
    const [call] = network.calls;
    expect(new URL(call.url).pathname).toBe(WHATSAPP_PATH);
    expect(Object.keys(call.payload).sort()).toEqual(WHATSAPP_KEYS);
    expect(call.payload.whatsapp).toBe(WHATSAPP_EVOLUTION);
    expect(call.payload).toMatchObject({ nome: NAME, servico: SERVICE, mensagem: MESSAGE });
    await testInfo.attach('whatsapp-payload.json', { body: JSON.stringify(call, null, 2), contentType: 'application/json' });
  });

  test('starts over with Enviar outra', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);
    await fillEmailForm(form);
    await submit(form).click();

    await page.getByRole('button', { name: 'Enviar outra' }).click();

    await expect(formOf(page)).toBeVisible();
    await expect(formOf(page).getByLabel('Nome', { exact: true })).toHaveValue('');
    await expect(formOf(page).getByRole('checkbox')).not.toBeChecked();
  });
});

// The number of a lead cannot be wrong. These scenarios drive the WhatsApp field the way a visitor can corrupt it in a
// real browser (jsdom cannot see them): a caret or a selection inside the +55 prefix, a second click at the same place
// (React raises no select event for it), the Home key, and an international number pasted behind the prefix. Each one
// ends in the same check: the field shows the typed number in order and the webhook gets the Evolution number of it.
test.describe('contact form WhatsApp number integrity', () => {
  const PREFIX_CLICK = { position: { x: 2, y: 20 } };
  // Two taps closer than this are one double tap, which selects a word and so takes another path (the select event).
  const DOUBLE_TAP_GAP_MS = 700;
  const INTERNATIONAL_NUMBER = '+55 11 90000-0000';

  async function fillUpToTheNumber(page: Page, form: Locator): Promise<Locator> {
    await useWhatsapp(page, form);
    await fillCommon(form);
    return form.getByLabel('WhatsApp', { exact: true });
  }

  /** Sends the form and checks that the lead goes to the number that was typed, in order and in the right format. */
  async function expectLeadForTheTypedNumber(page: Page, form: Locator, network: NetworkGuard, whatsapp: Locator) {
    await expect(whatsapp).toHaveValue(WHATSAPP_DISPLAY);
    await form.getByRole('checkbox').check();
    await submit(form).click();

    await expect(page.getByRole('heading', { level: 4, name: SUCCESS_TITLE })).toBeVisible();
    expect(network.calls).toHaveLength(1);
    const [call] = network.calls;
    expect(new URL(call.url).pathname).toBe(WHATSAPP_PATH);
    expect(call.payload.whatsapp).toBe(WHATSAPP_EVOLUTION);
  }

  test.beforeEach(async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
  });

  test('keeps the digits in order after two clicks at the same place inside the prefix', async ({ page, network }) => {
    const form = await openForm(page);
    const whatsapp = await fillUpToTheNumber(page, form);

    await whatsapp.click(PREFIX_CLICK);
    await whatsapp.click(PREFIX_CLICK);
    await whatsapp.pressSequentially(WHATSAPP_TYPED);

    await expectLeadForTheTypedNumber(page, form, network, whatsapp);
  });

  test('keeps the digits in order after a double click on the prefix', async ({ page, network }) => {
    const form = await openForm(page);
    const whatsapp = await fillUpToTheNumber(page, form);

    await whatsapp.dblclick(PREFIX_CLICK);
    await whatsapp.pressSequentially(WHATSAPP_TYPED);

    await expectLeadForTheTypedNumber(page, form, network, whatsapp);
  });

  test('keeps the digits in order after a tap and a second tap at the same place', async ({ page, network }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'a tap needs a touch screen');
    const form = await openForm(page);
    const whatsapp = await fillUpToTheNumber(page, form);

    await whatsapp.tap(PREFIX_CLICK);
    await page.waitForTimeout(DOUBLE_TAP_GAP_MS);
    await whatsapp.tap(PREFIX_CLICK);
    await whatsapp.pressSequentially(WHATSAPP_TYPED);

    await expectLeadForTheTypedNumber(page, form, network, whatsapp);
  });

  test('keeps the digits in order after the Home key pressed twice', async ({ page, network }) => {
    const form = await openForm(page);
    const whatsapp = await fillUpToTheNumber(page, form);

    await whatsapp.click();
    await whatsapp.press('Home');
    await whatsapp.press('Home');
    await whatsapp.pressSequentially(WHATSAPP_TYPED);

    await expectLeadForTheTypedNumber(page, form, network, whatsapp);
  });

  test('keeps the digits in order after Shift+Home selects the prefix', async ({ page, network }) => {
    const form = await openForm(page);
    const whatsapp = await fillUpToTheNumber(page, form);

    await whatsapp.click();
    await whatsapp.press('Shift+Home');
    await whatsapp.pressSequentially(WHATSAPP_TYPED);

    await expectLeadForTheTypedNumber(page, form, network, whatsapp);
  });

  // A synthetic paste event with a DataTransfer: the page code reads the clipboard text from the event, and nothing here
  // depends on the operating system clipboard, which two workers would share. (A synthetic event has no default action, so
  // only the pastes the page takes over can be tested this way; the default paste of a local number is checked on the
  // built preview with a real Control+V.)
  const SYNTHETIC_PASTES = [
    ['a number with the plus', INTERNATIONAL_NUMBER],
    ['a number after a label', 'tel: +55 11 90000-0000'],
    ['a number wrapped in bidi controls', '\u202a+55 11 90000-0000\u202c'],
    ['a number with no plus wrapped in bidi controls', '\u202a5511900000000\u202c'],
    ['a number with a double zero for the plus', '00 55 11 90000 0000'],
  ] as const;

  for (const [label, text] of SYNTHETIC_PASTES) {
    test(`takes ${label} as the whole number, not as the digits behind the +55 prefix`, async ({ page, network }) => {
      const form = await openForm(page);
      const whatsapp = await fillUpToTheNumber(page, form);

      await whatsapp.click();
      const wasCancelled = await whatsapp.evaluate((input, pasted) => {
        const data = new DataTransfer();
        data.setData('text', pasted);
        const event = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
        input.dispatchEvent(event);
        return event.defaultPrevented;
      }, text);

      expect(wasCancelled).toBe(true);
      await expectLeadForTheTypedNumber(page, form, network, whatsapp);
    });
  }

  test('cancels a pasted number from another country and leaves the typed number as it was', async ({ page }) => {
    const form = await openForm(page);
    const whatsapp = await fillUpToTheNumber(page, form);
    await whatsapp.click();
    await whatsapp.pressSequentially(WHATSAPP_TYPED);

    const wasCancelled = await whatsapp.evaluate((input) => {
      const data = new DataTransfer();
      data.setData('text', '+1 415 555 2671');
      const event = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
      input.dispatchEvent(event);
      return event.defaultPrevented;
    });

    expect(wasCancelled).toBe(true);
    await expect(whatsapp).toHaveValue(WHATSAPP_DISPLAY);
  });

  // A range that starts between the two 5s and reaches past the prefix used to be left alone: the next digit replaced
  // everything after the first 5 and the surviving 5 joined it (+55 51 9 1900-0000 for a number that starts with 11).
  test('keeps the digits in order after Shift+ArrowLeft stops between the two 5s', async ({ page, network }) => {
    const form = await openForm(page);
    const whatsapp = await fillUpToTheNumber(page, form);
    await whatsapp.click();
    await whatsapp.pressSequentially(WHATSAPP_TYPED);
    await expect(whatsapp).toHaveValue(WHATSAPP_DISPLAY);

    // From the end of "+55 11 9 0000-0000" back to the index 2: all but the "+5".
    const shiftLeftPresses = WHATSAPP_DISPLAY.length - 2;
    for (let press = 0; press < shiftLeftPresses; press += 1) await whatsapp.press('Shift+ArrowLeft');
    await whatsapp.pressSequentially(WHATSAPP_TYPED);

    await expectLeadForTheTypedNumber(page, form, network, whatsapp);
  });

  test('keeps the digits in order after a mouse drag from between the two 5s to the end of the field', async ({ page, network }) => {
    const form = await openForm(page);
    const whatsapp = await fillUpToTheNumber(page, form);
    await whatsapp.click();
    await whatsapp.pressSequentially(WHATSAPP_TYPED);
    await expect(whatsapp).toHaveValue(WHATSAPP_DISPLAY);

    // The x of the gap between the "+5" and the second "5" is the width of "+5" in the font of the field, past its padding.
    const drag = await whatsapp.evaluate((input: HTMLInputElement) => {
      const style = getComputedStyle(input);
      const context = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;
      context.font = style.font;
      const box = input.getBoundingClientRect();
      const textLeft = box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
      return { fromX: textLeft + context.measureText('+5').width, toX: box.right - 3, y: box.top + box.height / 2 };
    });
    await page.mouse.move(drag.fromX, drag.y);
    await page.mouse.down();
    await page.mouse.move(drag.toX, drag.y, { steps: 8 });
    await page.mouse.up();
    await whatsapp.pressSequentially(WHATSAPP_TYPED);

    await expectLeadForTheTypedNumber(page, form, network, whatsapp);
  });

  // React raises its select event only when the selection differs from the last one it sampled: a caret that goes back to
  // the place a click had put it (offset 0 for PREFIX_CLICK), with no click and no key (a touch caret handle, the space bar
  // swipe of a phone keyboard), may raise none. A script stands in for that move, twice, with a pause so the first one is
  // handled.
  async function returnCaretInsidePrefixTwice(whatsapp: Locator, offset: number) {
    await whatsapp.evaluate(async (input: HTMLInputElement, at: number) => {
      for (let move = 0; move < 2; move += 1) {
        input.setSelectionRange(at, at);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
    }, offset);
  }

  test('keeps the digits in order after the caret returns inside the prefix with no click and no key', async ({ page, network }) => {
    const form = await openForm(page);
    const whatsapp = await fillUpToTheNumber(page, form);

    await whatsapp.click(PREFIX_CLICK);
    await returnCaretInsidePrefixTwice(whatsapp, 0);
    await whatsapp.pressSequentially(WHATSAPP_TYPED);

    await expectLeadForTheTypedNumber(page, form, network, whatsapp);
  });

  // Text inserted with no key at all (dictation, an input method commit, the clipboard of a keyboard app) has no key down.
  test('keeps the digits in order when the text is inserted with no key after the caret returned inside the prefix', async ({ page, network }) => {
    const form = await openForm(page);
    const whatsapp = await fillUpToTheNumber(page, form);

    await whatsapp.click(PREFIX_CLICK);
    await returnCaretInsidePrefixTwice(whatsapp, 2);
    await page.keyboard.insertText(WHATSAPP_TYPED);

    await expectLeadForTheTypedNumber(page, form, network, whatsapp);
  });

  test('keeps the number when Backspace is pressed at the start of it, and lets the visitor type again', async ({ page, network }) => {
    const form = await openForm(page);
    const whatsapp = await fillUpToTheNumber(page, form);
    await whatsapp.click();
    await whatsapp.pressSequentially(WHATSAPP_TYPED);
    await expect(whatsapp).toHaveValue(WHATSAPP_DISPLAY);

    await whatsapp.evaluate((input: HTMLInputElement) => input.setSelectionRange(4, 4));
    await whatsapp.press('Backspace');
    await expect(whatsapp).toHaveValue(WHATSAPP_DISPLAY);
    await whatsapp.press('Control+A');
    await whatsapp.press('Backspace');
    await expect(whatsapp).toHaveValue('+55 ');
    await whatsapp.pressSequentially(WHATSAPP_TYPED);

    await expectLeadForTheTypedNumber(page, form, network, whatsapp);
  });
});

test.describe('contact form validation and failures', () => {
  test('shows the four errors and sends nothing when the form is empty', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);

    await form.getByRole('checkbox').check();
    await submit(form).click();

    const alerts = form.getByRole('alert');
    await expect(alerts).toHaveCount(4);
    await expect(alerts.filter({ hasText: 'Conta pra gente seu nome' })).toHaveCount(1);
    await expect(alerts.filter({ hasText: 'Escolhe um serviço' })).toHaveCount(1);
    await expect(alerts.filter({ hasText: 'Esse e-mail parece incompleto' })).toHaveCount(1);
    await expect(alerts.filter({ hasText: 'Escreve um pouco mais sobre o que você precisa' })).toHaveCount(1);
    await expect(form.getByLabel('Nome', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    // The trigger is named by its visible label and its own text, so it is found by the label too.
    await expect(form.getByRole('button', { name: 'Serviço de interesse' })).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByRole('button', { name: 'Serviço de interesse' })).toHaveAccessibleName(/Serviço de interesse/);
    expect(network.calls).toHaveLength(0);
  });

  test('shows the alert with the WhatsApp link on a 500, and sends again after Fechar', async ({ page, network }) => {
    const answer: N8nAnswer = (route, call) =>
      network.calls.length === 1 ? fulfillStatus(500)(route, call) : fulfillOk(route, call);
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, answer));
    const form = await openForm(page);
    await fillEmailForm(form);

    await submit(form).click();

    await expect(errorAlert(form)).toBeVisible();
    await expect(errorAlert(form)).toContainText(ERROR_TEXT);
    await expect(errorAlert(form).getByRole('link', { name: 'fala direto pelo WhatsApp' })).toHaveAttribute(
      'href',
      new RegExp(WHATSAPP_LINK.replace('.', '\\.')),
    );
    await expect(submit(form)).toBeDisabled();
    expect(network.calls).toHaveLength(1);

    await errorAlert(form).getByRole('button', { name: 'Fechar' }).click();
    await expect(errorAlert(form)).toHaveCount(0);
    await submit(form).click();

    await expect(page.getByRole('heading', { level: 4, name: SUCCESS_TITLE })).toBeVisible();
    expect(network.calls).toHaveLength(2);
    expect(network.calls.map((call) => new URL(call.url).pathname)).toEqual([EMAIL_PATH, EMAIL_PATH]);
  });

  test('shows the same alert when the network is down', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, abortRequest));
    const form = await openForm(page);
    await fillEmailForm(form);

    await submit(form).click();

    await expect(errorAlert(form)).toContainText(ERROR_TEXT);
    await expect(errorAlert(form).getByRole('link', { name: 'fala direto pelo WhatsApp' })).toHaveAttribute(
      'href',
      new RegExp(WHATSAPP_LINK.replace('.', '\\.')),
    );
    expect(network.calls).toHaveLength(1);
  });
});

// The sizes are asserted on both projects: a desktop window can be narrowed, and a phone is the case that matters.
test.describe('contact form on small screens', () => {
  function textControls(form: Locator): Locator {
    return form.locator('input[type="text"], input[type="email"], textarea, button[aria-haspopup="listbox"]');
  }

  async function fontSizes(controls: Locator): Promise<number[]> {
    return controls.evaluateAll((elements) => elements.map((element) => parseFloat(getComputedStyle(element).fontSize)));
  }

  test('keeps every text control at 16px or more so iOS never zooms in', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);

    const sizes = await fontSizes(textControls(form));
    expect(sizes).toHaveLength(4);
    for (const size of sizes) expect(size).toBeGreaterThanOrEqual(MIN_TEXT_PX);

    await useWhatsapp(page, form);
    const phone = await fontSizes(form.getByLabel('WhatsApp', { exact: true }));
    expect(phone).toHaveLength(1);
    expect(phone[0]).toBeGreaterThanOrEqual(MIN_TEXT_PX);
  });

  test('keeps them at 16px or more with the larger font option on', async ({ page, network }) => {
    await page.addInitScript(() => {
      localStorage.setItem('a11y-preferences', JSON.stringify({ fontSize: true }));
    });
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);
    await expect(page.locator('html')).toHaveClass(/a11y-font-large/);

    const sizes = await fontSizes(textControls(form));
    for (const size of sizes) expect(size).toBeGreaterThanOrEqual(MIN_TEXT_PX * LARGE_FONT_RATIO - 0.5);
  });

  test('gives every control a 44px touch target', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);
    const panel = form.locator('xpath=..');
    const controls: Record<string, Locator> = {
      'Por e-mail': panel.getByRole('button', { name: 'Por e-mail' }),
      'Por WhatsApp': panel.getByRole('button', { name: 'Por WhatsApp' }),
      Nome: form.getByLabel('Nome', { exact: true }),
      'Serviço de interesse': form.getByRole('button', { name: 'Selecione um serviço' }),
      'E-mail': form.getByLabel('E-mail', { exact: true }),
      Mensagem: form.getByLabel('Mensagem', { exact: true }),
      Consentimento: form.getByRole('checkbox').locator('xpath=ancestor::label'),
      Enviar: submit(form),
    };

    for (const [name, control] of Object.entries(controls)) {
      const box = await control.boundingBox();
      expect(box, name).not.toBeNull();
      expect(box?.height ?? 0, name).toBeGreaterThanOrEqual(MIN_TOUCH_PX);
    }
  });
});
