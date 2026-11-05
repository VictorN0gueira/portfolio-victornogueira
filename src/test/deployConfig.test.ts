// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// No Docker daemon or GitHub runner is assumed where the tests run, so the Dockerfile, .dockerignore and the two
// workflows are checked as text: what once went wrong (npm install in the image, host node_modules copied over the
// container ones, unpinned base images and actions, a deploy that ran no tests) is pinned here.

const ROOT = resolve(__dirname, '../..');
const read = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');
const lines = (file: string) => read(file).split('\n');
const code = (file: string) => lines(file).filter((line) => !line.trim().startsWith('#') && line.trim() !== '');

describe('the Dockerfile', () => {
  const dockerfile = code('Dockerfile');
  const text = dockerfile.join('\n');

  it('pins both base images by digest, on Node 22 and nginx stable', () => {
    const images = dockerfile.filter((line) => line.startsWith('FROM '));
    expect(images).toHaveLength(2);
    expect(images[0]).toMatch(/^FROM node:22-alpine@sha256:[0-9a-f]{64} AS build$/);
    expect(images[1]).toMatch(/^FROM nginx:stable-alpine@sha256:[0-9a-f]{64}$/);
  });

  it('installs from the lockfile with npm ci, never npm install', () => {
    expect(text).toMatch(/^RUN npm ci$/m);
    expect(text).not.toMatch(/npm install/);
    expect(text).toMatch(/COPY package\.json package-lock\.json \.\//);
  });

  it('installs before it copies the sources, so the dependency layer is cached', () => {
    expect(text.indexOf('RUN npm ci')).toBeLessThan(text.indexOf('COPY . .'));
  });

  it('ships nginx.conf and the security headers snippet where nginx.conf includes it', () => {
    expect(text).toContain('COPY nginx.conf /etc/nginx/conf.d/default.conf');
    expect(text).toContain('COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf');
    expect(read('nginx.conf')).toContain('include /etc/nginx/snippets/security-headers.conf;');
  });

  it('has a health check on the page and exposes port 80', () => {
    expect(text).toMatch(/HEALTHCHECK[\s\S]*wget -q --spider http:\/\/127\.0\.0\.1\/index\.html/);
    expect(text).toContain('EXPOSE 80');
  });
});

describe('what the image tells its operator', () => {
  it('says in the README that it runs behind the TLS proxy, that HSTS is the proxy job and that a LAN test needs localhost', () => {
    const readme = read('README.md');
    expect(readme).toMatch(/atrás do proxy que termina o TLS/);
    expect(readme).toMatch(/HSTS/);
    expect(readme).toMatch(/localhost/);
    expect(readme.split('\n').length).toBeLessThanOrEqual(60);
  });

  it('says in the Dockerfile why the master runs as root and why the policy upgrades requests', () => {
    const dockerfile = read('Dockerfile');
    expect(dockerfile).toMatch(/master process runs as root/);
    expect(dockerfile).toMatch(/upgrade-insecure-requests/);
  });
});

describe('.dockerignore', () => {
  const entries = new Set(code('.dockerignore'));

  it.each(['node_modules', 'dist', 'coverage', 'test-results', 'playwright-report', '.git', '.superpowers', 'e2e', 'docs', '/*.png', '.env*'])(
    'keeps %s out of the build context',
    (entry) => {
      expect(entries.has(entry)).toBe(true);
    },
  );

  it('does not drop what the build needs', () => {
    for (const needed of ['src', 'public', 'config', 'nginx', 'scripts', 'index.html', 'package.json', 'vite.config.ts']) {
      expect(entries.has(needed), needed).toBe(false);
    }
  });
});

describe('the workflows', () => {
  const files = ['.github/workflows/ci.yml', '.github/workflows/deploy.yml'];

  it.each(files)('%s pins every action by commit SHA', (file) => {
    const uses = code(file).filter((line) => /^\s*-?\s*uses:/.test(line) && !line.includes('./.github/'));
    expect(uses.length).toBeGreaterThan(0);
    // The comment names the real release (v7.0.1), not a moving major tag, so a reader can tell what the SHA is.
    for (const line of uses) expect(line, line).toMatch(/uses: [\w.-]+\/[\w.-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/);
  });

  it('keeps the actions current through dependabot', () => {
    const text = read('.github/dependabot.yml');
    expect(text).toMatch(/package-ecosystem: github-actions/);
    expect(text).toMatch(/package-ecosystem: npm/);
  });

  it.each(files)('%s runs on Node 22 and installs with npm ci', (file) => {
    const text = read(file);
    if (text.includes('setup-node')) expect(text).toMatch(/node-version: 22/);
    expect(text).not.toMatch(/npm install/);
    expect(text).not.toMatch(/node-version: 20/);
  });

  it('ci runs the type check, the unit tests, the build, the budget and the end to end specs, in that order', () => {
    const text = read('.github/workflows/ci.yml');
    const order = ['npm ci', 'npm run lint', 'npm test', 'npm run build', 'npm run budget', 'npm run e2e'].map((command) => text.indexOf(`run: ${command}`));
    expect(order.every((index) => index > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('ci builds the image, checks the nginx configuration in it and smoke tests the running container', () => {
    const text = read('.github/workflows/ci.yml');
    const order = ['docker build -t vnone:ci .', 'docker run --rm vnone:ci nginx -t', 'docker run -d --name vnone -p 8080:80 vnone:ci', 'node scripts/smoke-container.mjs http://localhost:8080'].map(
      (command) => text.indexOf(`run: ${command}`),
    );
    expect(order.every((index) => index > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(text).toMatch(/if: always\(\)\n\s+run: docker rm -f vnone/);
  });

  it('ci runs on pull requests and can be called by the deploy', () => {
    const text = read('.github/workflows/ci.yml');
    expect(text).toMatch(/pull_request:/);
    expect(text).toMatch(/workflow_call:/);
    // A pushed branch with an open pull request must not run the whole suite twice: push only for main and the
    // integration branches. main is there because the Pages deploy is manual and no longer calls ci on every push.
    expect(text).toMatch(/push:\n\s+branches: \["main", "redesign\/\*\*"\]/);
    expect(text).not.toMatch(/branches-ignore/);
    expect(text).toMatch(/permissions:\n {2}contents: read/);
  });

  it('the Pages copy runs only by hand, so a merge to main never fails on a repository without Pages', () => {
    const text = read('.github/workflows/deploy.yml');
    expect(text).toMatch(/\non:\n\s+workflow_dispatch:/);
    expect(text).not.toMatch(/\n\s+push:/);
    expect(text).not.toMatch(/\n\s+pull_request:/);
  });

  it('deploy waits for ci, builds for Pages, copies index.html to 404.html and holds the Pages permissions', () => {
    const text = read('.github/workflows/deploy.yml');
    expect(text).toMatch(/ci:\n(?:.*\n)*?\s+uses: \.\/\.github\/workflows\/ci\.yml/);
    expect(text).toMatch(/deploy:\n\s+needs: ci/);
    expect(text).toContain("GITHUB_PAGES: 'true'");
    expect(text).toContain('cp dist/index.html dist/404.html');
    expect(text.indexOf('npm run build')).toBeLessThan(text.indexOf('cp dist/index.html dist/404.html'));
    expect(text).toMatch(/pages: write/);
  });

  it('puts no secret in the build: the GNews key is gone from both workflows', () => {
    for (const file of files) expect(read(file)).not.toMatch(/secrets\./);
  });
});

describe('the Dependabot automation', () => {
  const dependabot = read('.github/dependabot.yml');
  const workflow = read('.github/workflows/ci.yml');
  const jobStart = workflow.indexOf('\n  dependabot-merge:\n');
  // The job is the last one in the file: its block runs to the end.
  const job = workflow.slice(jobStart);

  it('groups the minor and patch updates of npm and of the actions, and never groups a major', () => {
    expect(dependabot.match(/update-types: \["minor", "patch"\]/g)).toHaveLength(4);
    expect(code('.github/dependabot.yml').join('\n')).not.toMatch(/major/);
    for (const group of ['github-actions', 'react', 'production-dependencies', 'development-dependencies']) {
      expect(dependabot, group).toMatch(new RegExp(`\\n {6}${group}:\\n`));
    }
    expect(dependabot.match(/interval: weekly/g)).toHaveLength(2);
  });

  it('moves react and react-dom together, in a group of their own that comes before the others', () => {
    expect(dependabot).toMatch(/\n {6}react:\n\s+patterns: \["react", "react-dom"\]/);
    expect(dependabot.indexOf('      react:')).toBeLessThan(dependabot.indexOf('production-dependencies:'));
  });

  it('waits out a cooldown before proposing a release, for both ecosystems', () => {
    expect(dependabot.match(/cooldown:\n\s+default-days: 7/g)).toHaveLength(2);
  });

  it('adds one job, the last, that runs only for pull requests Dependabot opened', () => {
    expect(jobStart).toBeGreaterThan(-1);
    expect(workflow.match(/\n {2}dependabot-merge:\n/g)).toHaveLength(1);
    expect(job).toMatch(/\n {4}if: github\.event_name == 'pull_request' && github\.actor == 'dependabot\[bot\]'\n/);
    // No other job key (two spaces of indent) after it.
    expect(job.slice(1)).not.toMatch(/\n {2}(?!dependabot-merge)[\w-]+:\n/);
  });

  it('waits for verify and image, so a failed check means no merge', () => {
    expect(job).toMatch(/\n {4}needs: \[verify, image\]\n/);
  });

  it('holds the write permissions on that job alone: the workflow default stays read only', () => {
    expect(job).toMatch(/\n {4}permissions:\n {6}contents: write\n {6}pull-requests: write\n/);
    expect(workflow.slice(0, workflow.indexOf('\njobs:\n'))).toMatch(/permissions:\n {2}contents: read\n/);
    expect(workflow.match(/permissions:/g)).toHaveLength(2);
    expect(workflow.match(/: write/g)).toHaveLength(2);
  });

  it('uses only the default token and pins the one action it adds by commit SHA', () => {
    expect(workflow).not.toMatch(/secrets\./);
    expect(job).toMatch(/GH_TOKEN: \$\{\{ github\.token \}\}/);
    expect(job).toMatch(/uses: dependabot\/fetch-metadata@[0-9a-f]{40} # v\d+\.\d+\.\d+\n/);
    expect(job).not.toMatch(/actions\/checkout/);
  });

  it('merges only a patch or a minor update, squashed, and only the commit CI checked', () => {
    const allCode = code('.github/workflows/ci.yml').join('\n');
    const jobCode = allCode.slice(allCode.indexOf('dependabot-merge:'));
    expect(job).toMatch(
      /if: steps\.metadata\.outputs\.update-type == 'version-update:semver-patch' \|\| steps\.metadata\.outputs\.update-type == 'version-update:semver-minor'\n/,
    );
    expect(jobCode.match(/gh pr merge/g)).toHaveLength(1);
    expect(jobCode).toContain('gh pr merge --squash --match-head-commit "$HEAD_SHA" "$PR_URL"');
  });

  it('leaves a major update open', () => {
    const majorStep = job.slice(job.indexOf("update-type == 'version-update:semver-major'"));
    expect(majorStep).not.toMatch(/gh pr merge/);
    expect(majorStep).toMatch(/never merged by itself/);
  });

  it('passes the metadata through env, never through the script text', () => {
    const script = job.slice(job.indexOf('run: |'), job.indexOf('- name: Leave a major update'));
    expect(script).not.toMatch(/\$\{\{/);
  });
});
