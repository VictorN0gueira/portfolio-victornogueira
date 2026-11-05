// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { faqs } from '../data/faqs';
import { processSteps } from '../data/process';

const ROOT = resolve(__dirname, '../..');
const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const DASH_PATTERN = new RegExp(`[${EM_DASH}${EN_DASH}]`);

// A placeholder (`${width}`) next to a slash is arithmetic or CSS, not text: it stays in the line as this marker, so
// `${width} / ${height}` is told apart from "A / B".
const PLACEHOLDER_MARK = String.fromCharCode(0xe000);
const NBSP = String.fromCharCode(0xa0);
const SEPARATOR = `(?<!${PLACEHOLDER_MARK})[ ${NBSP}]\\/[ ${NBSP}](?!${PLACEHOLDER_MARK})`;
// A string literal that uses " / " as a separator, for example 'Landing Page / Site'. The spaces around the slash
// can be plain or non breaking.
const SLASH_SEPARATOR_PATTERN = new RegExp(`['"\`][^'"\`]*${SEPARATOR}[^'"\`]*['"\`]`);
// The same separator in a template literal that goes over several lines: the line by line rule cannot see it.
// (Text between two backticks that holds code, with ; { or }, is a pair of backticks that got out of step: skipped.)
const SLASH_TEMPLATE_PATTERN = new RegExp(`\`[^\`;{}]*${SEPARATOR}[^\`;{}]*\``);
// The same separator in JSX text between tags or after an expression, for example <p>{count} Landing / Site</p>.
const SLASH_JSX_TEXT_PATTERN = new RegExp(`[>}][^<>{}]*${SEPARATOR}[^<>{}]*<`);

// Sales and AI flavored wording the owner banned: nothing here promises a result or sells with an adjective.
// ("transform" alone would also catch the CSS property, so only the verb forms are listed.)
const SALES_WORDS_PATTERN = new RegExp(
  [
    'revolucion',
    'potencializ',
    'desbloque',
    'jornada',
    'inova(dor|ç)',
    '\\btransforma(r|ndo|ção|ções|m)?\\b',
    'alavanc',
    'alavanq',
    'ecossistema',
    'sinergia',
    'cutting[- ]edge',
    'alta[\\s\\u00a0]+(convers|performance)',
    'de[\\s\\u00a0]+ponta',
    'orquestra',
    'disruptiv',
    'game-changer',
    '\\bescal(ar|e|am|ável|áveis|ando)\\b',
    'robust',
    'performátic',
    'modern[ao]s?\\b',
  ].join('|'),
  'i',
);
// The formal imperative ("Veja", "Escolha") has no place next to the informal one ("Mexe", "Conta", "Escolhe") the
// site speaks in.
// (\b does not know accented letters, so "conteúdo" would read as "conte": the edges are letter lookarounds.)
// A list of verbs is a net, not a proof: it holds the ones a sales page reaches for first. A new one goes in when seen.
const FORMAL_IMPERATIVE_PATTERN =
  /(?<!\p{L})(veja|comece|escolha|selecione|conte|clique|confira|mexa|fale|chame|descubra|calcule|solicite|conheça|preencha|peça|agende|informe|acesse|saiba|digite|marque|impulsione|aproveite|garanta|aumente|reduza|otimize|potencialize|melhore|experimente|baixe|assista|simule|cadastre|registre|envie|ligue)(?!\p{L})/iu;
