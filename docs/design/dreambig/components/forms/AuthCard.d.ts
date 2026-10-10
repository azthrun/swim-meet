import type { CSSProperties, ReactNode } from 'react';

/**
 * Sign-in / sign-up card — feature-card chrome with text-input primitives inside.
 */
export interface AuthCardProps {
  mode?: 'sign-in' | 'sign-up';
  onSubmit?: () => void;
  /** Small caption row under the button (switch-mode link, legal). */
  footer?: ReactNode;
  style?: CSSProperties;
}

export declare function AuthCard(props: AuthCardProps): JSX.Element;
