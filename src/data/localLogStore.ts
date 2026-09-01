/**
 * 本地非敏感日志策略。
 *
 * 日志只用于排查运行问题：字段采用白名单，最多保留最近 7 天且不超过 5MB。
 * 该模块不读写文件，方便在 RN 层测试并由原生层负责最终持久化。
 */

export const MAX_LOG_BYTES = 5 * 1024 * 1024;
export const LOG_RETENTION_DAYS = 7;

export interface LocalLogEntry {
  timestamp: string;
  event: string;
  details?: Record<string, unknown>;
}

const SAFE_DETAIL_KEYS = new Set([
  'action',
  'errorCode',
  'platform',
  'appVersion',
  'osVersion',
  'deviceModel',
  'durationMs',
  'status',
]);

export function sanitizeLogDetails(
  details: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(details).filter(([key, value]) => {
      if (!SAFE_DETAIL_KEYS.has(key)) {
        return false;
      }
      return ['string', 'number', 'boolean'].includes(typeof value);
    }),
  );
}

function byteLength(value: string): number {
  return encodeURIComponent(value).replace(/%[0-9A-F]{2}/g, 'x').length;
}

function serializeEntry(entry: LocalLogEntry): string {
  return `${JSON.stringify(entry)}\n`;
}

function trimEntryToLimit(entry: LocalLogEntry): LocalLogEntry {
  if (byteLength(serializeEntry(entry)) <= MAX_LOG_BYTES) {
    return entry;
  }

  const safeDetails = entry.details ? {...entry.details} : undefined;
  if (safeDetails) {
    for (const [key, value] of Object.entries(safeDetails)) {
      if (typeof value === 'string') {
        safeDetails[key] = value.slice(0, 512);
      }
    }
  }
  return {
    ...entry,
    event: entry.event.slice(0, 256),
    details: safeDetails,
  };
}

export function appendLog(
  entries: LocalLogEntry[],
  entry: Omit<LocalLogEntry, 'timestamp'> & {timestamp?: string},
  now = new Date(),
): LocalLogEntry[] {
  const cutoff = now.getTime() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const recent = entries.filter(item => {
    const timestamp = Date.parse(item.timestamp);
    return Number.isFinite(timestamp) && timestamp >= cutoff;
  });
  const next: LocalLogEntry = trimEntryToLimit({
    timestamp: entry.timestamp ?? now.toISOString(),
    event: entry.event,
    details: entry.details ? sanitizeLogDetails(entry.details) : undefined,
  });
  const result = [...recent, next];

  while (result.length > 1 && byteLength(serializeLogs(result)) > MAX_LOG_BYTES) {
    result.shift();
  }
  return result;
}

export function serializeLogs(entries: LocalLogEntry[]): string {
  return entries.map(serializeEntry).join('');
}
