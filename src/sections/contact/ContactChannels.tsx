import { useId } from 'react';
import { BrandIcon } from '../../components/ui/BrandIcon';
import { NewTabHint } from '../../components/ui/NewTabHint';
import { contactCopy } from '../../data/contactCopy';
import { CONTACT_EMAIL, WHATSAPP_DISPLAY, WHATSAPP_GREETING, whatsappUrl } from '../../lib/constants';

const ROW_CLASSES = 'grid gap-1 border-t border-vn-gray-light py-4 first:border-t-0 first:pt-0 last:pb-0';
const LABEL_CLASSES = 'font-mono text-xs uppercase tracking-[.18em] text-vn-gray-dark';
// min-h-11 is the 44px touch target. break-words keeps the address inside the card at 280px and at the larger font.
const VALUE_CLASSES = 'break-words text-xl font-medium text-vn-ink md:text-2xl';
const LINK_CLASSES = `${VALUE_CLASSES} inline-flex min-h-11 items-center gap-3 rounded-md underline-offset-4 hover:underline vn-focus-ring-ink`;

/**
 * The three ways to reach VN One, as a description list on a white card: the e-mail, the WhatsApp and the place. The
 * address and the number come from lib/constants, never from this file. Meant for the aside of the PageHero (a light
 * surface), so the icon is ink and the focus ring is the ink one.
 */
export function ContactChannels() {
  const newTabHintId = useId();
  const { email, whatsapp, location, locationValue } = contactCopy.channels;

  return (
    <div className="rounded-card border border-vn-gray-light bg-vn-white p-6 md:p-8">
      <NewTabHint id={newTabHintId} />
      <dl className="m-0">
        <div className={ROW_CLASSES}>
          <dt className={LABEL_CLASSES}>{email}</dt>
          <dd className="m-0">
            <a href={`mailto:${CONTACT_EMAIL}`} className={LINK_CLASSES}>
              {CONTACT_EMAIL}
            </a>
          </dd>
        </div>
        <div className={ROW_CLASSES}>
          <dt className={LABEL_CLASSES}>{whatsapp}</dt>
          <dd className="m-0">
            <a
              href={whatsappUrl(WHATSAPP_GREETING)}
              target="_blank"
              rel="noopener noreferrer"
              aria-describedby={newTabHintId}
              className={LINK_CLASSES}
            >
              {WHATSAPP_DISPLAY}
              <BrandIcon id="whatsapp" className="size-6 shrink-0" />
            </a>
          </dd>
        </div>
        <div className={ROW_CLASSES}>
          <dt className={LABEL_CLASSES}>{location}</dt>
          <dd className={`${VALUE_CLASSES} m-0 min-h-11 content-center`}>{locationValue}</dd>
        </div>
      </dl>
    </div>
  );
}
