import type { ContactMethod } from '../../lib/contact';

/** Os textos do formulário de contato (o texto legal do consentimento fica em ContactConsent). */
export const contactFormCopy = {
  method: {
    legend: 'Escolha o método de contato preferido',
    groupLabel: 'Método de contato',
    email: 'Por e-mail',
    whatsapp: 'Por WhatsApp',
  },
  labels: {
    nome: 'Nome',
    servico: 'Serviço de interesse',
    email: 'E-mail',
    whatsapp: 'WhatsApp',
    mensagem: 'Mensagem',
  },
  placeholders: {
    nome: 'Seu nome',
    servico: 'Selecione um serviço',
    email: 'voce@empresa.com.br',
    whatsapp: '+55 81 99999-9999',
    mensagem: 'Conta rapidinho o que você precisa',
  },
  // Shown under a field that has reached its cap (see FieldCapHint).
  capHint: (max: number) => `Máximo de ${max} caracteres.`,
  submit: 'Enviar',
  sending: 'Enviando…',
  success: {
    title: 'Recebemos sua mensagem',
    text: (method: ContactMethod) =>
      `Obrigado! A gente responde pelo ${method === 'email' ? 'e-mail' : 'WhatsApp'} em breve.`,
    again: 'Enviar outra',
  },
  // A frase é lida inteira: `link` fica entre `before` e `after`.
  error: {
    before: 'Não deu pra enviar. Tenta de novo ou ',
    link: 'fala direto pelo WhatsApp',
    after: '.',
    close: 'Fechar',
  },
} as const;
