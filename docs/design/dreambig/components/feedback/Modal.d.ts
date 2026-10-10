import type { CSSProperties, ReactNode } from 'react';

export interface ModalProps {
  open?: boolean;
  title?: ReactNode;
  children?: ReactNode;
  /** Right-aligned button row. */
  actions?: ReactNode;
  onClose?: () => void;
  width?: number;
  style?: CSSProperties;
}

export declare function Modal(props: ModalProps): JSX.Element | null;
