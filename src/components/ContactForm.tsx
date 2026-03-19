import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, CheckCircle2, Mail, MessageSquare } from 'lucide-react';

const WEBHOOKS = {
  email: 'https://n8n.vnone.com.br/webhook/portfolio-vn-email',
  whatsapp: 'https://n8n.vnone.com.br/webhook/portfolio-vn-whatsapp'
};

type ContactMethod = 'email' | 'whatsapp';

export default function ContactForm() {
  const [method, setMethod] = useState<ContactMethod>('email');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    mensagem: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (method === 'whatsapp') {
      const digits = formData.whatsapp.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 13) {
        newErrors.whatsapp = 'Por favor, insira um número válido com DDD';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setStatus('sending');

    const webhookUrl = method === 'email' ? WEBHOOKS.email : WEBHOOKS.whatsapp;
    
    // Prepare data to send
    const payload = {
      nome: formData.nome,
      [method]: formData[method],
      mensagem: formData.mensagem,
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatus('success');
      } else {
        throw new Error('Failed to send');
      }
    } catch (error) {
      console.error('Submission error:', error);
      // Even if n8n returns an error or is unreachable, we might want to simulate success for UX or show error
      setStatus('error');
      // Simulate success for demo purposes if needed, but here we'll show error
      setTimeout(() => setStatus('idle'), 3000);
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
            setFormData({ nome: '', email: '', whatsapp: '', mensagem: '' });
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
      {/* Method Selector */}
      <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
        <button
          onClick={() => setMethod('email')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 md:py-3 rounded-xl transition-all text-sm ${
            method === 'email' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Mail className="w-4 h-4" /> Email
        </button>
        <button
          onClick={() => setMethod('whatsapp')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 md:py-3 rounded-xl transition-all text-sm ${
            method === 'whatsapp' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> WhatsApp
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-4">Nome</label>
          <input 
            required
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
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-4">Email</label>
              <input 
                required
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
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-4">WhatsApp</label>
              <input 
                required
                type="tel" 
                value={formData.whatsapp}
                onChange={(e) => {
                  setFormData({...formData, whatsapp: e.target.value});
                  if (errors.whatsapp) setErrors({...errors, whatsapp: ''});
                }}
                placeholder="+55 (11) 99999-9999"
                className={`w-full bg-white/5 border ${errors.whatsapp ? 'border-red-500/50 focus:ring-red-500/20' : 'border-white/10 focus:ring-white/20'} rounded-2xl px-6 py-3.5 md:py-4 focus:outline-none focus:ring-2 transition-all placeholder:text-zinc-600 text-sm`}
              />
              {errors.whatsapp && (
                <p className="text-[10px] text-red-400 ml-4 mt-1">{errors.whatsapp}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-4">Mensagem</label>
          <textarea 
            required
            rows={4}
            value={formData.mensagem}
            onChange={(e) => setFormData({...formData, mensagem: e.target.value})}
            placeholder="Como posso ajudar você?"
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3.5 md:py-4 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all placeholder:text-zinc-600 resize-none text-sm"
          ></textarea>
        </div>

        <button 
          disabled={status === 'sending'}
          type="submit"
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
