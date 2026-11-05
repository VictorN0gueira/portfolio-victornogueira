import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { stubMatchMedia } from '../../test/matchMedia';
import { ContactFormSection } from './ContactFormSection';

interface FormProps {
  initialMessage?: string;
  prefillNonce?: number;
}

const received = vi.hoisted(() => ({ calls: [] as FormProps[] }));
vi.mock('../../components/ContactForm', () => ({
  ContactForm: (props: FormProps) => {
    received.calls.push(props);
    return <form name="contact" />;
  },
}));

describe('ContactFormSection hands the quote to the form', () => {
  it('passes the prefill message and its counter to ContactForm as they are', () => {
    stubMatchMedia();

    renderWithProviders(<ContactFormSection prefillMessage="Quero automatizar" prefillNonce={3} />);

    expect(received.calls.at(-1)).toEqual({ initialMessage: 'Quero automatizar', prefillNonce: 3 });
  });

  it('passes nothing when there is no quote', () => {
    stubMatchMedia();

    renderWithProviders(<ContactFormSection />);

    expect(received.calls.at(-1)).toEqual({ initialMessage: undefined, prefillNonce: undefined });
  });
});
