import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

export default function CustomCursor() {
  const [isHovering, setIsHovering] = useState(false);
  
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  const springConfig = { damping: 35, stiffness: 700, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  const dotSpringConfig = { damping: 40, stiffness: 1000 };
  const dotXSpring = useSpring(cursorX, dotSpringConfig);
  const dotYSpring = useSpring(cursorY, dotSpringConfig);

  useEffect(() => {
    // Respeitar prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const updateMousePosition = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === 'a' ||
        target.tagName.toLowerCase() === 'button' ||
        target.closest('a') ||
        target.closest('button')
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [cursorX, cursorY]);

  // Ocultar em touch devices e quando prefers-reduced-motion
  if (typeof window !== 'undefined') {
    if (window.matchMedia('(pointer: coarse)').matches) return null;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  }

  return (
    <>
      <style>{`
        @media (pointer: fine) and (prefers-reduced-motion: no-preference) {
          body, a, button {
            cursor: none !important;
          }
        }
      `}</style>
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 rounded-full border-2 border-zinc-900 pointer-events-none z-9999 mix-blend-difference hidden md:block"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          translateX: '-50%',
          translateY: '-50%'
        }}
        animate={{
          scale: isHovering ? 1.5 : 1,
          backgroundColor: isHovering ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,0)',
          borderColor: isHovering ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,1)'
        }}
        transition={{ duration: 0.15 }}
      />
      
      {/* Ponto central do cursor */}
      <motion.div
        className="fixed top-0 left-0 w-2 h-2 rounded-full bg-white pointer-events-none z-10000 mix-blend-difference hidden md:block"
        style={{
          x: dotXSpring,
          y: dotYSpring,
          translateX: '-50%',
          translateY: '-50%'
        }}
        animate={{
          opacity: isHovering ? 0 : 1
        }}
        transition={{ duration: 0.15 }}
      />
    </>
  );
}
