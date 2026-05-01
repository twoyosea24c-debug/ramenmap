import { getLocalStorageItem, setLocalStorageItem } from '../lib/localStorage';

const ADMIN_OPERATION_LOG_KEY = 'ramenmap:admin-operation-logs';
const MAX_LOG_COUNT = 20;

export type AdminOperationType = '店舗登録' | '店舗編集' | '店舗削除' | 'CSVインポート' | 'CSVエクスポート';
export type AdminOperationResult = '成功' | '失敗';

export type AdminOperationLog = {
  id: string;
  operatedAt: string;
  operationType: AdminOperationType;
  target: string;
  result: AdminOperationResult;
  message: string;
};

function isAdminOperationLog(value: unknown): value is AdminOperationLog {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const log = value as Partial<AdminOperationLog>;
  return (
    typeof log.id === 'string' &&
    typeof log.operatedAt === 'string' &&
    typeof log.operationType === 'string' &&
    typeof log.target === 'string' &&
    typeof log.result === 'string' &&
    typeof log.message === 'string'
  );
}

export function getAdminOperationLogs(): AdminOperationLog[] {
  const raw = getLocalStorageItem(ADMIN_OPERATION_LOG_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isAdminOperationLog).slice(0, MAX_LOG_COUNT);
  } catch {
    return [];
  }
}

export function appendAdminOperationLog(input: Omit<AdminOperationLog, 'id' | 'operatedAt'>): void {
  const nextLog: AdminOperationLog = {
    id: `admin-log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    operatedAt: new Date().toISOString(),
    ...input,
  };

  const nextLogs = [nextLog, ...getAdminOperationLogs()].slice(0, MAX_LOG_COUNT);
  setLocalStorageItem(ADMIN_OPERATION_LOG_KEY, JSON.stringify(nextLogs));
}

export function clearAdminOperationLogs(): void {
  setLocalStorageItem(ADMIN_OPERATION_LOG_KEY, JSON.stringify([]));
}
