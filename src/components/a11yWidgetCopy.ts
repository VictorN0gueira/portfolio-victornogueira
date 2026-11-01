import type { A11yKey } from '../contexts/useAccessibility';

// Os textos do botão de acessibilidade e do painel dele. Os nomes `triggerLabel` e `panelLabel` são contratos dos
// testes e2e (devices, layout, scroll-lock) e do leitor de tela: não mudam.
// K:L16: o painel diz "Pausar animações" (o que a opção faz no site todo) e o botão de pausa de cada bloco que se mexe
// diz "Pausar animação" (no singular, porque pausa só aquele bloco). De propósito, sem mudança de texto.
export const a11yWidgetCopy = {
  triggerLabel: 'Abrir opções de acessibilidade',
  panelLabel: 'Opções de acessibilidade',
  panelTitle: 'Acessibilidade',
  resetLabel: 'Resetar tudo',
  // O botão também se arrasta; estes botões são a outra via (WCAG 2.5.7), sem arrastar.
  positionGroupLabel: 'Posição do botão',
  moveLeftLabel: 'Mover o botão para a esquerda',
  moveRightLabel: 'Mover o botão para a direita',
  moveUpLabel: 'Mover o botão para cima',
  moveDownLabel: 'Mover o botão para baixo',
  resetPositionLabel: 'Voltar ao padrão',
} as const;

export const a11yOptionLabels: Readonly<Record<A11yKey, string>> = {
  fontSize: 'Texto maior',
  highContrast: 'Alto contraste',
  grayscale: 'Escala de cinza',
  noAnimations: 'Pausar animações',
  underlineLinks: 'Sublinhar links',
  readableFont: 'Fonte legível',
};

/** The short badge in the panel header: "1 ativo", "2 ativos". */
export function activeBadgeText(count: number): string {
  return `${count} ${count === 1 ? 'ativo' : 'ativos'}`;
}

/** What a screen reader hears on the trigger when something is on: "1 opção ativa", "2 opções ativas". */
export function activeSummaryText(count: number): string {
  return count === 1 ? '1 opção ativa' : `${count} opções ativas`;
}
