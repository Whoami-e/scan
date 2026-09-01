import {
  appendLog,
  sanitizeLogDetails,
  serializeLogs,
  MAX_LOG_BYTES,
} from '../../src/data/localLogStore';

describe('localLogStore', () => {
  test('removes document-identifying and file-content fields', () => {
    const safe = sanitizeLogDetails({
      action: 'export',
      title: '报销单',
      fileName: '报销单.pdf',
      path: '/data/user/0/com.scan/files/report.pdf',
      imageContent: 'base64-image',
      pdfContent: 'secret-pdf',
      errorCode: 'PDF_EXPORT_FAILED',
    });

    expect(safe).toEqual({action: 'export', errorCode: 'PDF_EXPORT_FAILED'});
  });

  test('keeps only recent seven days and stays below the size limit', () => {
    const now = new Date('2026-08-29T00:00:00.000Z');
    const entries = [
      {timestamp: '2026-08-20T00:00:00.000Z', event: 'old'},
      {timestamp: '2026-08-28T00:00:00.000Z', event: 'recent'},
    ];
    const next = appendLog(entries, {event: 'new'}, now);

    expect(next.map(entry => entry.event)).toEqual(['recent', 'new']);

    const oversized = appendLog(
      [],
      {event: 'x'.repeat(MAX_LOG_BYTES + 100)},
      now,
    );
    expect(serializeLogs(oversized).length).toBeLessThanOrEqual(MAX_LOG_BYTES);
  });

  test('serializes logs as non-sensitive JSON lines', () => {
    const serialized = serializeLogs([
      {timestamp: '2026-08-29T00:00:00.000Z', event: 'app_started'},
    ]);

    expect(serialized).toContain('app_started');
    expect(serialized).not.toContain('title');
    expect(serialized.endsWith('\n')).toBe(true);
  });
});
