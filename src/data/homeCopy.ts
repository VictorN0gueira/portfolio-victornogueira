import { HERO_HOUR_OPTIONS } from '../lib/roi';

/** Which interactive piece of the hero sentence fills a slot. */
export type HeroSentenceSlot = 'hours' | 'task' | 'result';

/** A piece of the hero sentence: plain text, or the place of a pill. */
export type HeroSentencePart = string | { slot: HeroSentenceSlot };

export interface HeroHourOption {
  value: (typeof HERO_HOUR_OPTIONS)[number];
  label: string;
}

/** Cópia da home. As frases já passaram pelo humanizer: não mexa sem refazer a passada. */
export const homeCopy = {
  hero: {
    kicker: 'automação e IA para empresas',
    // Um texto que começa com pontuação cola na peça anterior, sem espaço.
    sentence: [
      'Sua equipe perde',
      { slot: 'hours' },
      'por semana com',
      { slot: 'task' },
      '. Automatizando, a gente devolve',
      { slot: 'result' },
      'por mês.',
    ] as readonly HeroSentencePart[],
    hourOptions: HERO_HOUR_OPTIONS.map((hours) => ({ value: hours, label: `${hours} horas` })) as readonly HeroHourOption[],
    sub: 'A gente mapeia o processo e entrega a automação rodando nas ferramentas que você já usa. Sua equipe fica com o trabalho que precisa de gente.',
    finePrint: 'Estimativa com R$ 50 por hora e 80% do tempo automatizado.',
    ctaPrimary: { label: 'Quero automatizar', to: '/#contato' },
    ctaSecondary: { label: 'Ver como funciona', to: '/#metodo' },
    annotation: '// mexe nos números aí',
    // Os textos do painel de automação: o nome do grupo, o nome fixo do botão que pausa o que se move nele
    // (o estado vai em aria-pressed, o nome não muda) e a palavra da barra da janela.
    panel: {
      label: 'Exemplo de automação rodando',
      pause: 'Pausar animação',
      status: { running: 'rodando', paused: 'pausado' },
    },
    aria: {
      hoursPill: (label: string) => `Horas por semana: ${label}. Alterar`,
      taskPill: (label: string) => `Tarefa: ${label}. Alterar`,
      hoursList: 'Horas por semana',
      taskList: 'Tarefa',
      // Read by the status region when the hours change. The amount arrives already formatted in reais.
      estimate: (amount: string) => `Estimativa: ${amount} por mês`,
    },
  },
  // Os textos das abas de casos de uso (o conteúdo de cada aba está em data/useCases.ts). `pause` é o nome fixo do
  // botão que para a troca automática: o estado vai em aria-pressed, o nome não muda.
  useCases: {
    kicker: 'onde a automação entra',
    heading: 'Comece pelo processo que mais pesa na rotina',
    sub: 'Toda empresa tem aquele trabalho que ninguém aguenta mais fazer. É por ele que a gente começa.',
    note: 'Exemplo de aplicação. O fluxo de verdade sai do diagnóstico.',
    tablistLabel: 'Casos de uso',
    stepsTitle: 'Como funciona',
    pause: 'Pausar troca automática',
  },
} as const;
