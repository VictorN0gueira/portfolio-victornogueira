import { useId } from 'react';
import { Link } from 'react-router-dom';
import Container from '../ui/Container';
import Logo from '../ui/Logo';
import NewTabHint from '../ui/NewTabHint';
import { FooterColumns } from './FooterColumns';
import SocialLinks from './SocialLinks';
import Wordmark from './Wordmark';

/**
 * Black footer with the sitemap, the contact data and a giant "vn one" wordmark. It reserves extra bottom padding
 * so the floating WhatsApp button never covers a link. A 1px rule closes its top edge: after the black final call to
 * action of the home the two read as one block, after a light section it is the edge of the footer. The top corners
 * are round and the footer reaches up by their radius, over the end of the section above it: the corners show that
 * section (black on the home) and never the page behind it, which is what showed as cream wedges.
 */
export function Footer() {
  const newTabHintId = useId();

  return (
    <footer
      id="rodape"
      className="relative -mt-[clamp(24px,4vw,40px)] rounded-t-[clamp(24px,4vw,40px)] border-t border-vn-gray-dark bg-vn-black text-vn-white"
    >
      <NewTabHint id={newTabHintId} />
      <Container className="pt-14 md:pt-20">
        <Link
          to="/"
          aria-label="VN One, página inicial"
          className="inline-flex min-h-11 items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-white"
        >
          <Logo variant="onDark" loading="lazy" className="h-10 w-auto" />
        </Link>

        <FooterColumns newTabHintId={newTabHintId} />
      </Container>

      <Wordmark />

      <Container className="pt-8 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-2 border-t border-vn-gray-dark pt-4 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
          <p className="font-mono text-xs text-vn-gray-mid">&copy; {new Date().getFullYear()} VN One</p>
          <SocialLinks hintId={newTabHintId} />
        </div>
      </Container>
    </footer>
  );
}

export default Footer;
