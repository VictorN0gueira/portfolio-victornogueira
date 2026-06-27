import { Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  scrolled?: boolean;
};

export default function ThemeToggle({ scrolled = false }: Props) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <motion.button
      onClick={toggleTheme}
      whileTap={{ scale: 0.88 }}
      className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all duration-300 ${
        scrolled || isDark
          ? 'text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
          : 'text-zinc-500 hover:text-black bg-black/5 hover:bg-black/10 border-black/10'
      }`}
      aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? 'moon' : 'sun'}
          initial={{ opacity: 0, rotate: -45, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 45, scale: 0.6 }}
          transition={{ duration: 0.18 }}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
