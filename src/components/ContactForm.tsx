import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, CheckCircle2, Mail, MessageSquare, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WHATSAPP_FALLBACK_URL } from '../lib/constants';
import { serviceOptions } from '../data/services';
import ServiceSelect from './ServiceSelect';
import {
  WEBHOOKS,
  buildContactPayload,
  validateContact,
  type ContactErrors,
  type ContactFields,
  type ContactMethod,
} from '../lib/contact';
import { formatWhatsappDisplay } from '../lib/phone';
import FieldError from './contact/FieldError';
import { errorId, fieldProps } from './contact/fieldProps';

interface ContactFormProps {
  /** Mensagem pré-preenchida (ex.: vinda do ROICalculator) */
  initialMessage?: string;
}

export default function ContactForm({ initialMessage }: ContactFormProps) {
  const [method, setMethod] = useState<ContactMethod>('email');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    whatsapp: '+55 ',
    mensagem: ''
  });
  const [servico, setServico] = useState('');
  const [errors, setErrors] = useState<ContactErrors>({});
  // Consentimento LGPD: obrigatório para enviar
  const [consent, setConsent] = useState(false);

  // Digitar num campo limpa só o erro daquele campo.
  const clearError = (field: keyof ContactFields) => {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  // Trocar o método descarta os erros do método anterior.
  const selectMethod = (next: ContactMethod) => {
    setMethod(next);
    setErrors({});
  };

  // Pré-preenche a mensagem quando o usuário usa a calculadora de ROI
  useEffect(() => {
    if (initialMessage) {
      setFormData((prev) => ({ ...prev, mensagem: initialMessage }));
    }
  }, [initialMessage]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const fields: ContactFields = { ...formData, servico };
    const newErrors = validateContact(fields, method);

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setStatus('sending');

    const webhookUrl = method === 'email' ? WEBHOOKS.email : WEBHOOKS.whatsapp;

    // Campos legados intactos (nome, email ou whatsapp, mensagem, timestamp) + 'servico' aditivo.
    const payload = buildContactPayload(fields, method, new Date());

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
            setServico('');
            setConsent(false);
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
            onClick={() => selectMethod('email')}
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
            onClick={() => selectMethod('whatsapp')}
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
            {...fieldProps('nome', errors.nome)}
            type="text"
            value={formData.nome}
            onChange={(e) => {
              setFormData({...formData, nome: e.target.value});
              clearError('nome');
            }}
            placeholder="Seu nome"
          />
          <FieldError id={errorId('nome')} message={errors.nome} />
        </div>

        {/* Serviço de interesse, comum a email e WhatsApp */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-4 block">
            Serviço de interesse
          </label>
          <ServiceSelect
            value={servico}
            onChange={(v) => {
              setServico(v);
              clearError('servico');
            }}
            options={serviceOptions}
            placeholder="Selecione um serviço"
            invalid={!!errors.servico}
            describedBy={errorId('servico')}
          />
          <FieldError id={errorId('servico')} message={errors.servico} />
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
                {...fieldProps('email', errors.email)}
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({...formData, email: e.target.value});
                  clearError('email');
                }}
                placeholder="seu@email.com"
              />
              <FieldError id={errorId('email')} message={errors.email} />
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
                {...fieldProps('whatsapp', errors.whatsapp)}
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => {
                  const formatted = formatWhatsappDisplay(e.target.value);
                  setFormData({...formData, whatsapp: formatted});
                  clearError('whatsapp');
                }}
                placeholder="+55 81 99999-9999"
              />
              <FieldError id={errorId('whatsapp')} message={errors.whatsapp} />
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
            {...fieldProps('mensagem', errors.mensagem, 'resize-none')}
            rows={4}
            value={formData.mensagem}
            onChange={(e) => {
              setFormData({...formData, mensagem: e.target.value});
              clearError('mensagem');
            }}
            placeholder="Como posso ajudar você?"
          />
          <FieldError id={errorId('mensagem')} message={errors.mensagem} />
        </div>

        {/* Consentimento LGPD */}
        <label className="flex items-start gap-3 cursor-pointer group px-1">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
            aria-required="true"
            className="mt-0.5 w-4 h-4 shrink-0 rounded border-white/20 bg-white/5 accent-emerald-500 cursor-pointer"
          />
          <span className="text-xs text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
            Li e concordo com a{' '}
            <Link to="/privacidade" className="underline text-zinc-400 hover:text-white transition-colors">
              Política de Privacidade
            </Link>{' '}
            e autorizo o uso dos meus dados para retorno do contato.
          </span>
        </label>

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            aria-live="assertive"
            className="flex flex-wrap items-center gap-3 px-5 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Erro ao enviar. Tente novamente ou{' '}
              <a
                href={WHATSAPP_FALLBACK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium text-red-200 hover:text-white transition-colors"
              >
                fale direto pelo WhatsApp
              </a>
              .
            </span>
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
          disabled={status === 'sending' || status === 'error' || !consent}
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
