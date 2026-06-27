import { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';
import type { ReactNode } from 'react';
import { isTouchDevice } from '../lib/constants';

type MagneticItemProps = {
  href: string;
  label: string;
  children: ReactNode;
  className?: string;
};

function MagneticItem({ href, label, children, className = '' }: MagneticItemProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 180, damping: 14, mass: 0.1 });
  const springY = useSpring(y, { stiffness: 180, damping: 14, mass: 0.1 });

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * 0.32);
    y.set((e.clientY - (rect.top + rect.height / 2)) * 0.32);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const baseClass = `w-11 h-11 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center transition-colors hover:text-white hover:border-white/20 hover:bg-white/[0.08] ${className}`;

  if (isTouchDevice) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClass}
        aria-label={label}
      >
        {children}
      </a>
    );
  }

  return (
    <motion.a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={baseClass}
      aria-label={label}
    >
      {children}
    </motion.a>
  );
}

export type SocialLink = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
};

type MagneticDockProps = {
  links: SocialLink[];
  iconClassName?: string;
};

export default function MagneticDock({ links, iconClassName = 'w-4 h-4' }: MagneticDockProps) {
  return (
    <div className="flex items-center gap-4">
      {links.map((link) => (
        <MagneticItem key={link.label} href={link.href} label={link.label}>
          <link.icon className={iconClassName} />
        </MagneticItem>
      ))}
    </div>
  );
}
