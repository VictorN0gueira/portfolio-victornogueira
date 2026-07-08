export const isTouchDevice =
  typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export const LOGO_URL =
  'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FLogo%20-%20s.%20fundo.png&version_id=null';

// Edge function que valida, aplica rate limiting, grava o lead e
// repassa aos webhooks internos de notificação (email + WhatsApp)
export const CONTACT_ENDPOINT =
  'https://keubauybppkesawajpyn.supabase.co/functions/v1/contact-proxy';

export const WHATSAPP_FALLBACK_URL =
  'https://wa.me/5581984451243?text=Ol%C3%A1%2C+Victor!+Tentei+usar+o+formul%C3%A1rio+do+site.';
