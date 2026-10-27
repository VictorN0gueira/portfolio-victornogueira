import { describe, expect, it } from 'vitest';
import { homeCopy } from './homeCopy';
import { useCases } from './useCases';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const ARROW = String.fromCharCode(0x2192);
const FORBIDDEN = new RegExp(`[${EM_DASH}${EN_DASH}${ARROW}]| / `);

function allStrings(): string[] {
  const { useCases: copy } = homeCopy;
  return [
    ...useCases.flatMap((useCase) => [useCase.tab, useCase.title, useCase.body, ...useCase.steps]),
    copy.kicker,
    copy.heading,
    copy.sub,
    copy.note,
    copy.tablistLabel,
    copy.stepsTitle,
    copy.pause,
  ];
}

describe('useCases', () => {
  it('has the four use cases in order, each with the id the tab label comes from', () => {
    expect(useCases.map((useCase) => useCase.id)).toEqual(['atendimento', 'comercial', 'financeiro', 'operacoes']);
    expect(useCases.map((useCase) => useCase.tab)).toEqual(['Atendimento', 'Comercial', 'Financeiro', 'Operações']);
  });

  it('gives every use case exactly three steps and a title and a body', () => {
    for (const useCase of useCases) {
      expect(Object.keys(useCase).sort()).toEqual(['body', 'id', 'steps', 'tab', 'title']);
      expect(useCase.steps, useCase.id).toHaveLength(3);
      expect(useCase.title.trim(), useCase.id).not.toBe('');
      expect(useCase.body.trim(), useCase.id).not.toBe('');
      useCase.steps.forEach((step) => expect(step.trim(), useCase.id).not.toBe(''));
    }
  });

  it('uses the approved support use case', () => {
    expect(useCases[0]).toEqual({
      id: 'atendimento',
      tab: 'Atendimento',
      title: 'Resposta rápida, a qualquer hora.',
      body: 'Um agente de IA atende no WhatsApp com as regras do seu negócio e passa para a equipe quando a conversa pede uma pessoa.',
      steps: [
        'Receber a mensagem e entender o pedido',
        'Responder ou buscar a informação no seu sistema',
        'Chamar alguém da equipe quando precisar',
      ],
    });
  });

  it('uses the approved sales use case', () => {
    expect(useCases[1]).toEqual({
      id: 'comercial',
      tab: 'Comercial',
      title: 'Nenhum lead esquecido no meio do caminho.',
      body: 'Cada contato entra no CRM com origem e histórico, e o retorno sai na hora certa sem ninguém precisar lembrar.',
      steps: ['Capturar o lead de onde ele vier', 'Qualificar e registrar no CRM', 'Agendar e mandar o retorno'],
    });
  });

  it('uses the approved finance use case', () => {
    expect(useCases[2]).toEqual({
      id: 'financeiro',
      tab: 'Financeiro',
      title: 'Menos conferência manual no fim do mês.',
      body: 'Notas, pedidos e cobranças conversam com o seu sistema. A equipe só olha o que saiu do padrão.',
      steps: [
        'Ler as notas e documentos que chegam',
        'Conferir com o que está no sistema',
        'Apontar só as divergências',
      ],
    });
  });

  it('uses the approved operations use case', () => {
    expect(useCases[3]).toEqual({
      id: 'operacoes',
      tab: 'Operações',
      title: 'O processo anda sem depender de cobrança.',
      body: 'Cada etapa tem dono e prazo, e o aviso sai sozinho. Você acompanha pelo painel em vez de perguntar no grupo.',
      steps: ['Organizar etapas e responsáveis', 'Avisar quando algo atrasa', 'Mostrar tudo num painel'],
    });
  });
});

describe('homeCopy.useCases', () => {
  it('has the approved section copy', () => {
    expect(homeCopy.useCases.kicker).toBe('onde a automação entra');
    expect(homeCopy.useCases.heading).toBe('Comece pelo processo que mais pesa na rotina');
    expect(homeCopy.useCases.sub).toBe(
      'Toda empresa tem aquele trabalho que ninguém aguenta mais fazer. É por ele que a gente começa.',
    );
    expect(homeCopy.useCases.note).toBe('Exemplo de aplicação. O fluxo de verdade sai do diagnóstico.');
  });

  it('has the constant name of the pause toggle', () => {
    expect(homeCopy.useCases.pause).toBe('Pausar troca automática');
  });

  it('has no dash, arrow or " / " separator in any string', () => {
    expect(allStrings().filter((text) => FORBIDDEN.test(text))).toEqual([]);
  });
});
