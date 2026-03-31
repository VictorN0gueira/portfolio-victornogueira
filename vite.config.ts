import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // LOG PARA DEBUG NO EASYPANEL (aparecerá nos logs de build)
  console.log('=== BUILD ENV DEBUG ===');
  console.log('VITE_GNEWS_API_KEY (from system):', process.env.VITE_GNEWS_API_KEY ? 'PRESENTE' : 'AUSENTE');
  console.log('VITE_GNEWS_API_KEY (from loadEnv):', env.VITE_GNEWS_API_KEY ? 'PRESENTE' : 'AUSENTE');
  console.log('=======================');
  return {
    base: process.env.GITHUB_PAGES === 'true' ? '/portfolio-victornogueira/' : '/',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // Força a injeção da variável ignorando o comportamento padrão do import.meta.env no Vite
      'import.meta.env.VITE_GNEWS_API_KEY': JSON.stringify(env.VITE_GNEWS_API_KEY || process.env.VITE_GNEWS_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
