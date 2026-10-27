export type HeroTaskId = 'planilha-whatsapp' | 'atendimento' | 'notas' | 'follow-up';

export interface HeroTaskOption {
  value: HeroTaskId;
  label: string;
}

/** As tarefas que a frase do hero oferece. A ordem é a da lista aberta pela pílula. */
export const heroTasks: readonly HeroTaskOption[] = [
  { value: 'planilha-whatsapp', label: 'planilha e WhatsApp' },
  { value: 'atendimento', label: 'atendimento no WhatsApp' },
  { value: 'notas', label: 'emissão de notas' },
  { value: 'follow-up', label: 'follow-up de vendas' },
];
