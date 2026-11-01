import { Link } from 'react-router-dom';
import { LINK_CLASS } from './contactStyles';

interface ContactConsentProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Id of the hidden line that says the privacy link opens in a new tab (the link points at it with aria-describedby). */
const NEW_TAB_HINT_ID = 'contact-privacy-new-tab';

/**
 * Consentimento LGPD: obrigatório para enviar. O texto abaixo é texto legal e não pode mudar, nem no que se seleciona e
 * copia; a linha inteira é o alvo de toque (44px) e a caixa é desenhada em branco. A política abre em outra aba, para o
 * que o visitante digitou não se perder; isso é dito a quem usa leitor de tela por uma descrição fora da frase (o nome
 * do link continua sendo o texto visível), e a frase em si não ganha nenhum caractere.
 */
export function ContactConsent({ checked, onChange }: ContactConsentProps) {
  return (
    <>
      <label className="group flex min-h-11 cursor-pointer items-start gap-3 py-1.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required
          aria-required="true"
          className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-vn-gray-mid bg-vn-white/5 accent-white scheme-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vn-white"
        />
        <span className="text-sm leading-relaxed text-vn-gray-light group-hover:text-vn-white">
          Li e concordo com a{' '}
          <Link
            to="/privacidade"
            target="_blank"
            rel="noopener noreferrer"
            aria-describedby={NEW_TAB_HINT_ID}
            className={LINK_CLASS}
          >
            Política de Privacidade
          </Link>{' '}
          e autorizo o uso dos meus dados para retorno do contato.
        </span>
      </label>
      <span id={NEW_TAB_HINT_ID} className="sr-only">
        Abre em nova aba
      </span>
    </>
  );
}

export default ContactConsent;
