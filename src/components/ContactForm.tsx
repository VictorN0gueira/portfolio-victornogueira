import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, CheckCircle2, Mail, MessageSquare, AlertCircle } from 'lucide-react';

const WEBHOOKS = {
  email: 'https://n8n.vnone.com.br/webhook/portfolio-vn-email',
  whatsapp: 'https://n8n.vnone.com.br/webhook/portfolio-vn-whatsapp'
};

type ContactMethod = 'email' | 'whatsapp';

/**
 * Formata para exibição: +55 DD 9 NNNN-NNNN
 * O +55 e o 9 são inseridos automaticamente. Usuário digita apenas DDD + 8 dígitos.
 */
function formatWhatsappDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '');

  // Remove o 55 inicial se o usuário digitou
  let local = digits.startsWith('55') ? digits.substring(2) : digits;

  // Remove o 9 se o usuário digitou após o DDD (será adicionado automaticamente)
  if (local.length > 2 && local[2] === '9') {
    local = local.substring(0, 2) + local.substring(3);
  }

  // Limita a 10 dígitos (DDD 2 + número 8)
  local = local.slice(0, 10);

  if (local.length === 0) return '+55 ';
  if (local.length <= 2) return `+55 ${local}`;
  if (local.length <= 6) return `+55 ${local.slice(0, 2)} 9 ${local.slice(2)}`;
  return `+55 ${local.slice(0, 2)} 9 ${local.slice(2, 6)}-${local.slice(6, 10)}`;
}

/**
 * Converte para o formato padrão da Evolution API / N8N: 558195493732
 * Remove o 9 extra (11 dígitos locais → 10) para compatibilidade.
 */
function toEvolutionFormat(raw: string): string {
  let num = raw.replace(/\D/g, '');

  if (num.startsWith('55') && num.length >= 12) {
    num = num.substring(2);
  }

  // Se tem 11 dígitos (com o 9), remove o 9 (índice 2)
  if (num.length === 11) {
    num = num.substring(0, 2) + num.substring(3);
  }

  return '55' + num;
}

