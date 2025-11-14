export type ColumnDef<T = any> = {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  width?: string;
  cellClass?: string | ((row: T) => string | string[]);
  cellTplName?: string;
};

export type TableFilters = Record<string, string | number | boolean | null | undefined>;
