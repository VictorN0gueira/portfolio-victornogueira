import { Github, Linkedin, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-black text-zinc-500 py-12 px-6 md:px-12 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col items-center md:items-start gap-2">
          <p className="text-white font-display font-bold text-lg">Victor Nogueira</p>
          <p className="text-sm font-light">&copy; {new Date().getFullYear()} Todos os direitos reservados.</p>
        </div>
        
        <div className="flex items-center gap-8">
          {[
            { icon: <Linkedin className="w-5 h-5" />, label: 'LinkedIn', href: 'https://www.linkedin.com/in/victornogueira-vn' },
            { icon: <Github className="w-5 h-5" />, label: 'GitHub', href: 'https://github.com/VictorN0gueira' },
            { icon: <Instagram className="w-5 h-5" />, label: 'Instagram', href: 'https://www.instagram.com/victornogueira._/' }
          ].map((social) => (
            <a 
              key={social.label}
              href={social.href} 
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-all transform hover:scale-110"
              aria-label={social.label}
            >
              {social.icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
