export const SITE = {
  name: 'VN One',
  url: 'https://vnone.com.br',
  title: 'VN One | Automação e IA para empresas',
  description:
    'A gente automatiza o trabalho repetitivo da sua empresa com IA e conecta as ferramentas que você já usa. Conversa de 30 minutos, sem compromisso.',
  ogImage: 'https://vnone.com.br/og-banner.png?v=3',
  ogImageAlt: 'VN One, automação e IA para empresas',
  telephone: '+55-81-98445-1243',
  email: 'contato@vnone.com.br',
} as const;

export function pageTitle(title?: string): string {
  return title ? `${title} | ${SITE.name}` : SITE.title;
}
