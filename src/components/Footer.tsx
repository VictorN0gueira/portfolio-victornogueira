import { Github, Linkedin, Instagram, ArrowUpRight, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const LOGO_URL = "https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=VN%20One%2FLogo%20-%20s.%20fundo.png&version_id=null";

const socialLinks = [
  { icon: Linkedin, label: 'LinkedIn', href: 'https://www.linkedin.com/in/victornogueira-vn' },
  { icon: Github, label: 'GitHub', href: 'https://github.com/VictorN0gueira' },
  { icon: Instagram, label: 'Instagram', href: 'https://www.instagram.com/victornogueira._/' }
];

const navLinks = [
  { label: 'Sobre', href: '#sobre' },
  { label: 'Projetos', href: '#projetos' },
  { label: 'Contato', href: '#contato' },
];

export default function Footer() {
  return (
    <footer className="bg-zinc-950 text-zinc-500 pt-16 pb-8 px-6 md:px-12 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        {/* Grid principal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          {/* Branding */}
          <div className="space-y-4">
            <img 
              src={LOGO_URL} 
              alt="VN One Logo" 
              className="h-10 w-auto object-contain brightness-110"
              referrerPolicy="no-referrer"
              loading="lazy"
              width={40}
              height={40}
            />
            <p className="text-sm text-zinc-500 font-light leading-relaxed max-w-xs">
              Transformando complexidade em eficiência através de automação inteligente e IA.
            </p>
          </div>

          {/* Navegação */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600 mb-5">Navegação</p>
            <nav className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-zinc-400 hover:text-white transition-colors w-fit"
                >
                  {link.label}
                </a>
              ))}
              <Link
                to="/blog"
                className="text-sm text-zinc-400 hover:text-white transition-colors w-fit flex items-center gap-1.5"
              >
                Blog
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </nav>
          </div>

          {/* Redes sociais */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-600 mb-5">Conecte-se</p>
            <div className="flex items-center gap-4 mb-6">
              {socialLinks.map((social) => (
                <a 
                  key={social.label}
                  href={social.href} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center hover:text-white hover:border-white/20 hover:bg-white/[0.08] transition-all hover:scale-110"
                  aria-label={social.label}
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
            <a 
              href="mailto:contato@vnone.com.br"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              contato@vnone.com.br
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-zinc-600 font-light">
            &copy; {new Date().getFullYear()} Victor Nogueira. Todos os direitos reservados.
          </p>
          <p className="text-xs text-zinc-600 font-light flex items-center gap-1.5">
            Feito com <Heart className="w-3 h-3 text-red-500/70 fill-red-500/70" /> e automação
          </p>
        </div>
      </div>
    </footer>
  );
}
