import type { CSSProperties, ReactNode } from 'react';

export interface BadgePillProps {
  /** primary = white pill with blue label (the marketing eyebrow); on-dark for the night band. */
  tone?: 'primary' | 'ink' | 'on-dark';
  /** Optional category dot — pass an accent token, e.g. "var(--accent-pink)". */
  dot?: string;
  children?: ReactNode;
  style?: CSSProperties;
}

export declare function BadgePill(props: BadgePillProps): JSX.Element;
