import { Component, type ReactNode } from 'react';

interface MenuBoundaryProps {
  /** What shows in place of the menu when its code could not be loaded. */
  fallback: ReactNode;
  children: ReactNode;
}

interface MenuBoundaryState {
  hasFailed: boolean;
}

/**
 * Catches the render error a failed chunk load raises (a lazy component whose import rejected), so the header, the
 * page and the footer stay. The error never leaves this boundary: a secondary control must not blank the app.
 */
export class MenuBoundary extends Component<MenuBoundaryProps, MenuBoundaryState> {
  state: MenuBoundaryState = { hasFailed: false };

  static getDerivedStateFromError(): MenuBoundaryState {
    return { hasFailed: true };
  }

  render(): ReactNode {
    return this.state.hasFailed ? this.props.fallback : this.props.children;
  }
}

export default MenuBoundary;
