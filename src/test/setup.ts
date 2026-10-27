import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { IntersectionObserverMock } from './intersection';

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
