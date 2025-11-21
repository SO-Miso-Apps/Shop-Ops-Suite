export interface TagItem {
  id: string;
  tags: string[];
}

export interface ScanResults {
  duplicates: string[];
  malformed: string[];
  totalScannedTags: number;
  itemsScanned: number;
  previewItems?: TagItem[];
}

export interface CleanerActionData {
  status?: 'scanned' | 'queued' | 'quota_exceeded';
  results?: ScanResults;
  count?: number;
  jobId?: string;
  message?: string;
  current?: number;
  limit?: number | null;
}

export interface UsageData {
  count: number;
  period: string;
}
