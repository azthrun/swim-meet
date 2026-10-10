import type { CSSProperties } from 'react';

export interface NavBarProps {
  /** Centre menu labels. */
  links?: string[];
  /** Label of the current page — rendered in brand blue. */
  active?: string;
  onNavigate?: (link: string) => void;
  /** Utility-button label at the right end. */
  cta?: string;
  onCta?: () => void;
  sticky?: boolean;
  style?: CSSProperties;
}

export declare function NavBar(props: NavBarProps): JSX.Element;
