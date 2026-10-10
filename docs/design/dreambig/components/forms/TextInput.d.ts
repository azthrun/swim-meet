import type { CSSProperties } from 'react';

export interface TextInputProps {
  label?: string;
  /** Helper or error text below the field. */
  hint?: string;
  type?: string;
  placeholder?: string;
  /** Border switches to accent-orange — the source exposes no dedicated error ramp. */
  invalid?: boolean;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  style?: CSSProperties;
}

export declare function TextInput(props: TextInputProps): JSX.Element;
