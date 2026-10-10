import type { CSSProperties, ReactNode } from 'react';

export interface ToastProps {
  children?: ReactNode;
  /** Lucide icon name — "check" for success, "info", "alert-triangle". */
  icon?: string;
  /** Glyph colour from the accent palette; status is carried by the accents, not a semantic ramp. */
  accent?: string;
  /** Optional trailing link or button. */
  action?: ReactNode;
  style?: CSSProperties;
}

export declare function Toast(props: ToastProps): JSX.Element;
