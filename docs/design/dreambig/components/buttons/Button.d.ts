import type { CSSProperties, ReactNode } from 'react';

/**
 * DreamBig's action set: one blue pill per view, white pill beside it, tight 8px utility button.
 */
export interface ButtonProps {
  /** primary = the single blue CTA; secondary = white pill on soft shadow; utility = 8px nav/plan-select button. */
  variant?: 'primary' | 'secondary' | 'utility';
  /** Pill sizes only — utility always renders at its documented 4px/14px padding. */
  size?: 'sm' | 'md' | 'lg';
  /** Leading Lucide icon name. */
  icon?: string;
  /** Trailing Lucide icon name. */
  trailingIcon?: string;
  disabled?: boolean;
  /** Force the pressed state (darker fill + scale) for specimens and docs. */
  pressed?: boolean;
  /** Renders an anchor instead of a button. */
  href?: string;
  fullWidth?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export declare function Button(props: ButtonProps): JSX.Element;