// "A gente" is the voice: no first person plural verb and no "nós". Every verb in -amos (Falamos, Criamos, Estamos),
// plus the -emos and -imos ones a site is likely to use (Fazemos, Temos, Somos, Podemos, Queremos, Sentimos...). Not
// every word in -imos or -emos is a verb ("máximos", "extremos"), which is why those are listed one by one.
const FIRST_PERSON_PLURAL_PATTERN = new RegExp(
  `(?<!\\p{L})(\\p{L}{2,}amos|${[
    'fazemos',
    'fizemos',
    'temos',
    'somos',
    'podemos',
    'queremos',
    'sentimos',
    'devemos',
    'sabemos',
    'dizemos',
    'trazemos',
    'vemos',
    'oferecemos',
    'conhecemos',
    'escolhemos',
    'decidimos',
    'construímos',
    'resolvemos',
    'garantimos',
    'atendemos',
    'recebemos',
    'escrevemos',
    'partimos',
    'servimos',
  ].join('|')}|nós)(?!\\p{L})`,
  'iu',
);
// The first person singular is the founder's voice: it belongs on the pages that are Victor's own (see
// VOICE_OWNER_DECISION), and nowhere else. Only the verbs and pronouns of the site speaking are listed: "meu", "minha"
// and "tenho" also open the visitor's own words ("Meu negócio é pequeno demais?", the WhatsApp messages the visitor
// sends), and those are fine.
const FIRST_PERSON_SINGULAR_PATTERN =
  /(?<!\p{L})(estou|respondo|eu|sou|entrego|faço|construo|desenvolvo|mim|minhas)(?!\p{L})|como trabalho|que uso/iu;
// VN One sells AI agents, not chatbots: the word is in no scanned file, the contact form dropdown included.
const CHATBOT_PATTERN = /chat[\s-]?bot/i;
// Voice rule for "pra" and "para": "pra" in short UI lines (buttons, hints, one line sentences), "para" in long
// answers. The long ones are the FAQ answers and the process step descriptions, and a test below enforces them.
const SHORT_FORM_PATTERN = /\bpra\b/i;

const SCANNED_DIRECTORIES = [
  'src/data',
  'src/sections',
  'src/components/ui',
  'src/components/layout',
  'src/components/contact',
  'src/hooks',
  'src/lib',
  // Every page, the ones plan 3 adds included. The two legal pages are the only exception (FROZEN_LEGAL_PAGES).
  'src/pages',
];
// The text of these two pages is the audited legal text and not one character changes without the owner's ok
// (src/test/frozenFiles.test.ts holds their hash), so the copy rules do not read them.
const FROZEN_LEGAL_PAGES = new Set(['src/pages/PrivacyPage.tsx', 'src/pages/LgpdPage.tsx']);
const SCANNED_FILES = [
  'index.html',
  'src/components/SEO.tsx',
  'src/components/ContactForm.tsx',
  // Older files that still carry user facing text.
  'src/components/ProjectCard.tsx',
  'src/components/ProjectDetail.tsx',
  'src/components/Projects.tsx',
  'src/components/NotFound.tsx',
  'src/components/FeaturedProjectCard.tsx',
  'src/components/ProjectDetailGallery.tsx',
  'src/components/ProjectShotImage.tsx',
  'src/components/ProjectTitle.tsx',
  // The fixed list the blog shows when no source answers: its strings are site copy too.
  'src/utils/newsService.ts',
];
// projects.ts is rebuilt with the projects page (plan 3), so its claims are not scanned for sales wording yet.
// testimonials.ts holds the clients' own words, verbatim: they are not ours to edit.
const SALES_WORDS_EXEMPT = new Set(['src/data/projects.ts', 'src/data/testimonials.ts']);
// Files allowed to keep a formal imperative until their owner rewrites the text. Empty since the merge of the batches:
// the contact form, the blog and the shell copy were all put in the informal imperative.
const FORMAL_IMPERATIVE_HANDOFF = new Set<string>([]);
// Clients' words stay as they said them.
const VOICE_EXEMPT = new Set(['src/data/testimonials.ts']);
// Files allowed to keep a first person plural verb until their owner rewrites the text. Empty since the merge of the
// batches: the integrations line, the thanks title and the cooldown message all say "a gente".
const FIRST_PERSON_HANDOFF = new Set<string>([]);
// "Sobre mim" and "Minhas Especialidades" (src/sections/about/founderVoice.ts) are the founder's own words, kept verbatim
// from the text the owner approved. The first person singular is allowed on that file, and only there.
// (The meta description of AboutPage.tsx says "a gente" now, so that page is held to the voice rule like the others.)
const VOICE_OWNER_DECISION = new Set(['src/sections/about/founderVoice.ts']);
const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json']);
const TEST_FILE_PATTERN = /\.test\.[^.]+$/;

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot);
}

