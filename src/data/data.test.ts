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
import { integrations } from './integrations';
import { MAIN_NAV, PRIMARY_CTA } from './navigation';
import { partners } from './partners';
import { processSteps } from './process';
import { faqs } from './faqs';
import { combos, serviceOptions, services } from './services';
import { stats } from './stats';
import { testimonials } from './testimonials';

// Sales wording that must stay out of the data copy.
const BANNED_SALES_WORDS = /orquestrad|moderna|inteligente/i;

describe('stats', () => {
  it('has the four headline numbers in order', () => {
    expect(stats).toHaveLength(4);
    expect(stats.map((stat) => stat.value)).toEqual(['500h+', '100+', '10+', '85%']);
  });

  it('uses the approved labels', () => {
    expect(stats.map((stat) => stat.label)).toEqual([
      'Horas economizadas por mês',
      'Fluxos de automação ativos',
      'Empresas atendidas',
      'Aumento médio de eficiência',
    ]);
  });

  it('uses the approved descriptions', () => {
    expect(stats.map((stat) => stat.description)).toEqual([
      'Menos tempo gasto em tarefas manuais e repetitivas',
      'Fluxos rodando 24 horas, todos os dias',
      'De pequenos negócios a indústrias',
      'Melhoria nos processos internos',
    ]);
  });

  it('keeps sales wording out of every stat label and description', () => {
    const copy = stats.flatMap((stat) => [stat.label, stat.description]).join(' ');

    expect(copy).not.toMatch(BANNED_SALES_WORDS);
  });

  it('does not repeat "médio" in the efficiency description', () => {
    expect(stats[3].description).toBe('Melhoria nos processos internos');
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

  it('uses the approved titles and durations', () => {
    expect(processSteps.map((step) => step.title)).toEqual([
      'Descoberta',
      'Planejamento',
      'Execução',
      'Entrega e suporte',
    ]);
    expect(processSteps.map((step) => step.duration)).toEqual([
      '1 reunião de 30 min',
      '1 a 2 dias',
      'sprints semanais',
      'contínuo',
    ]);
  });

  it('uses the approved descriptions verbatim', () => {
    expect(processSteps.map((step) => step.description)).toEqual([
      'A gente olha os processos de hoje, acha os gargalos e marca onde a automação dá mais retorno.',
      'Desenhamos os fluxos e as integrações, e definimos onde a IA entra.',
      'Cada fluxo é construído e testado em ciclos curtos, com entregas parciais pra você validar.',
      'Colocamos no ar com monitoramento e documentação. Se precisar de ajuste depois, a gente ajusta.',
    ]);
  });
});

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
      expect(item.logo).toMatch(/^https:\/\//);
    }
  });

  it('has nine partners with a logo each', () => {
    expect(partners).toHaveLength(9);
    for (const partner of partners) {
      expect(partner.name.length).toBeGreaterThan(0);
      expect(partner.logo).toMatch(/^https:\/\//);
    }
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

  it('uses the approved display labels', () => {
    expect(integrations.map((integration) => integration.label)).toEqual([
      'WhatsApp',
      'n8n',
      'Supabase',
      'Claude',
      'Google Sheets',
      'Google Drive',
      'Gmail',
      'Google Agenda',
      'Notion',
      'HubSpot',
      'Shopify',
      'Trello',
      'Telegram',
      'Instagram',
      'Gemini',
    ]);
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

describe('serviceOptions', () => {
  it('uses the approved dropdown labels', () => {
    expect(serviceOptions).toEqual([
      'Automação de processos',
      'Agente de IA ou chatbot',
      'Site ou landing page',
      'Sistema web sob medida',
      'Combo de site e automação',
      'Ainda não sei, quero orientação',
    ]);
  });
});

describe('services', () => {
  it('keeps the Title Case service names, with the site service named after the approved copy', () => {
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
    expect(services[3].descricao).toBe('Presença digital rápida e pensada para converter, com até 5 páginas.');
  });

  it('keeps the combo discounts untouched', () => {
    expect(combos.map((combo) => combo.desconto)).toEqual(['10% off', '12% off', '15% off']);
  });
});

describe('faqs', () => {
  it('speaks as a team, never in the first person singular', () => {
    const FIRST_PERSON = /\b(eu|me|meu|minha|mim|estou|construo)\b/i;
    const offenders = faqs.filter((faq) => FIRST_PERSON.test(faq.answer)).map((faq) => faq.question);

    expect(offenders).toEqual([]);
  });

  it('closes the support and consultation answers with the approved wording', () => {
    expect(
      faqs[3].answer.endsWith(
        'Construímos as soluções pensando em estabilidade e facilidade de manutenção a longo prazo.',
      ),
    ).toBe(true);
    expect(faqs[4].answer.endsWith('Sem compromisso.')).toBe(true);
    expect(faqs[4].answer).not.toContain('Sem pressão');
  });
});
