interface NavItem {
  label: string;
  to: string;
}

export const MAIN_NAV: NavItem[] = [
  { label: 'Serviços', to: '/servicos' },
  { label: 'Como funciona', to: '/#metodo' },
  { label: 'Clientes', to: '/#clientes' },
  { label: 'Projetos', to: '/projetos' },
  { label: 'Sobre', to: '/sobre' },
  { label: 'Blog', to: '/blog' },
];

/** The accessible name of the phone and tablet menu button (Header.tsx); the e2e helper menuButton() reads it too. */
export const MENU_BUTTON_NAME = 'Menu';

export const PRIMARY_CTA: NavItem = { label: 'Vamos conversar', to: '/contato' };