// Directories that do not exist yet (sections, layout) are skipped without failing.
function collectFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory).flatMap((name) => {
    const fullPath = join(directory, name);
    if (statSync(fullPath).isDirectory()) return collectFiles(fullPath);
    if (TEST_FILE_PATTERN.test(name) || !SCANNED_EXTENSIONS.has(extensionOf(name))) return [];
    return [fullPath];
  });
}

function toPosix(path: string): string {
  return relative(ROOT, path).split('\\').join('/');
}

const scannedFiles = [
  ...SCANNED_DIRECTORIES.flatMap((directory) => collectFiles(resolve(ROOT, directory))),
  ...SCANNED_FILES.map((file) => resolve(ROOT, file)).filter((file) => existsSync(file)),
].filter((file) => !FROZEN_LEGAL_PAGES.has(toPosix(file)));

// A CSS function with a division (calc, max, min, clamp) is arithmetic, not text: its slash is masked like a placeholder.
const CSS_MATH_SLASH = /(\b(?:calc|max|min|clamp)\([^;'"`]*?)[ \u00A0]\/[ \u00A0]/g;

function withoutPlaceholders(text: string): string {
  return text.replace(/\$\{[^}]*\}/g, PLACEHOLDER_MARK).replace(CSS_MATH_SLASH, `$1${PLACEHOLDER_MARK}/${PLACEHOLDER_MARK}`);
}

// A line that is only a comment is not text the visitor reads.
function withoutCommentLine(line: string): string {
  return /^\s*(\/\/|\/\*|\*)/.test(line) ? '' : line;
}

function findOffendingLines(
  files: string[],
  pattern: RegExp,
  prepare: (line: string) => string = (line) => line,
): string[] {
  return files.flatMap((file) =>
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .flatMap((line, index) =>
        pattern.test(prepare(line)) ? [`${toPosix(file)}:${index + 1}  ${line.trim()}`] : [],
      ),
  );
}

// JSX text and template literals are whole-file work: a separator can sit on its own line.
// Comments are cut first: a backtick in a comment would pair with the next one and read the code between as text.
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

function findWholeFileMatches(files: string[], pattern: RegExp): string[] {
  return files.flatMap((file) => {
    const match = pattern.exec(withoutPlaceholders(withoutComments(readFileSync(file, 'utf8'))));
    return match ? [`${toPosix(file)}  ${match[0].trim().replace(/\s+/g, ' ')}`] : [];
  });
}

describe('copy rules', () => {
  it('scans the files it is supposed to guard', () => {
    const scanned = scannedFiles.map(toPosix);

    expect(scanned).toContain('index.html');
    expect(scanned).toContain('src/components/SEO.tsx');
    expect(scanned).toContain('src/data/services.ts');
    expect(scanned).toContain('src/lib/constants.ts');
    expect(scanned).toContain('src/pages/HomePage.tsx');
    expect(scanned).toContain('src/components/ContactForm.tsx');
    // The pages are scanned as a directory, so the ones the next batches rebuild are covered the moment they change.
    for (const page of ['ServicesPage', 'AboutPage', 'ContactPage', 'ProjectsPage', 'ProjectDetailPage']) {
      expect(scanned, `src/pages/${page}.tsx`).toContain(`src/pages/${page}.tsx`);
    }
    expect(scanned.some((file) => file.startsWith('src/components/contact/'))).toBe(true);
    // The two legal pages are the audited text and are left out on purpose.
    expect(scanned).not.toContain('src/pages/PrivacyPage.tsx');
    expect(scanned).not.toContain('src/pages/LgpdPage.tsx');
    expect(FROZEN_LEGAL_PAGES.size).toBe(2);
    // Directories that exist today must really be walked, not silently skipped.
    expect(scanned.some((file) => file.startsWith('src/hooks/'))).toBe(true);
    expect(scanned.some((file) => file.startsWith('src/components/ui/'))).toBe(true);
  });

  it('never scans test files', () => {
    expect(scannedFiles.filter((file) => TEST_FILE_PATTERN.test(file))).toEqual([]);
  });

  it('has no em dash or en dash in any scanned file', () => {
    expect(findOffendingLines(scannedFiles, DASH_PATTERN)).toEqual([]);
  });

  it('has no " / " separator inside a string literal in any scanned file', () => {
    const prepare = (line: string) => withoutPlaceholders(line);

    expect(findOffendingLines(scannedFiles, SLASH_SEPARATOR_PATTERN, prepare)).toEqual([]);
  });

  it('has no " / " separator in a template literal over several lines', () => {
    expect(findWholeFileMatches(scannedFiles, SLASH_TEMPLATE_PATTERN)).toEqual([]);
  });

  it('has no " / " separator in JSX text, on one line, across lines or after an expression', () => {
    expect(findWholeFileMatches(scannedFiles, SLASH_JSX_TEXT_PATTERN)).toEqual([]);
  });

  it('has no sales wording in any scanned file', () => {
    const files = scannedFiles.filter((file) => !SALES_WORDS_EXEMPT.has(toPosix(file)));

    expect(findOffendingLines(files, SALES_WORDS_PATTERN)).toEqual([]);
  });

  it('speaks in the informal imperative: no "Veja", "Descubra", "Calcule" and the like in any scanned file', () => {
    const files = scannedFiles.filter(
      (file) => !VOICE_EXEMPT.has(toPosix(file)) && !FORMAL_IMPERATIVE_HANDOFF.has(toPosix(file)),
    );

    expect(findOffendingLines(files, FORMAL_IMPERATIVE_PATTERN, withoutCommentLine)).toEqual([]);
  });

  it('speaks as "a gente": no "nós" and no verb in the first person plural in any scanned file', () => {
    const files = scannedFiles.filter(
      (file) => !VOICE_EXEMPT.has(toPosix(file)) && !FIRST_PERSON_HANDOFF.has(toPosix(file)),
    );

    expect(findOffendingLines(files, FIRST_PERSON_PLURAL_PATTERN, withoutCommentLine)).toEqual([]);
  });

  it('speaks in the "a gente" voice, not the first person singular, outside the pages that are the founder\'s own', () => {
    const files = scannedFiles.filter(
      (file) => !VOICE_EXEMPT.has(toPosix(file)) && !VOICE_OWNER_DECISION.has(toPosix(file)),
    );

    expect(findOffendingLines(files, FIRST_PERSON_SINGULAR_PATTERN, withoutCommentLine)).toEqual([]);
  });

  it('never says "chatbot" in any scanned file', () => {
    expect(findOffendingLines(scannedFiles, CHATBOT_PATTERN, withoutCommentLine)).toEqual([]);
  });

  it.each([...FORMAL_IMPERATIVE_HANDOFF])(
    'still finds a formal imperative in %s: if it is gone, remove the file from FORMAL_IMPERATIVE_HANDOFF',
    (file) => {
      const found = findOffendingLines([resolve(ROOT, file)], FORMAL_IMPERATIVE_PATTERN, withoutCommentLine);

      expect(found.length, `${file} no longer has a formal imperative: remove it from FORMAL_IMPERATIVE_HANDOFF`).toBeGreaterThan(0);
    },
  );

  it.each([...FIRST_PERSON_HANDOFF])(
    'still finds a first person plural verb in %s: if it is gone, remove the file from FIRST_PERSON_HANDOFF',
    (file) => {
      const found = findOffendingLines([resolve(ROOT, file)], FIRST_PERSON_PLURAL_PATTERN, withoutCommentLine);

      expect(found.length, `${file} no longer has a first person plural verb: remove it from FIRST_PERSON_HANDOFF`).toBeGreaterThan(0);
    },
  );

  it.each([...VOICE_OWNER_DECISION])(
    'still has the founder voice in %s: if it is gone, remove the file from VOICE_OWNER_DECISION',
    (file) => {
      const found = findOffendingLines([resolve(ROOT, file)], FIRST_PERSON_SINGULAR_PATTERN, withoutCommentLine);

      expect(found.length, `${file} no longer has the first person singular: remove it from VOICE_OWNER_DECISION`).toBeGreaterThan(0);
    },
  );

  it('writes "para", not "pra", in the long answers: the FAQ and the process steps', () => {
    const longTexts = [...faqs.map((faq) => faq.answer), ...processSteps.map((step) => step.description)];

    expect(longTexts.filter((text) => SHORT_FORM_PATTERN.test(text))).toEqual([]);
  });
});

// The fixed list of the blog (FALLBACK_ARTICLES) speaks for the site when no source answers, so it cannot carry a number
// or a study the site never measured, nor an item from a publisher whose name has the banned word.
function fallbackBlock(): string {
  const source = readFileSync(resolve(ROOT, 'src/utils/newsService.ts'), 'utf8');
  const start = source.indexOf('const FALLBACK_ARTICLES');
  const end = source.indexOf('];', start);
  return source.slice(start, end);
}

describe('blog fallback articles', () => {
  it('has no "chatbot", no number followed by a percent sign, no dash and no study claim', () => {
    const block = fallbackBlock();

    expect(block.length).toBeGreaterThan(0);
    expect(block).not.toMatch(CHATBOT_PATTERN);
    expect(block).not.toMatch(/\d\s*%/);
    expect(block).not.toMatch(DASH_PATTERN);
    expect(block).not.toMatch(/estudo|pesquisa revela|revela que|study|survey/i);
  });

  it('keeps at least four articles', () => {
    expect((fallbackBlock().match(/title:/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });
});

// The rules above are only worth something if they catch what they are meant to catch: these cases are the
// mutations the closure reviews injected into the scanned files, now run against the patterns.
describe('copy rule patterns', () => {
  it('catches every banned sales or AI word, in any case, form and inside a longer word', () => {
    const words = [
      'revolucionária',
      'potencialize',
      'desbloqueie',
      'jornada',
      'soluções inovadoras',
      'transformar',
      'transformando',
      'transformação',
      'transforma',
      'alavanque',
      'ecossistema',
      'sinergia',
      'cutting-edge',
      'cutting edge',
      'alta conversão',
      `alta${NBSP}conversão`,
      'alta  conversão',
      'de ponta',
      'orquestrado',
      'orquestração',
      'game-changer',
      'escalar',
      'escale',
      'escalam',
      'escalável',
      'escalando',
      'robustos',
      'performáticas',
      'modernas',
    ];

    expect(words.filter((word) => !SALES_WORDS_PATTERN.test(word))).toEqual([]);
  });

  it('lets ordinary words and code through', () => {
    const fine = [
      'A gente automatiza o trabalho repetitivo e conecta as ferramentas.',
      'transform: translateY(0)',
      'will-change-transform',
      'a escala do mapa',
      'cada etapa tem dono e prazo',
    ];

    expect(fine.filter((text) => SALES_WORDS_PATTERN.test(text))).toEqual([]);
    expect(SHORT_FORM_PATTERN.test('Entregamos para você validar.')).toBe(false);
    expect(SHORT_FORM_PATTERN.test('Dá pra recuperar.')).toBe(true);
  });

  it('catches the formal imperative in any case and lets the informal one through', () => {
    for (const text of ['e veja quanto', 'Descubra o custo', 'Solicite uma consulta', 'Calcule o impacto']) {
      expect(FORMAL_IMPERATIVE_PATTERN.test(text), text).toBe(true);
    }
    for (const text of ['Mexe nos valores e vê quanto', 'Conta como funciona hoje', 'Escolhe um serviço']) {
      expect(FORMAL_IMPERATIVE_PATTERN.test(text), text).toBe(false);
    }
  });

  it('catches the first person plural in -amos, -emos and -imos, short stems included', () => {
    const caught = [
      'Colocamos no ar',
      'entregamos',
      'Calculamos com no máximo',
      'depender de nós',
      'Falamos com você',
      'Criamos o fluxo',
      'Usamos o n8n',
      'Estamos aqui',
      'Fazemos o diagnóstico',
      'Fizemos isso',
      'Temos tudo',
      'Somos uma equipe',
      'Podemos ajudar',
      'Queremos entender',
      'Sentimos a diferença',
      'Conhecemos o seu processo',
      'Construímos o sistema',
    ];

    expect(caught.filter((text) => !FIRST_PERSON_PLURAL_PATTERN.test(text))).toEqual([]);
  });

  it('lets "a gente", "vamos" and words that only look like a verb through', () => {
    const fine = [
      'A gente coloca no ar',
      'Vamos conversar',
      'sem depender de ninguém',
      'valores máximos e mínimos',
      'os próximos passos',
      'resultados ótimos',
      'os últimos meses',
      'Tecnologia, exemplos e ramos de atuação',
      'Pular para o conteúdo',
    ];

    expect(fine.filter((text) => FIRST_PERSON_PLURAL_PATTERN.test(text))).toEqual([]);
  });

  it('catches the site speaking in the first person singular', () => {
    const caught = [
      'Estou sempre aberto',
      'Respondo em até 24 horas',
      'O que eu entrego',
      'Sobre mim',
      'Minhas Especialidades',
      'como trabalho e a stack que uso',
      'Faço o diagnóstico',
      'Sou especialista em automação',
    ];

    expect(caught.filter((text) => !FIRST_PERSON_SINGULAR_PATTERN.test(text))).toEqual([]);
  });

  it('lets the second person, the noun "trabalho" and the visitor\'s own words through', () => {
    const fine = [
      'O trabalho repetitivo vai para os fluxos',
      'Você conhece o negócio',
      'A gente entrega',
      'Conta como funciona hoje',
      'Meu negócio é pequeno demais para automação?',
      'Olá! Tenho uma dúvida sobre automação.',
      'Olá! Quero automatizar um processo da minha empresa.',
      'autorizo o uso dos meus dados',
      'Serviços estáveis e infraestrutura para crescer com o uso.',
    ];

    expect(fine.filter((text) => FIRST_PERSON_SINGULAR_PATTERN.test(text))).toEqual([]);
  });

  it('catches the formal verbs a sales page reaches for, and lets the infinitive and the informal form through', () => {
    for (const text of ['Marque uma conversa', 'Impulsione o seu negócio', 'Aproveite agora', 'Experimente grátis', 'Envie uma mensagem']) {
      expect(FORMAL_IMPERATIVE_PATTERN.test(text), text).toBe(true);
    }
    for (const text of ['Marcar uma conversa', 'Falar no WhatsApp', 'Quero automatizar', 'Ver todos os serviços', 'Marca uma conversa', 'Envia uma mensagem']) {
      expect(FORMAL_IMPERATIVE_PATTERN.test(text), text).toBe(false);
    }
  });

  it('catches "chatbot" in any spelling', () => {
    for (const text of ['Chatbot responde', 'um chat bot', 'chat-bot', 'CHATBOTS com IA']) {
      expect(CHATBOT_PATTERN.test(text), text).toBe(true);
    }
    expect(CHATBOT_PATTERN.test('Um agente de IA que atende no WhatsApp')).toBe(false);
  });

  it('catches a " / " separator in a string, in JSX text and after an expression, not arithmetic', () => {
    expect(SLASH_SEPARATOR_PATTERN.test("const label = 'Landing / Site';")).toBe(true);
    expect(SLASH_SEPARATOR_PATTERN.test(`const label = 'Landing${NBSP}/${NBSP}Site';`)).toBe(true);
    expect(SLASH_JSX_TEXT_PATTERN.test('<p className="x">Foco total A / B</p>')).toBe(true);
    expect(SLASH_JSX_TEXT_PATTERN.test('<p>\n  Foco total A / B\n</p>')).toBe(true);
    expect(SLASH_JSX_TEXT_PATTERN.test('<p>{count} A / B</p>')).toBe(true);
    expect(SLASH_JSX_TEXT_PATTERN.test(`<p>A${NBSP}/${NBSP}B</p>`)).toBe(true);
    expect(SLASH_JSX_TEXT_PATTERN.test('<p>Atendimento e vendas</p>')).toBe(false);
  });

  it('catches a separator on the second line of a template literal', () => {
    expect(SLASH_TEMPLATE_PATTERN.test('const text = `Primeira linha\nSegunda A / B`;')).toBe(true);
    expect(SLASH_TEMPLATE_PATTERN.test('const text = `Primeira linha\nSegunda linha`;')).toBe(false);
  });

  it('does not take a template placeholder for a separator', () => {
    const ratio = withoutPlaceholders('`${width} / ${height}`');

    expect(SLASH_SEPARATOR_PATTERN.test(ratio)).toBe(false);
    expect(SLASH_TEMPLATE_PATTERN.test(ratio)).toBe(false);
    expect(SLASH_SEPARATOR_PATTERN.test(withoutPlaceholders('`${a / b} por mês`'))).toBe(false);
  });
});
