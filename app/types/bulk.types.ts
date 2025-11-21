export interface BulkOperationData {
  resourceType: 'products' | 'customers' | 'orders';
  operation: 'replace' | 'add' | 'remove';
  findTag: string;
  replaceTag: string;
}

export interface BulkPreview {
  id: string;
  title?: string;
  tags: string[];
}

export interface BulkActionData {
  status?: 'queued' | 'preview' | 'quota_exceeded' | 'error';
  count?: number;
  preview?: BulkPreview[];
  resourceType?: string;
  operation?: string;
  findTag?: string;
  replaceTag?: string;
  message?: string;
  current?: number;
  limit?: number | null;
  jobId?: string;
}

export interface UsageData {
  count: number;
  period: string;
}
