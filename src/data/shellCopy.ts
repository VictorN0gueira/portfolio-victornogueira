/** Strings of the app shell: the error recovery, the loading states and what is announced to screen readers. */
export const shellCopy = {
  errorBoundary: {
    heading: 'Essa parte não carregou',
    body: 'Pode ter sido a conexão. Tenta de novo ou fala com a gente no WhatsApp.',
    retry: 'Tentar de novo',
    whatsapp: 'Falar com a gente no WhatsApp',
    newTab: '(abre em nova aba)',
    whatsappMessage: 'Olá! O site da VN One não carregou direito.',
  },
  /** The short version, for one section of the home that failed while the rest of the page works. */
  sectionError: {
    heading: 'Esta seção não carregou',
    retry: 'Tentar de novo',
  },
  pageLoading: 'Carregando página',
  quoteFilled: 'Mensagem preenchida com a sua estimativa',
} as const;