export default function ContactForm() {
  const [method, setMethod] = useState<ContactMethod>('email');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    whatsapp: '+55 ',
    mensagem: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    if (method === 'whatsapp') {
      const digits = formData.whatsapp.replace(/\D/g, '');
      const local = digits.startsWith('55') ? digits.substring(2) : digits;
      if (local.length < 10 || local.length > 11) {
        newErrors.whatsapp = 'Por favor, insira um número válido com DDD (ex: 81 99999-9999)';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setStatus('sending');

    const webhookUrl = method === 'email' ? WEBHOOKS.email : WEBHOOKS.whatsapp;

    const payload = {
      nome: formData.nome,
      [method]: method === 'whatsapp' ? toEvolutionFormat(formData.whatsapp) : formData.email,
      mensagem: formData.mensagem,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatus('success');
      } else {
        throw new Error('Failed to send');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/5 border border-white/10 p-12 rounded-[2.5rem] text-center"
      >
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10 text-black" />
        </div>
        <h4 className="text-xl md:text-2xl font-bold mb-4">Mensagem Enviada!</h4>
        <p className="text-zinc-400 mb-8 max-w-xs mx-auto text-sm md:text-base">
          Obrigado pelo contato via {method === 'email' ? 'Email' : 'WhatsApp'}. Em breve entrarei em contato com você.
        </p>
        <button
          onClick={() => {
            setStatus('idle');
            setFormData({ nome: '', email: '', whatsapp: '+55 ', mensagem: '' });
            setErrors({});
          }}
          className="px-8 py-3 bg-white text-black rounded-full text-xs md:text-sm font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl active:scale-95"
        >
          Enviar Outra
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Method Toggle */}
      <fieldset>
        <legend className="sr-only">Escolha o método de contato preferido</legend>
        <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl w-fit" role="group" aria-label="Método de contato">
          <button
            type="button"
            onClick={() => setMethod('email')}
            aria-pressed={method === 'email'}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest transition-all ${
              method === 'email'
                ? 'bg-white text-black shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Mail className="w-4 h-4" />
            Por Email
          </button>
          <button
            type="button"
            onClick={() => setMethod('whatsapp')}
            aria-pressed={method === 'whatsapp'}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-widest transition-all ${
              method === 'whatsapp'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Por WhatsApp
          </button>
        </div>
      </fieldset>

      <form name="contact" onSubmit={handleSubmit} className="space-y-4 md:space-y-6" noValidate>
        {/* Nome */}
        <div className="space-y-2">
          <label htmlFor="contact-nome" className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-4 block">
            Nome
          </label>
          <input
            id="contact-nome"
            required
            aria-required="true"
            type="text"
            value={formData.nome}
            onChange={(e) => setFormData({...formData, nome: e.target.value})}
            placeholder="Seu nome"
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3.5 md:py-4 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all placeholder:text-zinc-600 text-sm"
          />
        </div>

        <AnimatePresence mode="wait">
          {method === 'email' ? (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <label htmlFor="contact-email" className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-4 block">
                Email
              </label>
              <input
                id="contact-email"
                required
                aria-required="true"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="seu@email.com"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3.5 md:py-4 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all placeholder:text-zinc-600 text-sm"
              />
            </motion.div>
          ) : (
            <motion.div
              key="whatsapp"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-2"
            >
              <label htmlFor="contact-whatsapp" className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-4 block">
                WhatsApp
              </label>
              <input
                id="contact-whatsapp"
                required
                aria-required="true"
                aria-invalid={!!errors.whatsapp}
                aria-describedby={errors.whatsapp ? 'whatsapp-error' : undefined}
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => {
                  const formatted = formatWhatsappDisplay(e.target.value);
                  setFormData({...formData, whatsapp: formatted});
                  if (errors.whatsapp) setErrors({...errors, whatsapp: ''});
                }}
                placeholder="+55 81 99999-9999"
                className={`w-full bg-white/5 border ${errors.whatsapp ? 'border-red-500/50 focus:ring-red-500/20' : 'border-white/10 focus:ring-white/20'} rounded-2xl px-6 py-3.5 md:py-4 focus:outline-none focus:ring-2 transition-all placeholder:text-zinc-600 text-sm`}
              />
              {errors.whatsapp && (
                <p id="whatsapp-error" role="alert" aria-live="polite" className="text-[10px] text-red-400 ml-4 mt-1">
                  {errors.whatsapp}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mensagem */}
        <div className="space-y-2">
          <label htmlFor="contact-mensagem" className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-4 block">
            Mensagem
          </label>
          <textarea
            id="contact-mensagem"
            required
            aria-required="true"
            rows={4}
            value={formData.mensagem}
            onChange={(e) => setFormData({...formData, mensagem: e.target.value})}
            placeholder="Como posso ajudar você?"
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3.5 md:py-4 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all placeholder:text-zinc-600 resize-none text-sm"
          />
        </div>

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            aria-live="assertive"
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Erro ao enviar. Verifique sua conexão e tente novamente.</span>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="ml-auto text-red-400 hover:text-red-200 text-xs font-bold uppercase tracking-wide"
            >
              Fechar
            </button>
          </motion.div>
        )}

        <button
          disabled={status === 'sending' || status === 'error'}
          type="submit"
          aria-busy={status === 'sending'}
          className="group w-full bg-white text-black font-bold py-4 md:py-5 rounded-2xl flex items-center justify-center gap-3 transition-all hover:bg-zinc-200 disabled:opacity-50 text-sm md:text-base"
        >
          {status === 'sending' ? (
            <span className="animate-pulse">Enviando...</span>
          ) : (
            <>
              Solicitar Contato
              <Send className="w-4 md:w-5 h-4 md:h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
