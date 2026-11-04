import { assetUrl } from '../lib/asset';

export type Testimonial = {
  id: number;
  name: string;
  role: string;
  company: string;
  logo: string;
  text: string;
  /** Texto rascunho: a fala ainda precisa ser confirmada com o cliente */
  isDraft?: boolean;
};

export const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Adailton Amancio',
    role: 'CEO',
    company: 'Contador de Padarias',
    logo: assetUrl('/clients/contador-de-padarias.webp'),
    text: 'O Victor automatizou todo o nosso processo de onboarding de clientes. O que antes levava 3 dias agora acontece em minutos. A integração com Notion e Google Drive ficou impecável.',
  },
  {
    id: 2,
    name: 'Karla Álvares',
    role: 'Proprietária',
    company: 'Loja Karla Álvares',
    logo: assetUrl('/clients/loja-karla-alvares.webp'),
    text: 'Meu link-in-bio e o sistema de captura de leads transformaram minha presença digital. As vendas pelo Instagram aumentaram muito depois das automações.',
  },
  {
    id: 3,
    name: 'Paulo Santos',
    role: 'CEO',
    company: 'Proplast',
    logo: assetUrl('/clients/proplast.webp'),
    text: 'A importação massiva de NF-e e o dashboard de consumo CRM nos deram uma visão que não tínhamos antes. Economia de horas semanais com processos que eram 100% manuais.',
  },
  {
    id: 4,
    name: 'Micael Santiago',
    role: 'Desenvolvedor',
    company: 'Micael Santiago',
    logo: assetUrl('/clients/micael-santiago.webp'),
    text: 'O fluxo de captura e disparo de leads no WhatsApp foi um game-changer. Profissionalismo e agilidade que eu nunca tinha visto em automação.',
  },
  {
    id: 5,
    name: 'Henrique França',
    role: 'CEO',
    company: 'Henrique França',
    logo: assetUrl('/clients/henrique-franca.webp'),
    text: 'O Hub081 juntou o atendimento no WhatsApp e a gestão comercial no mesmo painel. As conversas ficam organizadas e a equipe acompanha os contatos no pipeline sem trocar de ferramenta.',
    isDraft: true,
  },
  {
    id: 6,
    name: 'Pierre Jacquin',
    role: 'CEO',
    company: 'ShipSmart',
    logo: assetUrl('/clients/shipsmart.webp'),
    text: 'As automações que o Victor construiu para nossa operação logística eliminaram horas de trabalho manual toda semana. Entregas no prazo e muito profissionalismo do início ao fim.',
    isDraft: true,
  },
];
