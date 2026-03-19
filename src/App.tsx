import { motion, useScroll, useSpring } from 'motion/react';
import Header from './components/Header';
import Hero from './components/Hero';
import Stats from './components/Stats';
import About from './components/About';
import Skills from './components/Skills';
import Projects from './components/Projects';
import Partners from './components/Partners';
import Contact from './components/Contact';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';

const revealProps: any = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.8, ease: "easeOut" }
};

export default function App() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="min-h-screen bg-brand-white text-zinc-900 font-sans selection:bg-black selection:text-white">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-black z-100 origin-left"
        style={{ scaleX }}
      />

      <Header />
      
      <main>
        <Hero />
        
        <motion.div {...revealProps}>
          <Stats />
        </motion.div>

        <motion.div {...revealProps}>
          <About />
        </motion.div>

        <motion.div {...revealProps}>
          <Skills />
        </motion.div>

        <motion.div {...revealProps}>
          <Projects />
        </motion.div>

        <motion.div {...revealProps}>
          <Partners />
        </motion.div>

        <motion.div {...revealProps}>
          <Contact />
        </motion.div>
      </main>

      <Footer />
      <Chatbot />
    </div>
  );
}

