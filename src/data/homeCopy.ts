import { HERO_HOUR_OPTIONS } from '../lib/roi';

/** Which interactive piece of the hero sentence fills a slot. */
export type HeroSentenceSlot = 'hours' | 'task' | 'result';

/** A piece of the hero sentence: plain text, or the place of a pill. */
export type HeroSentencePart = string | { slot: HeroSentenceSlot };

export interface HeroHourOption {
  value: (typeof HERO_HOUR_OPTIONS)[number];
  label: string;
}

const ROI_COST_LABEL = 'Custo anual hoje';
const ROI_SAVINGS_LABEL = 'Economia estimada por ano';

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
  // Os textos da seção da frase de resultado (os quatro números estão em data/stats.ts). `heading` é o h2 da seção.
  statement: {
    kicker: 'resultado',
    heading: 'O trabalho repetitivo vai para os fluxos. A equipe fica com o resto.',
    sub: 'Números dos projetos que a gente já entregou.',
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
  // Os textos dos três cartões de serviço. `term` é a palavra lida antes do prazo de cada cartão (o prazo em si vem de
  // data/services.ts), e `link` leva à página de serviços.
  services: {
    kicker: 'o que a gente faz',
    heading: 'Três jeitos de tirar trabalho manual da sua frente',
    term: 'Prazo',
    link: 'Ver todos os serviços',
  },
  // Os textos da seção do método (o conteúdo de cada passo está em data/process.ts).
  method: {
    kicker: 'como a gente trabalha',
    heading: 'Do primeiro papo ao fluxo rodando',
    sub: 'Você conhece o negócio. A gente entra com o método e a execução.',
  },
  // Os textos da seção de depoimentos (as falas e os autores estão em data/testimonials.ts, sem edição). `readFull` é o
  // texto visível do botão de cada cartão; `readFullFor` é o nome dele para leitor de tela e começa com o texto visível.
  // `dialogTitleLead` vem antes do nome do autor, só para leitor de tela (o nome visível dá o nome ao diálogo aberto, e o
  // nome acessível fica "Depoimento de {nome}"); `close` é o nome do botão que fecha.
  testimonials: {
    kicker: 'clientes',
    heading: 'Quem já automatizou com a gente',
    readFull: 'Ler depoimento completo',
    readFullFor: (name: string) => `Ler depoimento completo de ${name}`,
    dialogTitleLead: 'Depoimento de',
    close: 'Fechar',
  },
  // O título da lista de logos dos clientes (os nomes e as logos estão em data/partners.ts).
  clients: {
    kicker: 'quem confia',
  },
  // Os textos das perguntas frequentes (as perguntas e as respostas estão em data/faqs.ts). `message` é a primeira frase
  // da conversa aberta pelo botão.
  faq: {
    kicker: 'dúvidas',
    heading: 'Perguntas que a gente sempre ouve',
    sub: 'Se a sua não estiver aqui, chama no WhatsApp.',
    cta: 'Falar no WhatsApp',
    message: 'Olá! Tenho uma dúvida sobre automação.',
  },
  // Os textos da chamada final, que leva o formulário de contato (os textos do formulário estão em
  // components/contact/contactFormCopy.ts). `message` é a primeira frase da conversa aberta pelo botão.
  finalCta: {
    kicker: 'próximo passo',
    heading: 'Qual processo a gente automatiza primeiro?',
    body: 'Conta como funciona hoje. Em 30 minutos a gente mostra por onde começar, sem compromisso.',
    cta: 'Chamar no WhatsApp',
    message: 'Olá! Quero automatizar um processo da minha empresa.',
  },
  // Os textos do simulador de economia. As opções de equipe vêm de TEAM_OPTIONS (lib/roi.ts).
  roi: {
    kicker: 'simulador',
    heading: 'Quanto o trabalho manual custa por ano',
    sub: 'Mexe nos valores e veja quanto dá pra recuperar automatizando.',
    labels: {
      hours: 'Horas por semana em tarefas repetitivas',
      team: 'Quantas pessoas fazem isso',
      rate: 'Valor da hora (R$)',
    },
    results: {
      cost: ROI_COST_LABEL,
      savings: ROI_SAVINGS_LABEL,
    },
    note: 'Considera 80% do tempo automatizado. É uma estimativa, o número real sai do diagnóstico.',
    cta: 'Quero automatizar esse processo',
    // Aviso quando o valor da hora passa do teto: o valor já chega formatado em reais.
    rateCap: (max: string) => `Calculamos com no máximo ${max} por hora.`,
    // O valor do controle de horas, ao lado do rótulo.
    hoursShown: (hours: number) => `${hours} h`,
    aria: {
      // Lido pelo controle de horas no lugar do número solto.
      hoursValue: (hours: number) => `${hours} ${hours === 1 ? 'hora' : 'horas'} por semana`,
      // Lido pela região de status quando os valores se firmam. Os valores chegam já formatados em reais.
      status: (cost: string, savings: string) => `${ROI_COST_LABEL} ${cost}. ${ROI_SAVINGS_LABEL} ${savings}.`,
    },
  },
} as const;
