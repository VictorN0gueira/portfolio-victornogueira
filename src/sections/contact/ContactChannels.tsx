import { useId } from 'react';
import { BrandIcon } from '../../components/ui/BrandIcon';
import { NewTabHint } from '../../components/ui/NewTabHint';
import { contactCopy } from '../../data/contactCopy';
import { CONTACT_EMAIL, WHATSAPP_DISPLAY, WHATSAPP_GREETING, whatsappUrl } from '../../lib/constants';

const ROW_CLASSES =
  'grid grid-cols-[minmax(0,1fr)] gap-1 border-t border-vn-gray-light py-4 first:border-t-0 first:pt-0 last:pb-0';
const LABEL_CLASSES = 'font-mono text-xs uppercase tracking-[.18em] text-vn-gray-dark';
// The 44px touch target is min-h-11 on the link (LINK_CLASSES) and on the place (its dd). overflow-wrap anywhere is only the
// last resort, for a box narrower than a half of the address: the break the page wants is the wbr after the @.
const VALUE_CLASSES = '[overflow-wrap:anywhere] text-lg font-medium text-vn-ink sm:text-xl md:text-2xl';
const LINK_CLASSES = `${VALUE_CLASSES} inline-flex min-h-11 items-center gap-3 rounded-md underline-offset-4 hover:underline vn-focus-ring-ink`;

/**
 * The three ways to reach VN One, as a description list on a white card. The address and the number come from
 * lib/constants, never from this file. Meant for the aside of the PageHero (a light surface), so the icon is ink and the
 * focus ring is the ink one.
 *
 * The place comes first, before the two links, as a workaround and not as a design choice. Stacked under the lead of a
 * phone, the first link sits in the band that the accessibility tab claims when the visitor parks it at the middle of
 * the left edge, and a link at the very top of the page cannot be scrolled out of that band. The real fix belongs to the
 * accessibility widget (focus not obscured at scrollY 0, WCAG 2.4.11), tracked as its own task: when it lands, the
 * e-mail can go back to the first row (e2e/a11y-widget-focus.spec.ts is the test that tells).
 *
 * Each link is named by its visible text followed by the channel, so the accessible name contains what is drawn (WCAG
 * 2.5.3) and a screen reader still says which channel it is. The text of each link is one span (the link is inline-flex, so
 * every loose text and every wbr would be a flex item of its own, with the gap between them): the address breaks only
 * after the @, and the number only after the area code, because its digits are one nowrap word. The address may break only after the @ (the wbr), so it
 * never splits in the middle of a word; overflow-wrap anywhere stays as the last resort for a box narrower than a half.
 */
export function ContactChannels() {
  const newTabHintId = useId();
  const { email, whatsapp, location, locationValue } = contactCopy.channels;
  const [emailName, emailDomain] = CONTACT_EMAIL.split('@');
  const [areaCode, digits] = WHATSAPP_DISPLAY.split(' ');

  return (
    <div className="rounded-card border border-vn-gray-light bg-vn-white p-5 sm:p-6 md:p-8">
      <NewTabHint id={newTabHintId} />
      <dl className="m-0">
        <div className={ROW_CLASSES}>
          <dt className={LABEL_CLASSES}>{location}</dt>
          <dd className={`${VALUE_CLASSES} m-0 flex min-h-11 items-center`}>{locationValue}</dd>
        </div>
        <div className={ROW_CLASSES}>
          <dt className={LABEL_CLASSES}>{email}</dt>
          <dd className="m-0">
            <a href={`mailto:${CONTACT_EMAIL}`} aria-label={`${CONTACT_EMAIL}, ${email}`} className={LINK_CLASSES}>
              <span>
                {`${emailName}@`}
                <wbr />
                {emailDomain}
              </span>
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
              aria-label={`${WHATSAPP_DISPLAY}, ${whatsapp}`}
              aria-describedby={newTabHintId}
              className={LINK_CLASSES}
            >
              <span>
                {`${areaCode} `}
                <span className="whitespace-nowrap">{digits}</span>
              </span>
              <BrandIcon id="whatsapp" className="size-6 shrink-0" />
            </a>
          </dd>
        </div>
      </dl>
    </div>
  );
}
