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
    duration: 'uma reunião de 30 minutos',
    description: 'A gente olha os processos de hoje, acha os gargalos e marca onde a automação dá mais retorno.',
  },
  {
    number: '02',
    title: 'Planejamento',
    duration: '1 a 2 dias',
    description: 'A gente desenha os fluxos e as integrações e define onde a IA entra.',
  },
  {
    number: '03',
    title: 'Execução',
    duration: 'ciclos semanais',
    description: 'Cada fluxo é construído e testado em ciclos curtos, com entregas parciais para você validar.',
  },
  {
    number: '04',
    title: 'Entrega e suporte',
    duration: 'contínuo',
    description: 'A gente coloca no ar com monitoramento e documentação. Se precisar de ajuste depois, é só chamar.',
  },
];
