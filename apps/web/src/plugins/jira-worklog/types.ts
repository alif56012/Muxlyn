export interface WorklogEntry {
  id: string;
  taskKey: string;
  date: string;
  hours: number;
  comment?: string;
  type: 'manual' | 'preset' | 'auto';
  issueSummary?: string;
}

export interface WorklogCreateInput {
  taskKey: string;
  date: string;
  hours: number;
  comment?: string;
}

export interface WorklogUpdateInput {
  id: string;
  taskKey?: string;
  date?: string;
  hours?: number;
  comment?: string;
}
