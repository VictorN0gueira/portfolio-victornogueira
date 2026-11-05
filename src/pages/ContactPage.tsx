import { useCallback, useEffect, useRef, useState } from 'react';
import { SEO } from '../components/SEO';
import { contactCopy } from '../data/contactCopy';
import { shellCopy } from '../data/shellCopy';
import { useScrollToHash } from '../hooks/useScrollToHash';
import { scrollToIdWhenMounted } from '../lib/scrollToIdWhenMounted';
import { ContactChannels } from '../sections/contact/ContactChannels';
import { ContactFormSection } from '../sections/contact/ContactFormSection';
import { FaqSection } from '../sections/home/FaqSection';
import { RoiSimulator } from '../sections/home/RoiSimulator';
import { PageHero } from '../sections/shared/PageHero';

/** The id of the form section, the one the quote of the simulator scrolls to. */
const CONTACT_ID = 'contato';

interface PrefillRequest {
  message: string;
  /** Counts the requests: a second click with the same figures still restores the quote in an edited message. */
  nonce: number;
}

/** The field the quote goes to: the one textarea of the form section, once it holds the message. */
function findFilledMessageField(message: string): (section: HTMLElement) => HTMLElement | null {
  return (section) => {
    const field = section.querySelector('textarea');
    return field && field.value === message ? field : null;
  };
}

/**
 * /contato: the hero with the channels, the simulator, the one contact form and the questions. The head of the page
 * (title, description, canonical and the FAQPage of the questions below) comes from the route metadata. The quote the
 * simulator builds goes to the form (one state holds the message and its counter), the page scrolls there, puts focus
 * in the message once it holds the quote and says so in a polite status, like the home does.
 */
export default function ContactPage() {
  useScrollToHash();
  const [prefill, setPrefill] = useState<PrefillRequest | undefined>();
  const [status, setStatus] = useState('');

  // The scroll may still be waiting when the page goes or a new request starts, so it is cancelled in both cases.
  const cancelScroll = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => cancelScroll.current?.(), []);

  const handleQuoteRequest = useCallback((message: string) => {
    setPrefill((previous) => ({ message, nonce: (previous?.nonce ?? 0) + 1 }));
    setStatus('');
    cancelScroll.current?.();
    cancelScroll.current = scrollToIdWhenMounted(CONTACT_ID, {
      focus: findFilledMessageField(message),
      onFocused: () => setStatus(shellCopy.quoteFilled),
    });
  }, []);

  // What the status said is about the field as the quote filled it: once the visitor edits the message it no longer is.
  const handleMessageEdit = useCallback(() => setStatus(''), []);

  return (
    <>
      <SEO path="/contato" />
      <PageHero
        kicker={contactCopy.kicker}
        title={contactCopy.title}
        lead={contactCopy.lead}
        aside={<ContactChannels />}
      />
      <RoiSimulator onQuoteRequest={handleQuoteRequest} />
      <ContactFormSection prefillMessage={prefill?.message} prefillNonce={prefill?.nonce} onMessageEdit={handleMessageEdit} />
      <FaqSection />

      {/* Always in the page, empty until the quote is in the form: a live region speaks what is put into it. */}
      <div role="status" className="sr-only">
        {status}
      </div>
    </>
  );
}
