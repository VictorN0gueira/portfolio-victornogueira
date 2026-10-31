import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STATUS_DEBOUNCE_MS, getRate, getSlider, getStatus, renderSimulator } from '../../test/roiSimulatorKit';
import { rateIssue } from './roiInput';
import { rateIssueNote, roiFeedbackCopy } from './roiFeedbackCopy';

describe('rateIssue', () => {
  it.each([
    ['-5', 'negative'],
    ['-0.01', 'negative'],
    ['1e999', 'unreadable'],
    ['-1e999', 'negative'],
    ['abc', 'unreadable'],
  ])('says %s is %s', (text, issue) => {
    expect(rateIssue(text)).toBe(issue);
  });

  it.each(['', '   ', '0', '50', '12.5', '99999999999'])('finds nothing wrong with "%s" (an empty field is R$ 0, a high one has its own note)', (text) => {
    expect(rateIssue(text)).toBeNull();
  });
});

describe('copy of the rate feedback', () => {
  it('has no dash, no slash separator and no invented number', () => {
    for (const text of Object.values(roiFeedbackCopy)) {
      expect(text).not.toMatch(/[\u2013\u2014]/);
      expect(text).not.toMatch(/\s\/\s/);
      expect(text.replace('R$ 0', '')).not.toMatch(/\d/);
    }
    expect(rateIssueNote('negative')).toBe(roiFeedbackCopy.negativeRate);
    expect(rateIssueNote('unreadable')).toBe(roiFeedbackCopy.unreadableRate);
  });
});

describe('RoiSimulator hourly rate feedback (X:M-18)', () => {
  it('has no note and is valid at the start', () => {
    renderSimulator();

    expect(getRate()).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByText(roiFeedbackCopy.negativeRate)).not.toBeInTheDocument();
  });

  it('says why a negative rate counts as R$ 0, and marks the field invalid and described by the note', () => {
    renderSimulator();

    fireEvent.change(getRate(), { target: { value: '-5' } });

    const note = screen.getByText(roiFeedbackCopy.negativeRate);
    expect(getRate()).toHaveAttribute('aria-invalid', 'true');
    expect(getRate()).toHaveAccessibleDescription(roiFeedbackCopy.negativeRate);
    expect(getRate().getAttribute('aria-describedby')).toContain(note.id);
    expect(getRate()).toHaveValue(-5);
  });

  it('takes the note and the invalid mark away once the rate is fixed', () => {
    renderSimulator();
    fireEvent.change(getRate(), { target: { value: '-5' } });

    fireEvent.change(getRate(), { target: { value: '80' } });

    expect(screen.queryByText(roiFeedbackCopy.negativeRate)).not.toBeInTheDocument();
    expect(getRate()).not.toHaveAttribute('aria-invalid');
    expect(getRate()).not.toHaveAttribute('aria-describedby');
  });

  it('keeps the note about the ceiling as it was, next to the new one', () => {
    renderSimulator();

    fireEvent.change(getRate(), { target: { value: '99999999999' } });

    expect(getRate()).not.toHaveAttribute('aria-invalid');
    expect(getRate()).toHaveAccessibleDescription(/no máximo/);
  });
});

describe('RoiSimulator announces the rate note (R10)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

  it('says the negative rate note in the one status region, once the typing stops, and drops it when fixed', () => {
    renderSimulator();
    expect(getStatus().textContent).not.toContain(roiFeedbackCopy.negativeRate);

    fireEvent.change(getRate(), { target: { value: '-5' } });
    advance(STATUS_DEBOUNCE_MS);
    expect(getStatus().textContent).toContain(roiFeedbackCopy.negativeRate);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(getStatus().textContent?.split(roiFeedbackCopy.negativeRate)).toHaveLength(2);

    fireEvent.change(getRate(), { target: { value: '80' } });
    advance(STATUS_DEBOUNCE_MS);
    expect(getStatus().textContent).not.toContain(roiFeedbackCopy.negativeRate);
  });

  it('keeps the field note as the description and does not add a second live region for it', () => {
    renderSimulator();

    fireEvent.change(getRate(), { target: { value: '-5' } });

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(getRate()).toHaveAccessibleDescription(roiFeedbackCopy.negativeRate);
  });
});

describe('RoiSimulator in StrictMode (R:M28)', () => {
  it('renders, changes the hours and keeps one slider', () => {
    renderSimulator({ strict: true });

    fireEvent.change(getSlider(), { target: { value: '20' } });

    expect(screen.getAllByRole('slider')).toHaveLength(1);
    expect(getSlider()).toHaveValue('20');
  });

  it('shows the rate feedback once, not twice, after the effects ran twice', () => {
    renderSimulator({ strict: true });

    fireEvent.change(getRate(), { target: { value: '-5' } });

    expect(screen.getAllByText(roiFeedbackCopy.negativeRate)).toHaveLength(1);
  });
});
