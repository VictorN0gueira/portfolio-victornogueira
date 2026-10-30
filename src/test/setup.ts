import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { IntersectionObserverMock } from './intersection';
import { createMediaQueryList } from './matchMedia';

const ASYNC_UTIL_TIMEOUT_MS = 5000;

class ResizeObserverMock implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

// A unit test never reaches a real server (the n8n webhooks above all). A test that needs fetch stubs it itself.
function rejectUnstubbedFetch(): Promise<never> {
  return Promise.reject(new Error('Unexpected network call in a unit test'));
}

function installDefaultMocks(): void {
  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  vi.stubGlobal('matchMedia', vi.fn((query: string) => createMediaQueryList(query)));
  vi.stubGlobal('fetch', vi.fn(rejectUnstubbedFetch));
}

// findBy and waitFor give up after five seconds instead of one: a busy machine is slower than the default.
configure({ asyncUtilTimeout: ASYNC_UTIL_TIMEOUT_MS });

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
