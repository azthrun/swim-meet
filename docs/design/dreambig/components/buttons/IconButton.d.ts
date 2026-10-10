import type { CSSProperties } from 'react';

export interface IconButtonProps {
  /** Lucide icon name. */
  icon: string;
  /** Diameter in px. 40 default; 44 minimum on touch surfaces. */
  size?: number;
  /** on-dark = translucent black over imagery / the night band; surface = white pill with soft shadow. */
  tone?: 'on-dark' | 'on-light' | 'surface';
  /** Accessible label — required, the button has no text. */
  label: string;
  style?: CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

export declare function IconButton(props: IconButtonProps): JSX.Element;
