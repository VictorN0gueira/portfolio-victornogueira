import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Loader2, Trash2, ChevronDown, Rocket, Briefcase, Phone, CalendarCheck } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  quickReplies?: string[];
}

const WEBHOOK_URL = 'https://n8n.vnone.com.br/webhook/chatbot-site-vn';
const VICKY_AVATAR = 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2Fvn-assistente.png&version_id=null';

const INITIAL_MESSAGE: Message = {
  id: '1',
  text: 'Olá! Eu sou a Vicky, da VN One. Como posso ajudar você hoje?',
  sender: 'bot',
  timestamp: new Date(),
  quickReplies: ['Quero automatizar meu negócio', 'Ver projetos e cases', 'Agendar reunião', 'Falar com o Victor'],
};

const QUICK_ACTIONS = [
  { label: 'Quero automatizar', icon: Rocket, message: 'Quero automatizar meu negócio' },
  { label: 'Ver projetos', icon: Briefcase, message: 'Quero ver os projetos e cases' },
  { label: 'Agendar reunião', icon: CalendarCheck, message: 'Quero agendar uma reunião com o Victor' },
  { label: 'Falar com Victor', icon: Phone, message: 'Quero falar com o Victor' },
];

const PLACEHOLDER_TEXTS = [
  'Pergunte sobre automação...',
  'Quanto custa um projeto?',
  'Como funciona o processo?',
  'Quais tecnologias você usa?',
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let id = localStorage.getItem('portfolio_session_id');
    if (!id) {
      id = 'usr_' + Math.random().toString(16).slice(2, 12);
      localStorage.setItem('portfolio_session_id', id);
    }
    setSessionId(id);

    const interacted = localStorage.getItem('chatbot_interacted');
    if (interacted) {
      setShowWelcome(false);
      setHasInteracted(true);
    }
  }, []);

  // Rotating placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_TEXTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (isOpen && !showWelcome) {
      const timeout = setTimeout(() => {
        scrollToBottom();
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, showWelcome, scrollToBottom]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    if (showWelcome) {
      setShowWelcome(false);
      setHasInteracted(true);
      localStorage.setItem('chatbot_interacted', 'true');
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          timestamp: userMessage.timestamp.toISOString(),
          sessionId,
          source: 'portfolio_chatbot',
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json().catch(() => ({}));
      const replyText = data.reply || data.response || data.output || data.text || data.message || (typeof data === 'string' ? data : null);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: replyText || 'Recebi sua mensagem! O Victor entrará em contato com você em breve.',
        sender: 'bot',
        timestamp: new Date(),
        quickReplies: ['Saber mais', 'Ver preços', 'Agendar reunião'],
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Desculpe, ocorreu um erro ao enviar sua mensagem. Tente novamente mais tarde.',
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => sendMessage(inputValue);

  const handleQuickReply = (text: string) => {
    // Remove quick replies from all messages to keep UI clean
    setMessages((prev) =>
      prev.map((msg) => ({ ...msg, quickReplies: undefined }))
    );
    sendMessage(text);
  };

  const clearChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setShowWelcome(true);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* 
      Chatbot Vicky comentado para uso futuro
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mb-4 w-[min(92vw,420px)] h-[min(82vh,620px)] flex flex-col rounded-[2rem] overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.5)] border border-white/10"
            style={{
              background: 'linear-gradient(180deg, #1a1a2e 0%, #16162a 40%, #0f0f1a 100%)',
            }}
          >
            {/* ── Header ── *\/}
            <div className="relative px-5 py-4 flex items-center justify-between shrink-0">
              {/* Glow line *\/}
              <div className="absolute bottom-0 left-4 right-4 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />

              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-purple-500/30 ring-offset-2 ring-offset-[#1a1a2e]">
                    <img src={VICKY_AVATAR} alt="Vicky" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#1a1a2e]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-none tracking-tight">
                    Vicky
                  </h3>
                  <p className="text-[10px] text-emerald-400/80 mt-1 font-medium tracking-wide">
                    {isLoading ? (
                      <span className="flex items-center gap-1.5">
                        <span className="flex gap-0.5">
                          <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce" />
                        </span>
                        Digitando
                      </span>
                    ) : (
                      'Assistente VN One'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  onClick={clearChat}
                  title="Limpar conversa"
                  className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ── Welcome Screen ── *\/}
            <AnimatePresence mode="wait">
              {showWelcome && !hasInteracted ? (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex flex-col items-center justify-center px-8 text-center"
                >
                  {/* Avatar glow *\/}
                  <div className="relative mb-6">
                    <div className="absolute inset-0 blur-2xl bg-purple-500/20 rounded-full scale-150" />
                    <div className="relative w-24 h-24 rounded-full overflow-hidden ring-2 ring-purple-500/40 ring-offset-4 ring-offset-[#16162a]">
                      <img src={VICKY_AVATAR} alt="Vicky" className="w-full h-full object-cover" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1 font-display tracking-tight">
                    Olá! Eu sou a Vicky 👋
                  </h3>
                  <p className="text-zinc-400 text-sm mb-8 leading-relaxed max-w-[280px]">
                    Assistente virtual da VN One. Como posso ajudar você hoje?
                  </p>

                  {/* Quick Actions *\/}
                  <div className="flex flex-col gap-2.5 w-full max-w-[280px]">
                    {QUICK_ACTIONS.map((action, i) => (
                      <motion.button
                        key={action.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        onClick={() => handleQuickReply(action.message)}
                        className="group flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-purple-500/30 transition-all text-left"
                      >
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                          <action.icon className="w-4 h-4 text-purple-400" />
                        </div>
                        <span className="text-sm text-zinc-300 group-hover:text-white transition-colors font-medium">
                          {action.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col min-h-0"
                >
                  {/* ── Messages ── *\/}
                  <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar scroll-smooth"
                  >
                    {messages.map((msg, idx) => (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        key={msg.id}
                        className={cn(
                          'flex gap-2.5 max-w-[88%]',
                          msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'items-start'
                        )}
                      >
                        {/* Bot avatar *\/}
                        {msg.sender === 'bot' && (
                          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5 ring-1 ring-white/10">
                            <img src={VICKY_AVATAR} alt="V" className="w-full h-full object-cover" />
                          </div>
                        )}

                        <div className={cn(
                          'flex flex-col',
                          msg.sender === 'user' ? 'items-end' : 'items-start'
                        )}>
                          <div
                            className={cn(
                              'px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap',
                              msg.sender === 'user'
                                ? 'bg-purple-500 text-white rounded-2xl rounded-tr-md shadow-lg shadow-purple-500/20'
                                : 'bg-white/[0.06] text-zinc-200 border border-white/[0.08] rounded-2xl rounded-tl-md'
                            )}
                          >
                            {msg.sender === 'bot' ? (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({ children }) => <span className="block mb-1.5 last:mb-0">{children}</span>,
                                  a: ({ href, children }) => (
                                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-400 underline underline-offset-2 hover:text-purple-300 transition-colors">
                                      {children}
                                    </a>
                                  ),
                                  ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
                                  li: ({ children }) => <li>{children}</li>,
                                  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                                }}
                              >
                                {msg.text}
                              </ReactMarkdown>
                            ) : (
                              msg.text
                            )}
                          </div>

                          <span className="text-[9px] text-zinc-600 mt-1 px-1 tabular-nums">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {/* Quick Replies *\/}
                          {msg.sender === 'bot' && msg.quickReplies && idx === messages.length - 1 && !isLoading && (
                            <motion.div
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.3 }}
                              className="flex flex-wrap gap-1.5 mt-2"
                            >
                              {msg.quickReplies.map((reply) => (
                                <button
                                  key={reply}
                                  onClick={() => handleQuickReply(reply)}
                                  className="px-3 py-1.5 text-[11px] font-medium text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-full hover:bg-purple-500/20 hover:text-purple-200 transition-all"
                                >
                                  {reply}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    ))}

                    {/* Typing indicator *\/}
                    {isLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2.5"
                      >
                        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5 ring-1 ring-white/10">
                          <img src={VICKY_AVATAR} alt="V" className="w-full h-full object-cover" />
                        </div>
                        <div className="px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-tl-md">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-purple-400/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-2 h-2 bg-purple-400/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-2 h-2 bg-purple-400/60 rounded-full animate-bounce" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Input Area ── *\/}
            {(!showWelcome || hasInteracted) && (
              <div className="px-4 pb-4 pt-2 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="relative flex items-center"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={PLACEHOLDER_TEXTS[placeholderIndex]}
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-2xl pl-5 pr-12 py-3 text-sm text-white focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.07] transition-all placeholder:text-zinc-600 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading}
                    className={cn(
                      'absolute right-1.5 p-2.5 rounded-xl transition-all',
                      inputValue.trim() && !isLoading
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30 hover:bg-purple-400 active:scale-90'
                        : 'text-zinc-600'
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative group"
      >
        <div
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 overflow-hidden',
            isOpen
              ? 'bg-zinc-800 ring-1 ring-white/10'
              : 'ring-2 ring-purple-500/40 ring-offset-2 ring-offset-transparent shadow-[0_0_30px_rgba(168,85,247,0.25)]'
          )}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-6 h-6 text-zinc-300" />
              </motion.div>
            ) : (
              <motion.div
                key="avatar"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full"
              >
                <img
                  src={VICKY_AVATAR}
                  alt="Fale com a Vicky"
                  className="w-full h-full object-cover"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.button> 
      */}

      {/* ── WhatsApp FAB ── */}
      <motion.a
        href="https://wa.me/5581987348633"
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative group flex items-center justify-center w-16 h-16 bg-[#25D366] rounded-full shadow-[0_10px_30px_rgba(37,211,102,0.3)] hover:shadow-[0_15px_40px_rgba(37,211,102,0.5)] transition-shadow duration-300 border border-white/20"
      >
        <div className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-20 group-hover:hidden" style={{ animationDuration: '2s' }} />
        
        <svg 
          viewBox="0 0 24 24" 
          className="w-8 h-8 text-white fill-current"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.438 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>

        {/* Tooltip */}
        <div className="absolute right-[calc(100%+16px)] top-1/2 -translate-y-1/2 px-4 py-2 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-2xl text-xs font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-2xl translate-x-2 group-hover:translate-x-0">
          Fale no WhatsApp
          <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-zinc-900 border-r border-t border-white/10 rotate-45" />
        </div>
      </motion.a>
    </div>
  );

}
