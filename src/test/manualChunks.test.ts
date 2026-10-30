// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { manualChunks, packageOf } from '../../config/manualChunks.mjs';

// The function form of manualChunks puts every module of a package in one chunk. The old object form only moved the
// entry module of each package, so react-dom and half of motion stayed in the main chunk (finding Q-01).

const modules = '/repo/node_modules';

describe('which package a module path belongs to', () => {
  it('reads plain, scoped and nested node_modules paths', () => {
    expect(packageOf(`${modules}/react-dom/cjs/react-dom-client.production.js`)).toBe('react-dom');
    expect(packageOf(`${modules}/@radix-ui/react-dialog/dist/index.mjs`)).toBe('@radix-ui/react-dialog');
    expect(packageOf(`${modules}/a/node_modules/b/index.js`)).toBe('b');
  });

  it('reads Windows separators', () => {
    expect(packageOf('C:\\repo\\node_modules\\framer-motion\\dist\\es\\index.mjs')).toBe('framer-motion');
  });

  it('returns null for the app own files', () => {
    expect(packageOf('/repo/src/main.tsx')).toBeNull();
  });
});

describe('the chunks', () => {
  it.each(['react', 'react-dom', 'scheduler', 'react-router', 'react-router-dom', 'cookie', 'set-cookie-parser'])(
    'puts %s, with everything react-router pulls in, in react-vendor',
    (name) => {
      expect(manualChunks(`${modules}/${name}/index.js`)).toBe('react-vendor');
    },
  );

  it.each(['motion', 'framer-motion', 'motion-dom', 'motion-utils'])('puts %s in motion-vendor', (name) => {
    expect(manualChunks(`${modules}/${name}/dist/es/index.mjs`)).toBe('motion-vendor');
  });

  it('puts every lucide icon in one icons chunk instead of a micro chunk per icon', () => {
    expect(manualChunks(`${modules}/lucide-react/dist/esm/icons/mail.js`)).toBe('icons');
    expect(manualChunks(`${modules}/lucide-react/dist/esm/createLucideIcon.js`)).toBe('icons');
  });

  it('leaves @radix-ui alone, so the dialog and the popover stay in the lazy chunks that use them', () => {
    expect(manualChunks(`${modules}/@radix-ui/react-dialog/dist/index.mjs`)).toBeUndefined();
    expect(manualChunks(`${modules}/@radix-ui/react-popover/dist/index.mjs`)).toBeUndefined();
    expect(manualChunks(`${modules}/react-remove-scroll/dist/es2015/index.js`)).toBeUndefined();
  });

  it('does not take a package that only starts with a listed name', () => {
    expect(manualChunks(`${modules}/react-helmet-async/lib/index.js`)).toBeUndefined();
    expect(manualChunks(`${modules}/motion-something-else/index.js`)).toBeUndefined();
  });

  it('leaves the app own code to Rollup', () => {
    expect(manualChunks('/repo/src/App.tsx')).toBeUndefined();
  });
});
