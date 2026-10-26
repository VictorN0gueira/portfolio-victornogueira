export const isTouchDevice =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export const WHATSAPP_NUMBER = '5581984451243';
export const WHATSAPP_DISPLAY = '(81) 98445-1243';
export const CONTACT_EMAIL = 'contato@vnone.com.br';

export function whatsappUrl(text: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

export const WHATSAPP_FALLBACK_URL = whatsappUrl('Olá! Tentei usar o formulário do site da VN One.');

export interface SocialLink {
  label: 'LinkedIn' | 'GitHub' | 'Instagram';
  href: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/victornogueira-vn' },
  { label: 'GitHub', href: 'https://github.com/VictorN0gueira' },
  { label: 'Instagram', href: 'https://www.instagram.com/victornogueira._/' },
];
