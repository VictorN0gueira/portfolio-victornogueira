export type HeroTaskId = 'planilha-whatsapp' | 'atendimento' | 'notas' | 'follow-up';

export interface HeroTaskOption {
  value: HeroTaskId;
  label: string;
}

/** As tarefas que a frase do hero oferece. A ordem é a da lista aberta pela pílula. */
export const heroTasks: readonly HeroTaskOption[] = [
  { value: 'planilha-whatsapp', label: 'planilha e WhatsApp' },
  { value: 'atendimento', label: 'atendimento no WhatsApp' },
  { value: 'notas', label: 'emissão de notas' },
  { value: 'follow-up', label: 'follow-up de vendas' },
];

export interface FlowRow {
  title: string;
  detail: string;
  /** What the row says about itself once it is done. */
  done: string;
}

/** As quatro linhas que o painel de automação mostra para cada tarefa, na ordem em que ficam prontas. */
export const heroFlows: Record<HeroTaskId, readonly FlowRow[]> = {
  'planilha-whatsapp': [
    { title: 'Pedido chega no WhatsApp', detail: 'mensagem do cliente', done: 'recebido' },
    { title: 'IA lê e organiza', detail: 'nome, item e valor', done: 'extraído' },
    { title: 'Planilha atualizada', detail: 'linha nova no Google Sheets', done: 'lançado' },
    { title: 'Equipe avisada', detail: 'só o que pede decisão', done: 'encaminhado' },
  ],
  atendimento: [
    { title: 'Cliente manda mensagem', detail: 'a qualquer hora', done: 'recebido' },
    { title: 'Agente responde', detail: 'com as regras do seu negócio', done: 'respondido' },
    { title: 'Lead qualificado', detail: 'dados salvos no CRM', done: 'registrado' },
    { title: 'Vendedor entra', detail: 'quando a conversa pede gente', done: 'encaminhado' },
  ],
  notas: [
    { title: 'Venda confirmada', detail: 'pedido pago no sistema', done: 'recebido' },
    { title: 'Nota emitida', detail: 'dados conferidos antes', done: 'emitida' },
    { title: 'Cliente recebe', detail: 'PDF e XML por e-mail', done: 'enviado' },
    { title: 'Financeiro atualizado', detail: 'lançamento no ERP', done: 'lançado' },
  ],
  'follow-up': [
    { title: 'Proposta enviada', detail: 'registrada no CRM', done: 'registrado' },
    { title: 'Lembrete agendado', detail: 'no dia certo, sem planilha', done: 'agendado' },
    { title: 'Mensagem de retorno', detail: 'escrita a partir do histórico', done: 'enviado' },
    { title: 'Cliente respondeu', detail: 'vai direto pro vendedor', done: 'encaminhado' },
  ],
};

/** As etapas das pílulas do painel. */
export const flowSteps = ['receber', 'entender', 'executar', 'avisar'] as const;

/** De onde o fluxo recebe o trabalho. */
export const flowSources = ['WhatsApp', 'E-mail', 'Planilhas', 'Seu sistema'] as const;

export type FlowSource = (typeof flowSources)[number];

/** Os textos fixos do painel: o título da janela, a nota de rodapé e os nomes que os leitores de tela recebem. */
export const flowPanel = {
  title: 'exemplo de automação',
  footnote: 'Exemplo ilustrativo. O fluxo real sai do diagnóstico.',
  aria: {
    steps: 'Etapas do fluxo',
    sources: 'Fontes conectadas',
    rows: 'Passos da automação',
  },
} as const;
