/** `id` is the React key of the card: never shown, so a copy edit of the number or the label cannot change it. */
export type Stat = { id: string; value: string; label: string; description: string };

export const stats: Stat[] = [
  {
    id: 'horas-economizadas',
    value: '500h+',
    label: 'Horas economizadas por mês',
    description: 'Menos tempo gasto em tarefas manuais e repetitivas',
  },
  {
    id: 'fluxos-ativos',
    value: '100+',
    label: 'Fluxos de automação ativos',
    description: 'Fluxos rodando todos os dias',
  },
  {
    id: 'empresas-atendidas',
    value: '10+',
    label: 'Empresas atendidas',
    description: 'De pequenos negócios a indústrias',
  },
  {
    id: 'eficiencia-media',
    value: '85%',
    label: 'Aumento médio de eficiência',
    description: 'Melhoria nos processos internos',
  },
];
