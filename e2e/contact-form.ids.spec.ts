import type { Locator, Page } from '@playwright/test';
import { contactFormCopy } from '../src/components/contact/contactFormCopy';
import { serviceOptions } from '../src/data/services';
import { N8N_WEBHOOK_PATTERN, expect, fulfillOk, n8nRoute, test } from './n8nGuard';

// The ids of the contact form come from React useId, so no test can name one. What matters is the wiring: every label
// reaches a control of its own form, and every aria-describedby, aria-labelledby and aria-controls points at an element
// that exists. This spec proves it in a real browser in each state of the form (empty, with errors, WhatsApp, sent),
// and that two forms on one page share no id. The form is never really submitted: the webhook is answered by a route.

const CONSENT_ID = 'contact-privacy-new-tab';

interface Wiring {
  danglingLabels: string[];
  danglingReferences: string[];
  duplicateIds: string[];
  labelCount: number;
}

/** Reads the wiring of one form in the page itself, with the browser's own id lookup. */
async function readWiring(form: Locator): Promise<Wiring> {
  return form.evaluate((element, consentId) => {
    const exists = (id: string) => element.ownerDocument.getElementById(id) !== null;
    const labels = [...element.querySelectorAll('label[for]')];
    const danglingLabels = labels
      .filter((label) => !element.querySelector(`[id="${label.getAttribute('for')}"]`))
      .map((label) => label.getAttribute('for') ?? '');
    const danglingReferences: string[] = [];
    for (const attribute of ['aria-controls', 'aria-describedby', 'aria-labelledby']) {
      for (const holder of element.querySelectorAll(`[${attribute}]`)) {
        for (const id of (holder.getAttribute(attribute) ?? '').split(/\s+/).filter(Boolean)) {
          if (!exists(id)) danglingReferences.push(`${attribute}=${id}`);
        }
      }
    }
    const seen = new Set<string>();
    const duplicateIds = new Set<string>();
    for (const node of element.ownerDocument.querySelectorAll('[id]')) {
      if (node.id === consentId) continue;
      if (seen.has(node.id)) duplicateIds.add(node.id);
      seen.add(node.id);
    }
    return { danglingLabels, danglingReferences, duplicateIds: [...duplicateIds], labelCount: labels.length };
  }, CONSENT_ID);
}

async function expectWired(form: Locator, state: string) {
  const wiring = await readWiring(form);
  expect(wiring.labelCount, `${state}: labels`).toBeGreaterThanOrEqual(3);
  expect(wiring.danglingLabels, `${state}: label for`).toEqual([]);
  expect(wiring.danglingReferences, `${state}: aria references`).toEqual([]);
  expect(wiring.duplicateIds, `${state}: repeated ids`).toEqual([]);
}

async function openForm(page: Page) {
  await page.goto('/#contato');
  const form = page.locator('form[name="contact"]');
  await expect(form).toHaveCount(1);
  await form.scrollIntoViewIfNeeded();
  return form;
}

/** The ids the invalid fields point at with aria-describedby, as the text of the error they name. */
async function describedErrors(form: Locator) {
  return form.locator('[aria-invalid="true"]').evaluateAll((fields) =>
    fields.map((field) => {
      const ids = (field.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      return ids.map((id) => document.getElementById(id)?.textContent?.trim() ?? null);
    }),
  );
}

test.describe('contact form ids', () => {
  test('the label of every field reaches its control in each state', async ({ page, network }) => {
    await page.route(N8N_WEBHOOK_PATTERN, n8nRoute(network, fulfillOk));
    const form = await openForm(page);

    await expectWired(form, 'empty');
    // A label click focuses its control: the browser itself follows `for`.
    await page.locator('form[name="contact"] label', { hasText: contactFormCopy.labels.nome }).first().click();
    await expect(form.getByLabel(contactFormCopy.labels.nome, { exact: true })).toBeFocused();

    // Errors: every invalid field is described by an element that exists and carries the message.
    await form.getByRole('checkbox').check();
    await form.getByRole('button', { name: contactFormCopy.submit, exact: true }).click();
    await expect(form.locator('[aria-invalid="true"]')).toHaveCount(4);
    await expectWired(form, 'errors');
    const described = await describedErrors(form);
    expect(described).toHaveLength(4);
    for (const messages of described) {
      expect(messages.length).toBeGreaterThan(0);
      for (const text of messages) expect(text, 'the error line the field points at').toBeTruthy();
    }

    // WhatsApp mode, with its hint and its error.
    await page.getByRole('button', { name: 'Por WhatsApp' }).click();
    const whatsapp = form.getByLabel(contactFormCopy.labels.whatsapp, { exact: true });
    await expect(whatsapp).toBeVisible();
    await form.getByRole('button', { name: contactFormCopy.submit, exact: true }).click();
    await expect(whatsapp).toHaveAttribute('aria-invalid', 'true');
    await expectWired(form, 'whatsapp with errors');
    await expect(whatsapp).toHaveAccessibleDescription(new RegExp(contactFormCopy.whatsappHint.slice(0, 20)));

    // Back to e-mail, valid, sent: the thanks replaces the form and still nothing dangles.
    await page.getByRole('button', { name: 'Por e-mail' }).click();
    await form.getByLabel(contactFormCopy.labels.nome, { exact: true }).fill('Ana Lima');
    await form.getByRole('button', { name: contactFormCopy.placeholders.servico }).click();
    await form.getByRole('option', { name: serviceOptions[0] }).click();
    await form.getByLabel(contactFormCopy.labels.mensagem, { exact: true }).fill('Teste dos ids do formulario');
    await form.getByLabel(contactFormCopy.labels.email, { exact: true }).fill('ana@example.com');
    await expectWired(form, 'valid');
    await form.getByRole('button', { name: contactFormCopy.submit, exact: true }).click();
    await expect(page.getByRole('heading', { level: 3, name: contactFormCopy.success.title })).toBeVisible();
    expect(network.calls).toHaveLength(1);

    await page.getByRole('button', { name: contactFormCopy.success.again }).click();
    const fresh = page.locator('form[name="contact"]');
    await expect(fresh.getByLabel(contactFormCopy.labels.nome, { exact: true })).toBeFocused();
    await expectWired(fresh, 'new form after a send');
  });

  test('the open service list keeps its aria-controls and label pointing at real elements', async ({ page }) => {
    const form = await openForm(page);
    await form.getByRole('button', { name: contactFormCopy.placeholders.servico }).click();
    await expect(form.getByRole('listbox')).toBeVisible();

    await expectWired(form, 'list open');
    const controlled = await form.getByRole('button', { name: /Serviço de interesse/ }).evaluate((button) => {
      const target = document.getElementById(button.getAttribute('aria-controls') ?? '');
      return target?.getAttribute('role') ?? null;
    });
    expect(controlled).toBe('listbox');
  });

  test('two forms on a page would share no id: each takes its own useId prefix (checked on the ids of the one form)', async ({ page }) => {
    const form = await openForm(page);
    const ids = await form.evaluate((element) => [...element.querySelectorAll('[id]')].map((node) => node.id));

    expect(ids.length).toBeGreaterThan(5);
    for (const id of ids) {
      expect(id, id).toMatch(/^[A-Za-z][\w-]*$/);
      // Not the fixed `contact-nome` of the old form: the prefix carries the useId of this form.
      expect(id).not.toBe('contact-nome');
    }
  });
});
