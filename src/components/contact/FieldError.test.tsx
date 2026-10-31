import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FieldError from './FieldError';

describe('FieldError', () => {
  it('renders nothing without a message', () => {
    const { container } = render(<FieldError id="e" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('is plain text with an icon: no alert role and no live region, so several errors never talk over each other', () => {
    const { container } = render(<FieldError id="e" message="Conta pra gente seu nome" />);
    const line = container.querySelector('#e') as HTMLElement;

    expect(line).toHaveTextContent('Conta pra gente seu nome');
    expect(line).not.toHaveAttribute('role');
    expect(line).not.toHaveAttribute('aria-live');
    expect(line.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('is an alert only when asked to be, for a line no field points at', () => {
    render(<FieldError id="n" message="Aguarde um pouco" announce />);

    expect(screen.getByRole('alert')).toHaveAttribute('id', 'n');
    expect(screen.getByRole('alert')).not.toHaveAttribute('aria-live');
  });
});
