import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { IntersectionObserverMock } from './intersection';

// The time trap and the cooldown of the contact form (see botGuard.ts) would hold back every test that fills the form
// and submits at once, so they are off in all tests; the honeypot stays on. The tests of the guard itself take the
// real module back with: vi.mock('./botGuard', async (importOriginal) => importOriginal());
vi.mock('../components/contact/botGuard', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../components/contact/botGuard')>()),
  judgeSubmit: (honeypot: string) => (honeypot === '' ? 'send' : 'bot'),
}));

class ResizeObserverMock implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

function createMatchMediaMock(query: string): MediaQueryList {
  return {
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  };
}

function installDefaultMocks(): void {
  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  vi.stubGlobal('matchMedia', vi.fn(createMatchMediaMock));
}

// Installed at import time and after every test, so import-time code and any beforeAll (also one scoped
// to a later describe) see the defaults, and again before every test so a direct assignment never leaks.
// Per-test overrides belong inside the test or beforeEach: a beforeAll stub is replaced by the next beforeEach.
installDefaultMocks();
beforeEach(installDefaultMocks);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  installDefaultMocks();
});
