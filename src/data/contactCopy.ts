// The words of /contato that the page itself writes. The title, the lead and the labels are the ones the old contact
// block already had; the kicker is a DRAFT the owner reviews. The form heading and kicker are the final call to action
// of the home (homeCopy.finalCta), and the phone number and the e-mail come from lib/constants.
export const contactCopy = {
  kicker: 'contato',
  title: 'Conta o que você precisa',
  lead: 'A gente conversa sobre o seu projeto e mostra por onde começar.',
  channels: {
    email: 'E-mail',
    whatsapp: 'WhatsApp',
    location: 'Localização',
    locationValue: 'Recife e remoto',
  },
} as const;
