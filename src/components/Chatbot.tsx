import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Sparkles, Loader2, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const WEBHOOK_URL = 'https://n8n.vnone.com.br/webhook/chatbot-site-vn';
const VICKY_AVATAR = 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2Fvn-assistente.png&version_id=null';

const INITIAL_MESSAGE: Message = {
  id: '1',
  text: 'Olá! Eu sou a Vicky, da VN One. Como posso ajudar você hoje?',
  sender: 'bot',
  timestamp: new Date(),
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize sessionId
  useEffect(() => {
    let id = localStorage.getItem('portfolio_session_id');
    if (!id) {
      id = 'usr_' + Math.random().toString(16).slice(2, 12);
      localStorage.setItem('portfolio_session_id', id);
    }
    setSessionId(id);
  }, []);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Scroll when opening chat
  useEffect(() => {
    if (isOpen) {
      const timeout = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.text,
          timestamp: userMessage.timestamp.toISOString(),
          sessionId,
          source: 'portfolio_chatbot',
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json().catch(() => ({}));
      
      // Try to find the reply in common response fields
      const replyText = data.reply || data.response || data.output || data.text || data.message || (typeof data === 'string' ? data : null);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: replyText || 'Recebi sua mensagem! O Victor entrará em contato com você em breve.',
        sender: 'bot',
        timestamp: new Date(),
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

  const clearChat = () => {
    setMessages([INITIAL_MESSAGE]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 w-[min(90vw,400px)] sm:w-[400px] h-[min(80vh,600px)] flex flex-col glass-dark rounded-4xl overflow-hidden shadow-2xl border border-white/20"
          >
            {/* Header */}
            <div className="p-6 bg-white/10 border-b border-white/10 flex items-center justify-between backdrop-blur-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.4)] border border-white/20">
                  <img src={VICKY_AVATAR} alt="Vicky Avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">Vicky</h3>
                  <p className="text-[10px] text-emerald-300 mt-1.5 uppercase tracking-widest font-black flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    Responde em minutos
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={clearChat}
                  title="Limpar conversa"
                  className="p-2 hover:bg-white/20 rounded-xl transition-all text-zinc-100/80 hover:text-red-400 group relative"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="absolute -bottom-8 right-0 text-[8px] bg-black/80 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Limpar</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all text-white hover:bg-white/30"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar scroll-smooth"
            >
              {messages.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, x: msg.sender === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%]",
                    msg.sender === 'user' ? "ml-auto items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                    msg.sender === 'user' 
                      ? "bg-white text-black font-semibold rounded-tr-none shadow-lg" 
                      : "bg-zinc-700/90 text-white border border-white/10 rounded-tl-none shadow-sm"
                  )}>
                    {msg.sender === 'bot' ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <span className="block mb-2 last:mb-0">{children}</span>,
                          a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline hover:text-emerald-300">{children}</a>,
                          ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                          li: ({ children }) => <li className="mb-0.5">{children}</li>,
                          strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    ) : (
                      msg.text
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-300 mt-1.5 px-1 font-bold tracking-tight">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-zinc-300 text-xs px-2"
                >
                  <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce"></span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white/10 border-t border-white/10 backdrop-blur-2xl">
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Escreva sua mensagem..."
                  className="w-full bg-zinc-950/60 border border-white/20 rounded-2xl pl-5 pr-12 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40 transition-all placeholder:text-zinc-400 font-medium"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="absolute right-2 p-2 bg-white text-black rounded-xl disabled:opacity-40 disabled:grayscale hover:bg-zinc-200 transition-all shadow-xl"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 overflow-hidden group",
          isOpen ? "bg-white text-black rotate-90" : "bg-black text-white border border-white/30"
        )}
      >
        <div className="absolute inset-0 bg-linear-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
        {isOpen ? (
          <X className="w-7 h-7" />
        ) : (
          <div className="relative">
             <MessageSquare className="w-7 h-7" />
             <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white rounded-full border-2 border-black shadow-[0_0_8px_rgba(255,255,255,0.6)] animate-pulse" />
          </div>
        )}
      </motion.button>
    </div>
  );
}
