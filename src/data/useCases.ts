export type UseCase = {
  id: 'atendimento' | 'comercial' | 'financeiro' | 'operacoes';
  /** O rótulo da aba. */
  tab: string;
  title: string;
  body: string;
  steps: [string, string, string];
};

/** Os quatro exemplos de onde a automação entra, na ordem das abas. São exemplos: o fluxo real sai do diagnóstico. */
export const useCases: UseCase[] = [
  {
    id: 'atendimento',
    tab: 'Atendimento',
    title: 'Resposta rápida, a qualquer hora.',
    body: 'Um agente de IA atende no WhatsApp com as regras do seu negócio e passa para a equipe quando a conversa pede uma pessoa.',
    steps: [
      'Receber a mensagem e entender o pedido',
      'Responder ou buscar a informação no seu sistema',
      'Chamar alguém da equipe quando precisar',
    ],
  },
  {
    id: 'comercial',
    tab: 'Comercial',
    title: 'Lead não fica esquecido no meio do caminho.',
    body: 'Cada contato entra no CRM com origem e histórico, e o retorno sai na hora certa sem ninguém precisar lembrar.',
    steps: ['Capturar o lead de onde ele vier', 'Qualificar e registrar no CRM', 'Agendar e mandar o retorno'],
  },
  {
    id: 'financeiro',
    tab: 'Financeiro',
    title: 'Menos conferência manual no fim do mês.',
    body: 'Notas, pedidos e cobranças conversam com o seu sistema. A equipe só olha o que saiu do padrão.',
    steps: ['Ler as notas e documentos que chegam', 'Conferir com o que está no sistema', 'Apontar só as divergências'],
  },
  {
    id: 'operacoes',
    tab: 'Operações',
    title: 'O processo anda sem depender de cobrança.',
    body: 'Cada etapa tem dono e prazo, e o aviso sai sozinho. Você acompanha pelo painel em vez de perguntar no grupo.',
    steps: ['Organizar etapas e responsáveis', 'Avisar quando algo atrasa', 'Mostrar tudo num painel'],
  },
];
