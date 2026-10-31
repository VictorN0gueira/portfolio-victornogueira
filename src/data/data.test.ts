import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CONTACT_EMAIL,
  SOCIAL_LINKS,
  WHATSAPP_DISPLAY,
  WHATSAPP_FALLBACK_URL,
  WHATSAPP_NUMBER,
  whatsappUrl,
} from '../lib/constants';
import { brandIcons } from './brandIcons';
import { flowPanel, heroFlows, heroTasks } from './heroFlows';
import { homeCopy } from './homeCopy';
import { integrations } from './integrations';
import { MAIN_NAV, PRIMARY_CTA } from './navigation';
import { partners } from './partners';
import { processSteps } from './process';
import { getProjectBySlug, projects } from './projects';
import { faqs } from './faqs';
import { combos, serviceOptions, services } from './services';
import { stats } from './stats';
import { testimonials } from './testimonials';
import { useCases } from './useCases';

// Sales wording that must stay out of the data copy.
const BANNED_SALES_WORDS = /orquestrad|moderna|inteligente/i;

describe('stats', () => {
  it('has the four headline numbers in order', () => {
    expect(stats).toHaveLength(4);
    expect(stats.map((stat) => stat.value)).toEqual(['500h+', '100+', '10+', '85%']);
  });

  it('gives every stat a label and a description', () => {
    for (const stat of stats) {
      expect(stat.label.length).toBeGreaterThan(0);
      expect(stat.description.length).toBeGreaterThan(0);
    }
  });

  it('does not promise uptime: no "24 horas" in any stat', () => {
    expect(stats.flatMap((stat) => [stat.label, stat.description]).join(' ')).not.toMatch(/24 horas/);
  });

  it('keeps sales wording out of every stat label and description', () => {
    const copy = stats.flatMap((stat) => [stat.label, stat.description]).join(' ');

    expect(copy).not.toMatch(BANNED_SALES_WORDS);
  });

  it('gives every stat a label and a description without a slash', () => {
    for (const stat of stats) {
      expect(stat.label.length).toBeGreaterThan(0);
      expect(stat.description.length).toBeGreaterThan(0);
      expect(`${stat.label} ${stat.description}`).not.toContain('/');
    }
  });
});

