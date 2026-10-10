import type { CSSProperties, ReactNode } from 'react';

export interface EmptyStateProps {
  /** Lucide icon name shown in a white circle. Replace with real brand illustration when available. */
  icon?: string;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  style?: CSSProperties;
}

export declare function EmptyState(props: EmptyStateProps): JSX.Element;
