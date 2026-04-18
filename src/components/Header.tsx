import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const LOGO_URL = "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FLogo%20-%20s.%20fundo.png&version_id=null";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  const handleAnchorClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    if (isHome) {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => {
        const el = document.querySelector(href);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 400);
    }
    setIsMenuOpen(false);
  }, [isHome, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMenuOpen]);

  const navItems = [
    { name: 'Sobre', href: '#sobre', isRoute: false },
    { name: 'Projetos', href: '#projetos', isRoute: false },
    { name: 'Contato', href: '#contato', isRoute: false },
    { name: 'Blog', href: '/blog', isRoute: true },
  ];

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled 
            ? 'bg-black/90 backdrop-blur-xl py-4 border-b border-white/5' 
            : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
          <a href="#" className="flex items-center gap-2 group relative z-50">
            <img 
              src={LOGO_URL} 
              alt="VN Logo" 
              className={`h-10 md:h-14 w-auto object-contain transition-all duration-500 group-hover:scale-110 ${
                isScrolled ? 'brightness-110' : 'brightness-0'
              }`} 
              referrerPolicy="no-referrer" 
            />
          </a>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-10">
            {navItems.map((item) => {
              if (item.isRoute) {
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 relative group ${
                      isScrolled ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-black'
                    }`}
                  >
                    {item.name}
                    <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 transition-all duration-300 group-hover:w-full ${
                      isScrolled ? 'bg-white' : 'bg-black'
                    }`}></span>
                  </Link>
                );
              }
              return (
                <a 
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleAnchorClick(e, item.href)}
                  className={`text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 relative group ${
                    isScrolled ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  {item.name}
                  <span className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 transition-all duration-300 group-hover:w-full ${
                    isScrolled ? 'bg-white' : 'bg-black'
                  }`}></span>
                </a>
              );
            })}
          </nav>

          <div className={`flex items-center gap-6 relative ${isMenuOpen ? 'z-[70]' : 'z-50'}`}>
            <a 
              href="#contato" 
              onClick={(e) => handleAnchorClick(e, '#contato')}
              className={`shimmer hidden sm:block text-xs font-bold uppercase tracking-widest px-8 py-3 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg ${
                isScrolled || isMenuOpen
                  ? 'bg-white text-black hover:bg-zinc-200 shadow-white/5' 
                  : 'bg-black text-white hover:bg-zinc-800 shadow-black/10'
              }`}
            >
              Conversar
            </a>

            {/* Mobile Menu Button - Minimalist Circular Toggle */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ willChange: 'transform, background-color, border-color' }}
              className={`md:hidden flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-300 ${
                isScrolled || isMenuOpen
                  ? 'text-white bg-white/5 hover:bg-white/10 border-white/10' 
                  : 'text-black bg-black/5 hover:bg-black/10 border-black/10'
              }`}
              aria-label="Toggle Menu"
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

      {/* Mobile Menu Overlay - Refined Sidebar Panels */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            {/* Backdrop Blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            
            {/* Slide-in Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{ willChange: 'transform' }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-zinc-950 border-l border-white/10 p-8 md:p-12 flex flex-col"
            >
              <nav className="flex flex-col gap-6 mt-16 md:mt-20">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-2">Navegação</p>
                {navItems.map((item, idx) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.1 }}
                  >
                    {item.isRoute ? (
                      <Link
                        to={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="text-3xl md:text-4xl font-bold tracking-tighter text-white hover:text-zinc-300 transition-colors block italic"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        onClick={(e) => handleAnchorClick(e, item.href)}
                        className="text-3xl md:text-4xl font-bold tracking-tighter text-white hover:text-zinc-300 transition-colors block italic"
                      >
                        {item.name}
                      </a>
                    )}
                  </motion.div>
                ))}
              </nav>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-auto space-y-6 md:space-y-8"
              >
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">Contato</p>
                  <a
                    href="mailto:contato@vnone.com.br"
                    className="text-xs md:text-sm text-zinc-300 hover:text-white transition-colors block"
                  >
                    contato@vnone.com.br
                  </a>
                </div>

                <a
                  href="#contato"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full bg-white text-black px-8 md:px-12 py-4 md:py-5 rounded-full font-bold uppercase tracking-widest text-center block text-xs md:text-sm shadow-xl shadow-white/5 hover:bg-zinc-200 transition-all"
                >
                  Vamos Conversar
                </a>
                
                <p className="text-[9px] md:text-[10px] text-zinc-500 uppercase tracking-widest text-center">
                  © 2026 Victor Nogueira
                </p>
              </motion.div>

              {/* Subtle Gradient Glow (Optimized) */}
              <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-30">
                <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.15)_0%,_transparent_70%)] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.15)_0%,_transparent_70%)] rounded-full" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