describe('processSteps', () => {
  it('has four numbered steps', () => {
    expect(processSteps).toHaveLength(4);
    expect(processSteps.map((step) => step.number)).toEqual(['01', '02', '03', '04']);
  });

  it('gives every step a title, a duration and a description', () => {
    for (const step of processSteps) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.duration.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  it('spells the units out and keeps the jargon and the "nós" voice out of the steps', () => {
    const copy = processSteps.flatMap((step) => [step.duration, step.description]).join(' ');

    expect(processSteps[0].duration).toBe('uma reunião de 30 minutos');
    expect(copy).not.toMatch(/sprint|\b\d+ ?min\b|Desenhamos/i);
    expect(processSteps[2].duration).toBe('ciclos semanais');
  });

  it('writes "para" in the long step descriptions', () => {
    expect(processSteps.map((step) => step.description).join(' ')).not.toMatch(/\bpra\b/);
  });
});

const LOCAL_LOGO = /\/clients\/[a-z-]+\.webp$/;
const CLIENTS_DIR = join(process.cwd(), 'public', 'clients');

describe('testimonials and partners', () => {
  it('has six testimonials with unique ids', () => {
    expect(testimonials).toHaveLength(6);
    expect(new Set(testimonials.map((item) => item.id)).size).toBe(6);
  });

  it('flags only the draft quotes 5 and 6', () => {
    const drafts = testimonials.filter((item) => item.isDraft).map((item) => item.id);

    expect(drafts).toEqual([5, 6]);
  });

  it('gives every testimonial a quote, a person and a logo', () => {
    for (const item of testimonials) {
      expect(item.text.length).toBeGreaterThan(0);
      expect(item.name.length).toBeGreaterThan(0);
      expect(item.logo).toMatch(LOCAL_LOGO);
    }
  });

  it('has nine partners with a logo each', () => {
    expect(partners).toHaveLength(9);
    for (const partner of partners) {
      expect(partner.name.length).toBeGreaterThan(0);
      expect(partner.logo).toMatch(LOCAL_LOGO);
    }
  });

  it('serves every logo from a self-hosted file that exists in public/clients', () => {
    for (const { logo } of [...testimonials, ...partners]) {
      const file = logo.slice(logo.lastIndexOf('/') + 1);

      expect(existsSync(join(CLIENTS_DIR, file)), file).toBe(true);
    }
  });

  it('gives a company the same logo in its testimonial and in the client grid', () => {
    for (const { company, logo } of testimonials) {
      expect(partners.find((partner) => partner.name === company)?.logo, company).toBe(logo);
    }
  });

  it('writes Karla Álvares with the accent on the first A, for the person and for the store', () => {
    expect(testimonials[1].name).toBe('Karla Álvares');
    expect(testimonials[1].company).toBe('Loja Karla Álvares');
    expect(partners.map((partner) => partner.name)).toContain(testimonials[1].company);
  });
});

describe('brandIcons and integrations', () => {
  it('stores a non-empty svg path that starts with a move command for every icon', () => {
    const entries = Object.entries(brandIcons);

    expect(entries).toHaveLength(15);
    for (const [id, icon] of entries) {
      expect(icon.title, id).toBeTruthy();
      expect(typeof icon.path, id).toBe('string');
      expect(icon.path, id).toMatch(/^[Mm]/);
    }
  });

  it('lists 15 integrations whose ids all exist in brandIcons', () => {
    expect(integrations).toHaveLength(15);
    for (const integration of integrations) {
      expect(brandIcons[integration.id], integration.id).toBeDefined();
      expect(integration.label.length).toBeGreaterThan(0);
    }
  });

  it('names the Google tools alike, in English as the brand does', () => {
    const labels = integrations.map((integration) => integration.label);

    expect(labels).toContain('Google Calendar');
    expect(labels).not.toContain('Google Agenda');
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('navigation', () => {
  it('lists the six main links in order', () => {
    expect(MAIN_NAV).toEqual([
      { label: 'Serviços', to: '/servicos' },
      { label: 'Como funciona', to: '/#metodo' },
      { label: 'Clientes', to: '/#clientes' },
      { label: 'Projetos', to: '/projetos' },
      { label: 'Sobre', to: '/sobre' },
      { label: 'Blog', to: '/blog' },
    ]);
  });

  it('points the primary call to action at the contact page', () => {
    expect(PRIMARY_CTA).toEqual({ label: 'Vamos conversar', to: '/contato' });
  });
});

describe('contact constants', () => {
  it('exposes the official whatsapp number, display text and email', () => {
    expect(WHATSAPP_NUMBER).toBe('5581984451243');
    expect(WHATSAPP_DISPLAY).toBe('(81) 98445-1243');
    expect(CONTACT_EMAIL).toBe('contato@vnone.com.br');
  });

  it('builds a wa.me link and encodes the message', () => {
    expect(whatsappUrl('Olá! Quero conversar & saber mais?')).toBe(
      `https://wa.me/5581984451243?text=${encodeURIComponent('Olá! Quero conversar & saber mais?')}`,
    );
    expect(whatsappUrl('a b')).toBe('https://wa.me/5581984451243?text=a%20b');
  });

  it('builds the form fallback link from the approved message', () => {
    expect(WHATSAPP_FALLBACK_URL).toBe(
      whatsappUrl('Olá! Tentei usar o formulário do site da VN One.'),
    );
    expect(WHATSAPP_FALLBACK_URL.startsWith('https://wa.me/5581984451243?text=')).toBe(true);
  });

  it('keeps the social links from the footer', () => {
    expect(SOCIAL_LINKS).toEqual([
      { label: 'LinkedIn', href: 'https://www.linkedin.com/in/victornogueira-vn' },
      { label: 'GitHub', href: 'https://github.com/VictorN0gueira' },
      { label: 'Instagram', href: 'https://www.instagram.com/victornogueira._/' },
    ]);
  });
});

// These labels are the `servico` values the n8n webhooks receive (owner ruling R25): a change here changes the lead channel.
describe('serviceOptions', () => {
  it('keeps the dropdown labels the lead channel expects', () => {
    expect(serviceOptions).toEqual([
      'Automação de processos',
      'Agente de IA',
      'Site ou landing page',
      'Sistema web sob medida',
      'Combo de site e automação',
      'Ainda não sei, quero orientação',
    ]);
  });
});

describe('services', () => {
  it('keeps the service names as the owner approved them (decision O-K8: no change)', () => {
    expect(services.map((service) => service.nome)).toEqual([
      'Automação Essencial',
      'Automação Avançada',
      'Agente de IA Sob Medida',
      'Landing Page ou Site',
      'Landing Page Complexa',
      'Sistema Web Sob Medida',
    ]);
  });

  it('keeps the approximate lead time wording', () => {
    expect(services.filter((service) => service.prazo.includes('~'))).toEqual([]);
    expect(services[0].prazo).toBe('cerca de 1 semana');
    expect(services[3].prazo).toBe('cerca de 1 semana');
  });

  it('describes the services without sales adjectives', () => {
    const descriptions = [...services, ...combos].map((item) => item.descricao).join(' ');

    expect(descriptions).not.toMatch(BANNED_SALES_WORDS);
    expect(descriptions).not.toMatch(/converter|A solução completa/);
  });

  it('writes every combo discount in Portuguese, with the same percentages as before', () => {
    const discounts = combos.map((combo) => combo.desconto);

    expect(discounts).toEqual(['10% de desconto', '12% de desconto', '15% de desconto']);
    expect(discounts.join(' ')).not.toMatch(/\boff\b/i);
  });

  it('gives every service a unique kebab case slug for the /servicos#slug anchors', () => {
    const slugs = services.map((service) => service.slug);

    expect(new Set(slugs).size).toBe(services.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('keeps English tech jargon out of what each service says and includes', () => {
    const copy = services.flatMap((service) => [service.descricao, ...service.inclui]).join(' | ');

    expect(copy).not.toMatch(/React|Tailwind|Backend|frontend|Deploy|Performance otimizada|customizado/i);
  });

  it('says nothing twice on a card: no pair of content words of the description comes back in a bullet', () => {
    const STOPWORDS = new Set('de do da dos das o a os as e ou um uma seu sua seus suas para com em no na nos nas que quando onde por ao à'.split(' '));
    const bigrams = (text: string) => {
      const words = text
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => word && !STOPWORDS.has(word));
      return words.slice(1).map((word, index) => `${words[index]} ${word}`);
    };

    for (const service of services) {
      const described = new Set(bigrams(service.descricao));
      const repeated = service.inclui.flatMap(bigrams).filter((pair) => described.has(pair));

      expect(repeated, service.nome).toEqual([]);
    }
  });

  it('words the first bullet of the agent card as a noun phrase, like the other bullets, with no chatbot and no repeated verb', () => {
    const agent = services.find((service) => service.slug === 'agente-de-ia-sob-medida');

    expect(agent?.inclui[0]).toBe('Escopo do agente definido com você');
  });

  it('lists every bullet of a card once: no two bullets are the same, and none repeats a phrase of another', () => {
    const phrases = (text: string) => {
      const words = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 3);
      return words.slice(1).map((word, index) => `${words[index]} ${word}`);
    };

    for (const service of services) {
      const bullets = service.inclui.map((item) => item.toLowerCase());
      expect(new Set(bullets).size, service.nome).toBe(bullets.length);
      const seen = new Set<string>();
      for (const item of service.inclui) {
        const own = new Set(phrases(item));
        const clash = [...own].filter((phrase) => seen.has(phrase));
        expect(clash, `${service.nome}: ${item}`).toEqual([]);
        own.forEach((phrase) => seen.add(phrase));
      }
    }
  });

  it('does not repeat itself: no bullet is the service name, and a figure is not in the text and in a bullet', () => {
    for (const service of services) {
      const bullets = service.inclui.map((item) => item.toLowerCase());

      expect(bullets, service.nome).not.toContain(service.nome.toLowerCase());
      if (bullets.some((item) => /^até \d+ páginas$/.test(item))) {
        expect(service.descricao, service.nome).not.toMatch(/até \d+ páginas/i);
      }
    }
  });
});

describe('faqs', () => {
  it('speaks as a team, never in the first person singular', () => {
    const FIRST_PERSON = /\b(eu|me|meu|minha|mim|estou|construo)\b/i;
    const offenders = faqs.filter((faq) => FIRST_PERSON.test(faq.answer)).map((faq) => faq.question);

    expect(offenders).toEqual([]);
  });

  it('keeps filler, English and jargon out of the answers', () => {
    const answers = faqs.map((faq) => faq.answer).join(' ');

    expect(answers).not.toMatch(/video call|sprint|soluções|implementação|valor|rapidamente|a longo prazo|De jeito nenhum/i);
  });

  it('keeps the figures the old FAQ already had: 5 horas, 1 a 2 semanas and 30 minutos', () => {
    expect(faqs[0].answer).toContain('5 horas');
    expect(faqs[1].answer).toContain('1 a 2 semanas');
    expect(faqs[4].answer).toContain('30 minutos');
  });

  it('offers the free consultation by videochamada or WhatsApp, with no commitment', () => {
    expect(faqs[4].answer).toContain('videochamada ou WhatsApp');
    expect(faqs[4].answer).toContain('sem compromisso');
  });
});

describe('projects', () => {
  it('keeps sales wording out of every title, category and description', () => {
    const offenders = projects.flatMap((project) =>
      [project.title, project.category, project.description]
        .filter((text) => BANNED_SALES_WORDS.test(text))
        .map((text) => `${project.slug}: ${text}`),
    );

    expect(offenders).toEqual([]);
  });

  it('pins the fact-only descriptions and categories of the projects', () => {
    expect(getProjectBySlug('diagnostico-empresarial')?.description).toBe(
      'Página com um diagnóstico de 5 minutos para o dono da empresa e painel de leads com login, indicadores e funil.',
    );
    expect(getProjectBySlug('dizpara')?.description).toBe(
      'Painel para captar leads no Google Maps, importar de CSV e do Google Sheets e disparar campanhas por e-mail e por WhatsApp.',
    );
    expect(getProjectBySlug('hub081')?.description).toBe(
      'Painel com as conversas do WhatsApp, contatos, agentes de IA, pipelines, propostas, produtos e financeiro.',
    );
    expect(getProjectBySlug('ai-playlist-maker')?.category).toBe('Playlists com IA');
    expect(getProjectBySlug('travel-ia')?.category).toBe('Roteiro com IA');
  });
});

// The site speaks as "a gente" and tells the reader what to do in the informal imperative ("Mexe", "Conta", "Escolhe").
// The formal forms ("Veja", "Comece") next to them read as two voices on one page.
describe('home copy voice', () => {
  // Any case: "e veja quanto" in the middle of a sentence is the same mistake as "Veja" at the start of one.
  const FORMAL_IMPERATIVE = /(?<!\p{L})(veja|comece|escolha|selecione|conte|clique|confira|mexa|fale|chame|descubra|calcule|solicite|conheça|preencha|peça|agende|informe|acesse|saiba|digite)(?!\p{L})/iu;
  const FIRST_PERSON_PLURAL = /(?<!\p{L})(\p{L}{2,}amos|fazemos|fizemos|temos|somos|podemos|queremos|sentimos|nós)(?!\p{L})/iu;

  function collectStrings(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap(collectStrings);
    if (value !== null && typeof value === 'object') return Object.values(value).flatMap(collectStrings);
    return [];
  }

  it('uses the informal imperative in every string of the home copy modules', () => {
    const modules = [homeCopy, faqs, processSteps, services, combos, useCases, stats, flowPanel];
    const offenders = collectStrings(modules).filter((text) => FORMAL_IMPERATIVE.test(text));

    expect(offenders).toEqual([]);
  });

  // VN One sells AI agents, not chatbots: the word is in no copy the visitor reads, the `servico` options included.
  it('never says "chatbot" in the copy the visitor reads on the home and on the services page', () => {
    const modules = [homeCopy, faqs, processSteps, services, combos, useCases, stats, flowPanel, heroFlows, heroTasks, integrations];
    const offenders = collectStrings(modules).filter((text) => /chat[\s-]?bot/i.test(text));

    expect(offenders).toEqual([]);
  });

  it('speaks as "a gente" in the same modules: no verb in the first person plural, no "nós"', () => {
    const modules = [homeCopy, faqs, processSteps, services, combos, useCases, stats, flowPanel];
    const offenders = collectStrings(modules).filter((text) => FIRST_PERSON_PLURAL.test(text));

    expect(offenders).toEqual([]);
  });

  // Literal pins: the component tests read these from the module, so a change in the module would change both sides.
  it('pins the strings the component tests only read from the module', () => {
    expect(homeCopy.services.term).toBe('Prazo estimado');
    expect(homeCopy.finalCta.cta).toBe('Falar no WhatsApp');
    expect(homeCopy.faq.cta).toBe('Falar no WhatsApp');
    expect(homeCopy.roi.sub).toBe('Mexe nos valores e vê quanto dá pra recuperar automatizando.');
    expect(homeCopy.hero.sentence).toContain('. Automatizando, dá pra recuperar');
    expect(homeCopy.hero.sentence).not.toContain('. Automatizando, a gente devolve');
    expect(homeCopy.roi.rateCap('R$ 5.000')).toBe('A conta usa no máximo R$ 5.000 por hora.');
    expect(homeCopy.hero.finePrint).toBe('Estimativa com R$\u00A050 por hora e 80% do tempo automatizado.');
  });

  it('opens the statement and the use case headings with the informal verb', () => {
    expect(homeCopy.statement.heading).toMatch(/^Vê o que/);
    expect(homeCopy.useCases.heading).toMatch(/^Começa pelo/);
  });
});
