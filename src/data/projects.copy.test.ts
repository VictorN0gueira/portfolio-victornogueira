// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DASH_RULE, FIRST_PERSON_RULE, NUMBER_RULE, SALES_RULE, SLASH_RULE, offenders, visibleCopy, withoutAllowedNumbers } from '../test/projectCopy';

describe('projects copy', () => {
  it('covers the data of every project and the sentences written in the components and pages', () => {
    const wheres = new Set(visibleCopy().map(({ where }) => where));

    expect(wheres.has('page')).toBe(true);
    expect(wheres.size).toBe(8);
    expect(visibleCopy().length).toBeGreaterThan(80);
  });

  it('uses no em dash, no en dash, no look-alike and no spaced hyphen anywhere', () => {
    expect(offenders(DASH_RULE)).toEqual([]);
  });

  it('uses no " / " as a separator', () => {
    expect(offenders(SLASH_RULE)).toEqual([]);
  });

  it('keeps sales wording and claims of results out of the copy', () => {
    expect(offenders(SALES_RULE)).toEqual([]);
  });

  it('speaks as "a gente", never in the first person singular', () => {
    expect(offenders(FIRST_PERSON_RULE)).toEqual([]);
  });

  it('carries no number except the name Hub081 and what a screen prints', () => {
    expect(offenders(NUMBER_RULE, withoutAllowedNumbers)).toEqual([]);
  });

  it.each([
    ['a figure dash', 'Resultado \u2012 melhor'],
    ['an em dash', 'A \u2014 B'],
    ['a minus sign', 'A \u2212 B'],
    ['a spaced hyphen', 'A - B'],
    ['a double hyphen', 'A--B'],
    ['a slash separator', 'Pedido / Delivery'],
    ['a result in percent', '100% tempo real'],
    ['a first person', 'Meu sistema'],
    ['a sales phrase', 'automação de ponta'],
  ])('the rules would catch %s', (_label, text) => {
    const caught = [DASH_RULE, SLASH_RULE, SALES_RULE, FIRST_PERSON_RULE].some((rule) => rule.test(text));

    expect(caught).toBe(true);
  });
});
