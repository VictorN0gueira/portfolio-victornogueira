import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AccessibilityProvider } from './contexts/AccessibilityContext.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <AccessibilityProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AccessibilityProvider>
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>,
);
