export interface Faq {
  question: string;
  answer: string;
}

export const faqs: Faq[] = [
  {
    question: 'Meu negócio é pequeno demais para automação?',
    answer:
      'Não. Se a sua equipe gasta mais de 5 horas por semana em tarefas repetitivas, já dá para automatizar, e em empresa pequena essas horas pesam mais.',
  },
  {
    question: 'Quanto tempo leva para ficar pronto?',
    answer:
      'Depende do processo, mas a maioria dos projetos tem as primeiras entregas em 1 a 2 semanas. A gente trabalha em ciclos semanais e mostra o que ficou pronto para você validar.',
  },
  {
    question: 'Preciso entender de tecnologia para contratar?',
    answer:
      'Não. Você descreve o problema e a gente monta a automação. No fim, a gente entrega uma documentação clara para a sua equipe usar sem depender de ninguém.',
  },
  {
    question: 'E se o sistema parar de funcionar depois?',
    answer:
      'Todo projeto inclui monitoramento, documentação e suporte depois da entrega. Se algo parar de funcionar, a gente corrige.',
  },
  {
    question: 'Como funciona a consulta gratuita?',
    answer:
      'É uma conversa de 30 minutos por videochamada ou WhatsApp. Você conta como são os seus processos hoje, a gente aponta onde a automação mais ajuda e passa um diagnóstico, sem cobrar e sem compromisso.',
  },
];
