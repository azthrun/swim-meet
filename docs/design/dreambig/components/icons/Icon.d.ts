import type { CSSProperties } from 'react';

export interface IconProps {
  /** Lucide icon name, kebab-case or PascalCase (e.g. "check", "ArrowRight"). */
  name: string;
  /** Pixel box. 16 inline with body-sm, 20 default, 24 in nav / empty states. */
  size?: number;
  /** Lucide default 2 is the brand weight; do not go heavier. */
  strokeWidth?: number;
  /** Defaults to currentColor so icons inherit the ink ramp. */
  color?: string;
  style?: CSSProperties;
}

export declare function Icon(props: IconProps): JSX.Element;
