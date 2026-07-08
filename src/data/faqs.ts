export interface Faq {
  question: string;
  answer: string;
}

export const faqs: Faq[] = [
  {
    question: 'Meu negócio é pequeno demais para automação?',
    answer:
      'Não existe negócio pequeno demais para automação. Pequenas empresas muitas vezes são as que mais se beneficiam, pois o impacto proporcional é maior. Se você gasta mais de 5 horas por semana em tarefas repetitivas, já há espaço para ganhos reais.',
  },
  {
    question: 'Quanto tempo leva para ficar pronto?',
    answer:
      'Depende da complexidade, mas a maioria dos projetos tem primeiras entregas em 1 a 2 semanas. Trabalho em sprints semanais com validação contínua, para que você veja resultados rapidamente.',
  },
  {
    question: 'Preciso entender de tecnologia para contratar?',
    answer:
      'De jeito nenhum. Meu trabalho é traduzir suas necessidades de negócio em soluções técnicas. Você descreve o problema, eu cuido da implementação — e entrego documentação clara para que sua equipe opere sem depender de mim.',
  },
  {
    question: 'E se o sistema parar de funcionar depois?',
    answer:
      'Todo projeto inclui monitoramento, documentação e suporte pós-entrega. Se algo parar de funcionar, estou disponível para corrigir. Construo soluções pensando em estabilidade e manutenibilidade a longo prazo.',
  },
  {
    question: 'Como funciona a consulta gratuita?',
    answer:
      'É uma conversa de 30 minutos via video call ou WhatsApp. Você me conta seus processos atuais, eu identifico onde a automação gera mais valor e apresento um diagnóstico sem cobrar nada. Sem pressão, sem compromisso.',
  },
];
