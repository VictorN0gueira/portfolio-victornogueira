export interface Faq {
  /** Stable key of the item (React key). Never shown, so a copy edit of the question cannot change it. */
  id: string;
  question: string;
  answer: string;
}

export const faqs: Faq[] = [
  {
    id: 'negocio-pequeno',
    question: 'Meu negócio é pequeno demais para automação?',
    answer:
      'Não. Se a sua equipe repete as mesmas tarefas toda semana, já dá para automatizar, e em empresa pequena essas horas pesam mais.',
  },
  {
    id: 'prazo-de-entrega',
    question: 'Quanto tempo leva para ficar pronto?',
    answer:
      'Depende do processo, mas a maioria dos projetos tem as primeiras entregas em 1 a 2 semanas. A gente trabalha em ciclos semanais e mostra o que ficou pronto para você validar.',
  },
  {
    id: 'precisa-entender-de-tecnologia',
    question: 'Preciso entender de tecnologia para contratar?',
    answer:
      'Não. Você descreve o problema e a gente monta a automação. No fim, a gente entrega uma documentação clara para a sua equipe usar sem depender de ninguém.',
  },
  {
    id: 'depois-da-entrega',
    question: 'E se o sistema parar de funcionar depois?',
    answer:
      'Os projetos de automação incluem monitoramento e documentação de uso, e o agente de IA tem ajustes de comportamento depois da entrega. O que cada projeto cobre depois de entregue a gente combina na consulta, antes de fechar.',
  },
  {
    id: 'consulta-gratuita',
    question: 'Como funciona a consulta gratuita?',
    answer:
      'É uma conversa de 30 minutos por videochamada ou WhatsApp. Você conta como são os seus processos hoje, a gente aponta onde a automação mais ajuda e passa um diagnóstico, sem cobrar e sem compromisso.',
  },
];
