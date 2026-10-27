import { motion, useInView } from 'motion/react';
import { Github, Instagram, Linkedin, type LucideIcon } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { MAIN_NAV } from '../../data/navigation';
import { services } from '../../data/services';
import { useMotionAllowed } from '../../hooks/useMotionAllowed';
import {
  CONTACT_EMAIL,
  SOCIAL_LINKS,
  WHATSAPP_DISPLAY,
  WHATSAPP_GREETING,
  whatsappUrl,
  type SocialLink,
} from '../../lib/constants';
import Container from '../ui/Container';
import Logo from '../ui/Logo';

const SOCIAL_ICONS: Record<SocialLink['label'], LucideIcon> = {
  LinkedIn: Linkedin,
  GitHub: Github,
  Instagram,
};

// One link per category of service, in the order the services list them.
const SERVICE_CATEGORIES = Array.from(new Set(services.map((service) => service.categoria)));

const WORDMARK_HIDDEN = 'inset(100% 0% 0% 0%)';
const WORDMARK_SHOWN = 'inset(0% 0% 0% 0%)';
const WORDMARK_REVEAL = { duration: 0.9, ease: [0.22, 1, 0.36, 1] } as const;
const WORDMARK_INSTANT = { duration: 0 } as const;
const WORDMARK_IN_VIEW = { once: true, amount: 0.4 } as const;

// The text is about 2.99em wide, so 33cqw always fits the box. The clamp is the design size (22vw, 72px to 320px);
// the cap only bites when the root font is enlarged (a11y-font-large) or the gutters do not scale with the screen.
const WORDMARK_FONT_SIZE = 'min(clamp(4.5rem, 22vw, 20rem), 33cqw)';

const COLUMN_TITLE = 'font-mono text-xs lowercase tracking-[0.18em] text-vn-gray-mid';
const LINK =
  'inline-flex min-h-11 items-center text-sm text-vn-gray-light hover:text-vn-white [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-white';

/**
 * Black footer with the sitemap, the contact data and a giant "vn one" wordmark that unveils once when it
 * scrolls into view. It reserves extra bottom padding so the floating WhatsApp button never covers a link.
 */
export function Footer() {
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(wordmarkRef, WORDMARK_IN_VIEW);
  const isMotionAllowed = useMotionAllowed();
  const isWordmarkShown = isInView || !isMotionAllowed;

  return (
    <footer id="rodape" className="rounded-t-[clamp(24px,4vw,40px)] bg-vn-black text-vn-white">
      <Container className="pt-14 md:pt-20">
        <Link
          to="/"
          aria-label="VN One, página inicial"
          className="inline-flex min-h-11 items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-white"
        >
          <Logo variant="onDark" loading="lazy" className="h-10 w-auto" />
        </Link>

        <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 min-[360px]:grid-cols-2 lg:grid-cols-4 lg:gap-x-8">
          <nav aria-label="Rodapé">
            <h2 className={COLUMN_TITLE}>Navegação</h2>
            <ul className="mt-3">
              {MAIN_NAV.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className={LINK}>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/contato" className={LINK}>
                  Contato
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className={COLUMN_TITLE}>Serviços</h2>
            <ul className="mt-3">
              {SERVICE_CATEGORIES.map((category) => (
                <li key={category}>
                  <Link to="/servicos" className={LINK}>
                    {category}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className={COLUMN_TITLE}>Contato</h2>
            <ul className="mt-3">
              <li>
                <a
                  href={whatsappUrl(WHATSAPP_GREETING)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK}
                >
                  {WHATSAPP_DISPLAY}
                </a>
              </li>
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li className="inline-flex min-h-11 items-center text-sm text-vn-gray-mid">Recife e remoto</li>
            </ul>
          </div>

          <nav aria-label="Legal">
            <h2 className={COLUMN_TITLE}>Legal</h2>
            <ul className="mt-3">
              <li>
                <Link to="/privacidade" className={LINK}>
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/lgpd" className={LINK}>
                  LGPD
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </Container>

      {/*
        The observer sits on the wrapper: the wordmark itself starts fully clipped. The wrapper is also an
        inline-size container, so the wordmark can cap its size by the width it really has (33cqw).
      */}
      <Container className="mt-12 md:mt-16">
        <div ref={wordmarkRef} className="[container-type:inline-size]">
          <motion.p
            data-footer-wordmark=""
            aria-hidden="true"
            className="vn-chrome-text overflow-clip whitespace-nowrap pb-[0.04em] text-center font-display font-bold leading-[0.85] tracking-[-0.04em]"
            style={{ fontSize: WORDMARK_FONT_SIZE }}
            initial={isMotionAllowed ? { clipPath: WORDMARK_HIDDEN } : false}
            animate={{ clipPath: isWordmarkShown ? WORDMARK_SHOWN : WORDMARK_HIDDEN }}
            transition={isMotionAllowed ? WORDMARK_REVEAL : WORDMARK_INSTANT}
          >
            vn one
          </motion.p>
          <span className="sr-only">VN One</span>
        </div>
      </Container>

      <Container className="pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-2 border-t border-vn-gray-dark pt-4 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
          <p className="font-mono text-xs text-vn-gray-mid">&copy; {new Date().getFullYear()} VN One</p>
          <ul className="-mx-2.5 flex items-center">
            {SOCIAL_LINKS.map(({ label, href }) => {
              const Icon = SOCIAL_ICONS[label];

              return (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid size-11 place-items-center rounded-full text-vn-gray-light hover:bg-vn-ink hover:text-vn-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-white"
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </Container>
    </footer>
  );
}

export default Footer;
