export type Testimonial = {
  id: number;
  name: string;
  role: string;
  company: string;
  logo: string;
  text: string;
  /** 'cover' para logos com fundo próprio opaco, 'contain' é o padrão */
  logoFit?: 'contain' | 'cover';
  /** Texto rascunho: a fala ainda precisa ser confirmada com o cliente */
  isDraft?: boolean;
};

export const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Adailton Amancio',
    role: 'CEO',
    company: 'Contador de Padarias',
    logo: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=CP%2FS%C3%8DMBOLO%20S%20FUNDO%201.png&version_id=null',
    text: 'O Victor automatizou todo o nosso processo de onboarding de clientes. O que antes levava 3 dias agora acontece em minutos. A integração com Notion e Google Drive ficou impecável.',
  },
  {
    id: 2,
    name: 'Karla Alvarés',
    role: 'Proprietária',
    company: 'Loja Karla Alvarés',
    logo: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Loja%20Karla%20Alvares%2FLogo%20-%20Loja%20Karla%20%C3%81lvares.png&version_id=null',
    text: 'Meu link-in-bio e o sistema de captura de leads transformaram minha presença digital. As vendas pelo Instagram aumentaram muito depois das automações.',
  },
  {
    id: 3,
    name: 'Paulo Santos',
    role: 'CEO',
    company: 'Proplast',
    logo: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Proplast%2FLogo%20-%20Proplast.png&version_id=null',
    text: 'A importação massiva de NF-e e o dashboard de consumo CRM nos deram uma visão que não tínhamos antes. Economia de horas semanais com processos que eram 100% manuais.',
  },
  {
    id: 4,
    name: 'Micael Santiago',
    role: 'Desenvolvedor',
    company: 'Micael Santiago',
    logo: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Micael%20Santiago%2FMicaelsantiago.png&version_id=null',
    text: 'O fluxo de captura e disparo de leads no WhatsApp foi um game-changer. Profissionalismo e agilidade que eu nunca tinha visto em automação.',
  },
  {
    id: 5,
    name: 'Henrique França',
    role: 'CEO',
    company: 'Henrique França',
    logo: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=Henrique%20Fran%C3%A7a%2Flogo-hf.png&version_id=null',
    text: 'O sistema de captura e qualificação de leads por IA mudou nosso atendimento. Os contatos chegam organizados no pipeline e o WhatsApp integrado agilizou todo o processo comercial.',
    logoFit: 'cover',
    isDraft: true,
  },
  {
    id: 6,
    name: 'Pierre Jacquin',
    role: 'CEO',
    company: 'ShipSmart',
    logo: 'https://minio.vnone.com.br/api/v1/buckets/empresas/objects/download?preview=true&prefix=ShipSmart%2FLogo.jpg&version_id=null',
    text: 'As automações que o Victor construiu para nossa operação logística eliminaram horas de trabalho manual toda semana. Entregas no prazo e muito profissionalismo do início ao fim.',
    logoFit: 'cover',
    isDraft: true,
  },
];
