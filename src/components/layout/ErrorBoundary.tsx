import { Component, type ReactNode } from 'react';
import { shellCopy } from '../../data/shellCopy';
import { whatsappUrl } from '../../lib/constants';
import { useTakeLostFocus } from '../../hooks/useTakeLostFocus';
import { recoverFailedImports } from '../../lib/lazyWithRetry';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** What to show instead of the children after an error. It gets the function that renders the children again. */
  fallback?: (retry: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  /** What the children threw: the retry hands it to recoverFailedImports to find out what failed. */
  error?: unknown;
}

interface ErrorPanelProps {
  onRetry: () => void;
  /** The panel fills the screen when it replaces the whole app, and a part of it inside the page. */
  isFullScreen?: boolean;
}

/** The default fallback: what happened, a retry button and a way to reach VN One without the page. */
export function ErrorPanel({ onRetry, isFullScreen = false }: ErrorPanelProps) {
  const { heading, body, retry, whatsapp, newTab, whatsappMessage } = shellCopy.errorBoundary;
  const headingRef = useTakeLostFocus<HTMLHeadingElement>();

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center bg-vn-cream px-6 py-24 text-center text-vn-ink',
        isFullScreen ? 'min-h-dvh' : 'min-h-[60dvh]',
      )}
    >
      <h2 ref={headingRef} tabIndex={-1} className="font-display text-3xl font-bold lowercase tracking-[-0.03em] text-balance">{heading}</h2>
      <p className="mt-4 max-w-md text-pretty text-base text-vn-gray-dark">{body}</p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Button type="button" size="lg" onClick={onRetry}>
          {retry}
        </Button>
        <Button asChild intent="secondary" size="lg">
          <a href={whatsappUrl(whatsappMessage)} target="_blank" rel="noopener noreferrer">
            {whatsapp}
            <span className="sr-only"> {newTab}</span>
          </a>
        </Button>
      </div>
    </div>
  );
}

/**
 * Catches what a child throws while it renders, and the rejection of a lazy chunk that Suspense rethrows, so one
 * failure never blanks the app. It shows `fallback` (the panel by default) until the visitor retries. A boundary that
 * must start clean on a navigation is given a `key` (SiteLayout keys its page transition by the path). Boundaries
 * nest: the closest one to the failure takes it. React itself reports the caught error to the console, so nothing is
 * swallowed.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  retry = (): void => {
    // A lazy page or section that failed to load imports again on the next render (or the page reloads: see there).
    if (recoverFailedImports(this.state.error) === 'reloading') return;
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return this.props.fallback ? this.props.fallback(this.retry) : <ErrorPanel onRetry={this.retry} />;
  }
}
