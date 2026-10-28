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
} from './n8nGuard';

// Where the form lives. Today it is the legacy /contato page. Task 18 mounts the FinalCta on the home: it repoints
// this constant to '/#contato' and keeps a short smoke test of /contato. Everything below goes through the constant.
const FORM_PATH = '/contato';

const SERVICE = 'Automação de processos';
const NAME = 'Ana Lima';
const EMAIL = 'ana@empresa.com.br';
const MESSAGE = 'Quero automatizar a emissão de notas fiscais';
const WHATSAPP_TYPED = '81984451243';
const WHATSAPP_EVOLUTION = '558184451243';
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
    expect(network.calls).toHaveLength(1);
    const [call] = network.calls;
    expect(new URL(call.url).pathname).toBe(EMAIL_PATH);
    expect(call.method).toBe('POST');
    expect(Object.keys(call.payload).sort()).toEqual(EMAIL_KEYS);
    expect(call.payload).toMatchObject({ nome: NAME, email: EMAIL, servico: SERVICE, mensagem: MESSAGE });
    expect(new Date(call.payload.timestamp).toISOString()).toBe(call.payload.timestamp);
    await testInfo.attach('email-payload.json', { body: JSON.stringify(call, null, 2), contentType: 'application/json' });
    console.log(`[${testInfo.project.name}] e-mail request: ${JSON.stringify(call)}`);
  });

  test('sends the WhatsApp payload, in Evolution format, to the WhatsApp webhook', async ({ page, network }, testInfo) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);

    await useWhatsapp(page, form);
    await fillCommon(form);
    // A visitor taps the field first, which puts the caret after the +55 prefix; focus alone leaves it at the start.
    const whatsapp = form.getByLabel('WhatsApp', { exact: true });
    await whatsapp.click();
    await whatsapp.press('End');
    await whatsapp.pressSequentially(WHATSAPP_TYPED);
    await expect(whatsapp).toHaveValue('+55 81 9 8445-1243');
    await form.getByRole('checkbox').check();
    await submit(form).click();

    await expect(page.getByRole('heading', { level: 4, name: SUCCESS_TITLE })).toBeVisible();
    await expect(page.getByText('Obrigado! A gente responde pelo WhatsApp em breve.')).toBeVisible();
    expect(network.calls).toHaveLength(1);
    const [call] = network.calls;
    expect(new URL(call.url).pathname).toBe(WHATSAPP_PATH);
    expect(Object.keys(call.payload).sort()).toEqual(WHATSAPP_KEYS);
    expect(call.payload.whatsapp).toBe(WHATSAPP_EVOLUTION);
    expect(call.payload).toMatchObject({ nome: NAME, servico: SERVICE, mensagem: MESSAGE });
    await testInfo.attach('whatsapp-payload.json', { body: JSON.stringify(call, null, 2), contentType: 'application/json' });
    console.log(`[${testInfo.project.name}] WhatsApp request: ${JSON.stringify(call)}`);
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
    await expect(form.getByRole('button', { name: 'Selecione um serviço' })).toHaveAttribute('aria-invalid', 'true');
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
