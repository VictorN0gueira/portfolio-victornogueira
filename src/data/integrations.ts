import type { BrandIconId } from './brandIcons';

export type Integration = { id: BrandIconId; label: string };

export const integrations: Integration[] = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'n8n', label: 'n8n' },
  { id: 'supabase', label: 'Supabase' },
  { id: 'claude', label: 'Claude' },
  { id: 'googlesheets', label: 'Google Sheets' },
  { id: 'googledrive', label: 'Google Drive' },
  { id: 'gmail', label: 'Gmail' },
  { id: 'googlecalendar', label: 'Google Agenda' },
  { id: 'notion', label: 'Notion' },
  { id: 'hubspot', label: 'HubSpot' },
  { id: 'shopify', label: 'Shopify' },
  { id: 'trello', label: 'Trello' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'googlegemini', label: 'Gemini' },
];
