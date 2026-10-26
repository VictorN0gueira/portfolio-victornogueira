import { describe, expect, it } from 'vitest';
import { WEBHOOKS, buildContactPayload, validateContact } from './contact';

const ok = {
  nome: 'Ana Lima',
  email: 'ana@empresa.com.br',
  whatsapp: '+55 81 9 8445-1243',
  mensagem: 'Quero automatizar notas fiscais',
  servico: 'Automação de processos',
};

const NOW = new Date('2026-10-26T12:00:00Z');

describe('WEBHOOKS', () => {
  it('keeps the two production n8n URLs exactly', () => {
    expect(WEBHOOKS).toEqual({
      email: 'https://n8n.vnone.com.br/webhook/portfolio-vn-email',
      whatsapp: 'https://n8n.vnone.com.br/webhook/portfolio-vn-whatsapp',
    });
  });
});

describe('validateContact', () => {
  it('aceita formulário válido', () => {
    expect(validateContact(ok, 'email')).toEqual({});
    expect(validateContact(ok, 'whatsapp')).toEqual({});
  });

  it('exige nome, mensagem e serviço', () => {
    const e = validateContact({ ...ok, nome: ' ', mensagem: 'oi', servico: '' }, 'email');
    expect(Object.keys(e).sort()).toEqual(['mensagem', 'nome', 'servico']);
  });

  it('usa a copy fixa de cada erro', () => {
    const e = validateContact(
      { nome: '', email: 'ana@', whatsapp: '', mensagem: '', servico: '' },
      'email',
    );
    expect(e).toEqual({
      nome: 'Conta pra gente seu nome',
      email: 'Esse e-mail parece incompleto',
      mensagem: 'Escreve um pouco mais sobre o que você precisa',
      servico: 'Escolhe um serviço',
    });
    expect(
      validateContact({ ...ok, whatsapp: '' }, 'whatsapp').whatsapp,
    ).toBe('Coloca o número com DDD, por exemplo 81 99999-9999');
  });

  it('exige nome aparado com pelo menos 2 caracteres', () => {
    expect(validateContact({ ...ok, nome: ' A ' }, 'email').nome).toBeTruthy();
    expect(validateContact({ ...ok, nome: ' Al ' }, 'email').nome).toBeUndefined();
  });

  it('exige mensagem aparada com pelo menos 10 caracteres', () => {
    expect(validateContact({ ...ok, mensagem: '  123456789  ' }, 'email').mensagem).toBeTruthy();
    expect(validateContact({ ...ok, mensagem: '  1234567890  ' }, 'email').mensagem).toBeUndefined();
  });

  it('não valida o serviço contra a lista, só a ausência', () => {
    expect(validateContact({ ...ok, servico: 'Qualquer coisa' }, 'email').servico).toBeUndefined();
  });

  it('valida e-mail só no método email', () => {
    expect(validateContact({ ...ok, email: 'ana@' }, 'email').email).toBeTruthy();
    expect(validateContact({ ...ok, email: '' }, 'whatsapp').email).toBeUndefined();
  });

  it('rejeita e-mail sem domínio completo ou com espaço', () => {
    expect(validateContact({ ...ok, email: 'ana@empresa' }, 'email').email).toBeTruthy();
    expect(validateContact({ ...ok, email: 'ana lima@empresa.com' }, 'email').email).toBeTruthy();
    expect(validateContact({ ...ok, email: 'ana@empresa.c' }, 'email').email).toBeTruthy();
  });

  it('valida whatsapp com DDD (10 ou 11 dígitos locais)', () => {
    expect(validateContact({ ...ok, whatsapp: '+55 81 9' }, 'whatsapp').whatsapp).toBeTruthy();
    expect(validateContact({ ...ok, whatsapp: '8184451243' }, 'whatsapp').whatsapp).toBeUndefined();
    expect(validateContact({ ...ok, whatsapp: '81984451243' }, 'whatsapp').whatsapp).toBeUndefined();
    expect(validateContact({ ...ok, whatsapp: '819844512430' }, 'whatsapp').whatsapp).toBeTruthy();
  });

  it('valida whatsapp só no método whatsapp', () => {
    expect(validateContact({ ...ok, whatsapp: '+55 ' }, 'email').whatsapp).toBeUndefined();
  });
});

describe('buildContactPayload', () => {
  it('payload email tem exatamente as chaves legadas + servico', () => {
    const p = buildContactPayload(ok, 'email', NOW);
    expect(Object.keys(p).sort()).toEqual(['email', 'mensagem', 'nome', 'servico', 'timestamp']);
    expect(p).toMatchObject({ email: 'ana@empresa.com.br', timestamp: '2026-10-26T12:00:00.000Z' });
  });

  it('payload whatsapp usa formato Evolution', () => {
    const p = buildContactPayload(ok, 'whatsapp', NOW);
    expect(Object.keys(p).sort()).toEqual(['mensagem', 'nome', 'servico', 'timestamp', 'whatsapp']);
    expect(p).toMatchObject({ whatsapp: '558184451243' });
  });

  it('apara nome, mensagem e e-mail e repassa o serviço como veio', () => {
    const p = buildContactPayload(
      { ...ok, nome: '  Ana Lima ', email: ' ana@empresa.com.br ', mensagem: '  Quero ajuda  ' },
      'email',
      NOW,
    );
    expect(p).toEqual({
      nome: 'Ana Lima',
      email: 'ana@empresa.com.br',
      servico: 'Automação de processos',
      mensagem: 'Quero ajuda',
      timestamp: '2026-10-26T12:00:00.000Z',
    });
  });

  it('não valida: devolve o payload mesmo com campos inválidos', () => {
    const p = buildContactPayload({ ...ok, nome: '', mensagem: '', servico: '' }, 'email', NOW);
    expect(p).toMatchObject({ nome: '', mensagem: '', servico: '' });
  });
});
