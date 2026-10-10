import type { CSSProperties, ReactNode } from 'react';

export interface DataColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

/**
 * Data table: paper header in uppercase eyebrow type, body-sm rows, hairline row rules.
 */
export interface DataTableProps {
  columns?: DataColumn[];
  /** Row objects keyed by column key; values may be nodes (badges, links). */
  rows?: Record<string, ReactNode>[];
  style?: CSSProperties;
}

export declare function DataTable(props: DataTableProps): JSX.Element;
