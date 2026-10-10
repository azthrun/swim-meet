import type { CSSProperties } from 'react';

export interface WordmarkProps {
  /** Font size in px; tracking scales with it at −4%. */
  size?: number;
  tone?: 'ink' | 'on-dark';
  style?: CSSProperties;
}

export declare function Wordmark(props: WordmarkProps): JSX.Element;
