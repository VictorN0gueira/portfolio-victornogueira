export type ProcessStep = {
  number: '01' | '02' | '03' | '04';
  title: string;
  duration: string;
  description: string;
};

export const processSteps: ProcessStep[] = [
  {
    number: '01',
    title: 'Descoberta',
    duration: '1 reunião de 30 min',
    description: 'A gente olha os processos de hoje, acha os gargalos e marca onde a automação dá mais retorno.',
  },
  {
    number: '02',
    title: 'Planejamento',
    duration: '1 a 2 dias',
    description: 'Desenhamos os fluxos e as integrações, e definimos onde a IA entra.',
  },
  {
    number: '03',
    title: 'Execução',
    duration: 'sprints semanais',
    description: 'Cada fluxo é construído e testado em ciclos curtos, com entregas parciais pra você validar.',
  },
  {
    number: '04',
    title: 'Entrega e suporte',
    duration: 'contínuo',
    description: 'Colocamos no ar com monitoramento e documentação. Se precisar de ajuste depois, a gente ajusta.',
  },
];
