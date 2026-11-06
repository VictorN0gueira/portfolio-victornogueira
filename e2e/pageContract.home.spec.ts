import { homeCopy } from '../src/data/homeCopy';
import { routeMetaFor } from '../src/seo/routeMeta';
import { describePageContract } from './pageContract';
import { test } from './n8nGuard';

const escapeForRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The title is whatever the route metadata says (src/seo), so a new title there never leaves this spec behind.
const HOME_TITLE = new RegExp(`^${escapeForRegExp(routeMetaFor('/')?.title ?? '')}$`);

// The home already meets the whole contract, so it is the reference that proves the helper: a failure here means the
// helper is wrong, not the home. The home mounts the real form, which the guard of ./n8nGuard keeps from the real n8n.
test.describe('page contract of the home', () => {
  describePageContract({
    path: '/',
    title: HOME_TITLE,
    h1: /sua equipe perde/i,
    readyHeading: homeCopy.faq.heading,
    hasContactForm: true,
    hasFloatingClearance: true,
  });
});
