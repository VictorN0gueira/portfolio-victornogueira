import { Link } from 'react-router-dom';
import { MAIN_NAV } from '../../data/navigation';
import { CONTACT_EMAIL, WHATSAPP_DISPLAY, WHATSAPP_GREETING, whatsappUrl } from '../../lib/constants';
import { FOOTER_LINK, FooterColumn } from './FooterColumn';
import { FOOTER_SERVICE_LINKS } from './footerServices';

function NavigationColumn() {
  return (
    <FooterColumn title="Navegação" navLabel="Rodapé">
      {MAIN_NAV.map((item) => (
        <li key={item.to}>
          <Link to={item.to} className={FOOTER_LINK}>
            {item.label}
          </Link>
        </li>
      ))}
      <li>
        <Link to="/contato" className={FOOTER_LINK}>
          Contato
        </Link>
      </li>
    </FooterColumn>
  );
}

function ServicesColumn() {
  return (
    <FooterColumn title="Serviços">
      {FOOTER_SERVICE_LINKS.map((link) => (
        <li key={link.slug}>
          <Link to={link.to} className={FOOTER_LINK}>
            {link.label}
          </Link>
        </li>
      ))}
    </FooterColumn>
  );
}

function ContactColumn({ newTabHintId }: { newTabHintId: string }) {
  return (
    // Two columns from 360px leave this one about 160px, which breaks the e-mail address in the middle until 420px.
    <FooterColumn title="Contato" className="xs:max-[419px]:col-span-2">
      <li>
        <a
          href={whatsappUrl(WHATSAPP_GREETING)}
          target="_blank"
          rel="noopener noreferrer"
          aria-describedby={newTabHintId}
          className={FOOTER_LINK}
        >
          {WHATSAPP_DISPLAY}
        </a>
      </li>
      <li>
        <a href={`mailto:${CONTACT_EMAIL}`} className={FOOTER_LINK}>
          {CONTACT_EMAIL}
        </a>
      </li>
      <li className="inline-flex min-h-11 items-center text-sm text-vn-gray-mid">Recife e remoto</li>
    </FooterColumn>
  );
}

function LegalColumn() {
  return (
    <FooterColumn title="Legal" navLabel="Legal">
      <li>
        <Link to="/privacidade" className={FOOTER_LINK}>
          Política de Privacidade
        </Link>
      </li>
      <li>
        <Link to="/lgpd" className={FOOTER_LINK}>
          LGPD
        </Link>
      </li>
    </FooterColumn>
  );
}

/** The four columns of the footer: navigation, services, contact and legal. */
export function FooterColumns({ newTabHintId }: { newTabHintId: string }) {
  return (
    <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 xs:grid-cols-2 lg:grid-cols-4 lg:gap-x-8">
      <NavigationColumn />
      <ServicesColumn />
      <ContactColumn newTabHintId={newTabHintId} />
      <LegalColumn />
    </div>
  );
}
