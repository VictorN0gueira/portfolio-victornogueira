import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { LOGO_URL } from '../lib/constants';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  // Ativo também em sub-rotas (ex.: /projetos/troco mantém "Projetos" ativo)
  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(`${href}/`);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 20);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Escape key closes mobile menu
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) setIsMenuOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isMenuOpen]);

  // Prevent body scroll when menu is open — but delay it to avoid layout thrashing during animation
  useEffect(() => {
    if (isMenuOpen) {
      const timer = setTimeout(() => { document.body.style.overflow = 'hidden'; }, 300);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = '';
    }
  }, [isMenuOpen]);

  const navItems = [
    { name: 'Sobre', href: '/sobre' },
    { name: 'Serviços', href: '/servicos' },
    { name: 'Projetos', href: '/projetos' },
    { name: 'Contato', href: '/contato' },
    { name: 'Blog', href: '/blog' },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-black/98 md:bg-black/90 backdrop-blur-none md:backdrop-blur-xl py-4 border-b border-white/5'
            : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 flex justify-between items-center">
          {/* Logo — navega para home */}
          <Link to="/" className="flex items-center gap-2 group relative z-50" aria-label="Victor Nogueira — Página inicial">
            <img
              src={LOGO_URL}
              alt="VN One Logo"
              className={`h-10 md:h-14 w-auto max-w-[120px] md:max-w-none object-contain transition-all duration-500 group-hover:scale-110 ${
                isScrolled ? 'brightness-110' : 'brightness-0 dark:brightness-110'
              }`}
              referrerPolicy="no-referrer"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-10" aria-label="Navegação principal">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 relative group ${
                  isActive(item.href)
                    ? isScrolled ? 'text-white' : 'text-black dark:text-white'
                    : isScrolled ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-black dark:text-zinc-300 dark:hover:text-white'
                }`}
              >
                {item.name}
                <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 h-0.5 transition-all duration-300 group-hover:w-full ${
                  isActive(item.href) ? 'w-full' : 'w-0'
                } ${
                  isScrolled ? 'bg-white' : 'bg-black dark:bg-white'
                }`} />
              </Link>
            ))}
          </nav>

          <div className={`flex items-center gap-3 relative ${isMenuOpen ? 'z-[70]' : 'z-50'}`}>
            <ThemeToggle scrolled={isScrolled || isMenuOpen} />
            <Link
              to="/contato"
              className={`shimmer hidden sm:block text-xs font-bold uppercase tracking-widest px-8 py-3 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg ${
                isScrolled || isMenuOpen
                  ? 'bg-white text-black hover:bg-zinc-200 shadow-white/5'
                  : 'bg-black text-white hover:bg-zinc-800 shadow-black/10 dark:bg-white dark:text-black dark:hover:bg-zinc-200'
              }`}
            >
              Conversar
            </Link>

            {/* Mobile Menu Button — mínimo 44px para touch */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ willChange: 'transform, background-color, border-color' }}
              className={`md:hidden flex items-center justify-center w-11 h-11 rounded-full border transition-all duration-300 ${
                isScrolled || isMenuOpen
                  ? 'text-white bg-white/5 hover:bg-white/10 border-white/10'
                  : 'text-black bg-black/5 hover:bg-black/10 border-black/10 dark:text-white dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10'
              }`}
              aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isMenuOpen ? 'close' : 'menu'}
                  initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                  transition={{ duration: 0.2 }}
                >
                  {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </motion.div>
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <div id="mobile-menu" className="fixed inset-0 z-[60] md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-black/70"
              aria-hidden="true"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
              style={{ willChange: 'transform' }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-zinc-950 border-l border-white/10 p-8 md:p-12 flex flex-col"
              role="dialog"
              aria-label="Menu de navegação"
            >
              {/* Botão de Fechar Explícito */}
              <button
                onClick={() => setIsMenuOpen(false)}
                className="absolute top-6 left-6 p-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-all"
                aria-label="Fechar menu"
              >
                <X className="w-6 h-6" />
              </button>

              <nav className="flex flex-col gap-6 mt-16 md:mt-20" aria-label="Navegação mobile">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">Navegação</p>
                {navItems.map((item) => (
                  <div key={item.name}>
                    <Link
                      to={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      aria-current={isActive(item.href) ? 'page' : undefined}
                      className={`text-2xl sm:text-3xl font-bold tracking-tighter transition-colors block italic ${
                        isActive(item.href) ? 'text-white underline underline-offset-8' : 'text-white hover:text-zinc-300'
                      }`}
                    >
                      {item.name}
                    </Link>
                  </div>
                ))}
              </nav>

              <div className="mt-auto space-y-6 md:space-y-8">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Contato</p>
                  <a
                    href="mailto:contato@vnone.com.br"
                    className="text-xs md:text-sm text-zinc-300 hover:text-white transition-colors block"
                  >
                    contato@vnone.com.br
                  </a>
                </div>

                <Link
                  to="/contato"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full bg-white text-black px-8 md:px-12 py-4 md:py-5 rounded-full font-bold uppercase tracking-widest text-center block text-xs md:text-sm shadow-xl shadow-white/5 hover:bg-zinc-200 transition-all"
                >
                  Vamos Conversar
                </Link>

                <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-widest text-center">
                  © 2026 Victor Nogueira
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
