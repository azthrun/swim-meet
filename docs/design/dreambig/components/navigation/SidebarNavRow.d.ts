import type { CSSProperties } from 'react';

export interface SidebarNavRowProps {
  /** Lucide icon name. */
  icon?: string;
  label: string;
  /** Optional right-aligned count. */
  count?: number | string;
  /** Active rows take the paper fill plus a 2px blue indicator. */
  active?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

export declare function SidebarNavRow(props: SidebarNavRowProps): JSX.Element;
