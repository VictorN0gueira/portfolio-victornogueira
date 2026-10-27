import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AccessibilityProvider } from './contexts/AccessibilityContext.tsx';
import MotionProvider from './components/layout/MotionProvider.tsx';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <AccessibilityProvider>
        <MotionProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </MotionProvider>
      </AccessibilityProvider>
    </HelmetProvider>
  </StrictMode>,
);
