import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = new Set([
  'https://vnone.com.br',
  'https://www.vnone.com.br',
  'http://localhost:3000',
]);

const RATE_MINUTE_MAX = 2;
const RATE_HOUR_MAX = 5;
const N8N_TIMEOUT_MS = 8000;

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin':
      origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://vnone.com.br',
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json({ success: false, error: 'method_not_allowed' }, 405, cors);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: 'invalid_json' }, 400, cors);
  }

  // Honeypot: humanos nunca veem o campo "website" — bots preenchem.
  // Sucesso falso, sem insert, para não dar sinal ao bot.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json({ success: true }, 200, cors);
  }

  const nome = typeof body.nome === 'string' ? body.nome.trim() : '';
  const metodo = body.metodo;
  const mensagem = typeof body.mensagem === 'string' ? body.mensagem.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const whatsapp = typeof body.whatsapp === 'string' ? body.whatsapp.trim() : '';
  const consent = body.consent === true;
  const valorEstimado =
    typeof body.valor_estimado === 'number' && Number.isFinite(body.valor_estimado)
      ? Math.min(Math.max(Math.round(body.valor_estimado), 0), 10_000_000)
      : null;

  const fields: Record<string, string> = {};
  if (nome.length < 2 || nome.length > 120) fields.nome = 'invalid';
  if (mensagem.length < 5 || mensagem.length > 3000) fields.mensagem = 'invalid';
  if (metodo !== 'email' && metodo !== 'whatsapp') fields.metodo = 'invalid';
  if (metodo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = 'invalid';
  if (metodo === 'whatsapp' && !/^55\d{10,11}$/.test(whatsapp)) fields.whatsapp = 'invalid';
  if (Object.keys(fields).length > 0) {
    return json({ success: false, error: 'validation', fields }, 400, cors);
  }

  // LGPD: guarda só o hash do IP, nunca o IP bruto
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const ipHash = await sha256Hex(ip + (Deno.env.get('IP_HASH_SALT') ?? ''));

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Rate limit usando a própria tabela lead (contagens indexadas por ip_hash)
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const [minute, hour] = await Promise.all([
    db.from('lead').select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash).gte('created_at', oneMinuteAgo),
    db.from('lead').select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash).gte('created_at', oneHourAgo),
  ]);
  if ((minute.count ?? 0) >= RATE_MINUTE_MAX || (hour.count ?? 0) >= RATE_HOUR_MAX) {
    return json({ success: false, error: 'rate_limited' }, 429, cors);
  }

  const contato = metodo === 'email' ? email : whatsapp;
  const { data: lead, error: insertError } = await db
    .from('lead')
    .insert({
      nome,
      email: metodo === 'email' ? email : null,
      contato,
      mensagem,
      canal_origem: 'Site',
      status: 'novo',
      consent,
      ip_hash: ipHash,
      user_agent: req.headers.get('user-agent'),
      valor_estimado: valorEstimado,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('lead insert failed:', insertError.message);
    return json({ success: false, error: 'internal' }, 500, cors);
  }

  // Encaminha ao n8n com EXATAMENTE o payload que o site enviava direto —
  // é ele que dispara as notificações de email e WhatsApp. Não alterar o shape.
  const webhook =
    metodo === 'email'
      ? Deno.env.get('N8N_WEBHOOK_EMAIL')
      : Deno.env.get('N8N_WEBHOOK_WHATSAPP');
  const legacyPayload = {
    nome,
    [metodo]: contato,
    mensagem,
    timestamp: new Date().toISOString(),
  };

  try {
    if (!webhook) throw new Error('webhook secret not configured');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), N8N_TIMEOUT_MS);
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(legacyPayload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`n8n responded ${res.status}`);
    await db.from('lead').update({ forwarded: true }).eq('id', lead.id);
  } catch (err) {
    // O lead já está salvo — registra a falha de encaminhamento sem falhar a request
    console.error('n8n forward failed:', String(err));
    await db.from('lead').update({ forward_error: String(err).slice(0, 500) }).eq('id', lead.id);
  }

  return json({ success: true }, 200, cors);
});
