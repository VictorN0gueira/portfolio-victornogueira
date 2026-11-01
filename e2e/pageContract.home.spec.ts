import { homeCopy } from '../src/data/homeCopy';
import { describePageContract } from './pageContract';
import { test } from './n8nGuard';

// The home already meets the whole contract, so it is the reference that proves the helper: a failure here means the
// helper is wrong, not the home. The home mounts the real form, which the guard of ./n8nGuard keeps from the real n8n.
test.describe('page contract of the home', () => {
  describePageContract({
    path: '/',
    title: /Automação e IA para empresas/,
    h1: /sua equipe perde/i,
    readyHeading: homeCopy.faq.heading,
    hasContactForm: true,
    hasFloatingClearance: true,
  });
});
