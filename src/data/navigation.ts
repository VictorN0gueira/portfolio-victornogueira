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

export const PRIMARY_CTA: NavItem = { label: 'Vamos conversar', to: '/contato' };
