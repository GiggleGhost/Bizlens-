export interface ColumnDef {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'DATE';
  sampleValues: any[];
  nullCount: number;
}

export interface DatasetMetadata {
  id: string;
  name: string;
  tableName: string;
  isSynthetic: boolean;
  description: string;
  rowCount: number;
  columns: ColumnDef[];
  sampleRows: Record<string, any>[];
  createdAt: string;
}

export interface ChartConfig {
  chartType: 'kpi' | 'bar' | 'line' | 'pie' | 'table';
  xAxis?: string;
  yAxis?: string;
}

export interface QueryResult {
  sql: string;
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  spokenExplanation: string;
  keyTakeaways: string[];
  followUps: string[];
  chartConfig: ChartConfig;
  engine?: 'gemini' | 'analytical';
  isQuotaExhausted?: boolean;
  requestId?: string;
  apiStatus?: {
    category: string;
    message: string;
  };
}

export interface ConversationTurn {
  id: string;
  timestamp: string;
  question: string;
  datasetName: string;
  datasetId: string;
  sql?: string;
  result?: QueryResult;
  error?: string;
}
