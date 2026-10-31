import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { ErrorBoundary, ErrorPanel } from './components/layout/ErrorBoundary';
import { MotionProvider } from './components/layout/MotionProvider';
import { routerBasename } from './lib/routerBasename';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessibilityProvider>
      <MotionProvider>
        <BrowserRouter basename={routerBasename()}>
          {/* The last net: whatever the nearer boundaries of the layout and the sections did not catch. */}
          <ErrorBoundary fallback={(retry) => <ErrorPanel onRetry={retry} isFullScreen />}>
            <App />
          </ErrorBoundary>
        </BrowserRouter>
      </MotionProvider>
    </AccessibilityProvider>
  </StrictMode>,
);
