import { describe, expect, it } from 'vitest';
import { flowPanel, flowSources, flowSteps, heroFlows, heroTasks } from './heroFlows';
import { homeCopy } from './homeCopy';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const ARROW = String.fromCharCode(0x2192);
const CHECK = String.fromCharCode(0x2713);
const FORBIDDEN = new RegExp(`[${EM_DASH}${EN_DASH}${ARROW}${CHECK}]| / `);

function allStrings(): string[] {
  const rows = Object.values(heroFlows).flatMap((flow) => flow.flatMap((row) => [row.title, row.detail, row.done]));
  return [
    ...rows,
    ...flowSteps,
    ...flowSources,
    flowPanel.title,
    flowPanel.status,
    flowPanel.footnote,
    ...Object.values(flowPanel.aria),
    ...Object.values(homeCopy.hero.panel),
  ];
}

describe('heroFlows', () => {
  it('has one flow per task of the sentence, in the same order', () => {
    expect(Object.keys(heroFlows)).toEqual(heroTasks.map((task) => task.value));
  });

  it('has four rows per task, each with a title, a detail and a done text', () => {
    for (const flow of Object.values(heroFlows)) {
      expect(flow).toHaveLength(4);
      for (const row of flow) {
        expect(Object.keys(row).sort()).toEqual(['detail', 'done', 'title']);
        expect(row.title.trim()).not.toBe('');
        expect(row.detail.trim()).not.toBe('');
        expect(row.done.trim()).not.toBe('');
      }
    }
  });

  it('uses the approved rows for the spreadsheet and WhatsApp task', () => {
    expect(heroFlows['planilha-whatsapp']).toEqual([
      { title: 'Pedido chega no WhatsApp', detail: 'mensagem do cliente', done: 'recebido' },
      { title: 'IA lê e organiza', detail: 'nome, item e valor', done: 'extraído' },
      { title: 'Planilha atualizada', detail: 'linha nova no Google Sheets', done: 'lançado' },
      { title: 'Equipe avisada', detail: 'só o que pede decisão', done: 'encaminhado' },
    ]);
  });

  it('uses the approved rows for the support task', () => {
    expect(heroFlows.atendimento).toEqual([
      { title: 'Cliente manda mensagem', detail: 'a qualquer hora', done: 'recebido' },
      { title: 'Agente responde', detail: 'com as regras do seu negócio', done: 'respondido' },
      { title: 'Lead qualificado', detail: 'dados salvos no CRM', done: 'registrado' },
      { title: 'Vendedor entra', detail: 'quando a conversa pede gente', done: 'encaminhado' },
    ]);
  });

  it('uses the approved rows for the invoice task', () => {
    expect(heroFlows.notas).toEqual([
      { title: 'Venda confirmada', detail: 'pedido pago no sistema', done: 'recebido' },
      { title: 'Nota emitida', detail: 'dados conferidos antes', done: 'emitida' },
      { title: 'Cliente recebe', detail: 'PDF e XML por e-mail', done: 'enviado' },
      { title: 'Financeiro atualizado', detail: 'lançamento no ERP', done: 'lançado' },
    ]);
  });

  it('uses the approved rows for the sales follow-up task', () => {
    expect(heroFlows['follow-up']).toEqual([
      { title: 'Proposta enviada', detail: 'registrada no CRM', done: 'registrado' },
      { title: 'Lembrete agendado', detail: 'no dia certo, sem planilha', done: 'agendado' },
      { title: 'Mensagem de retorno', detail: 'escrita a partir do histórico', done: 'enviado' },
      { title: 'Cliente respondeu', detail: 'vai direto pro vendedor', done: 'encaminhado' },
    ]);
  });

  it('names the four steps and the four sources', () => {
    expect([...flowSteps]).toEqual(['receber', 'entender', 'executar', 'avisar']);
    expect([...flowSources]).toEqual(['WhatsApp', 'E-mail', 'Planilhas', 'Seu sistema']);
  });

  it('has the approved window copy', () => {
    expect(flowPanel.title).toBe('automação ao vivo');
    expect(flowPanel.status).toBe('rodando');
    expect(flowPanel.footnote).toBe('Exemplo ilustrativo. O fluxo real sai do diagnóstico.');
  });

  it('has no dash, arrow, check glyph or " / " separator in any string', () => {
    expect(allStrings().filter((text) => FORBIDDEN.test(text))).toEqual([]);
  });

  it('has the approved names of the panel group and its pause control', () => {
    expect(homeCopy.hero.panel).toEqual({
      label: 'Exemplo de automação rodando',
      pause: 'Pausar animação',
      resume: 'Retomar animação',
    });
  });
});
