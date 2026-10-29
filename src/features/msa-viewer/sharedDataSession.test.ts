import { afterEach, describe, expect, it, vi } from 'vitest';
import { MsaDataSession, type SessionMessage } from './sharedDataSession';
import type { DataOperation, DataRequest } from './sharedDataProtocol';
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn<(message: SessionMessage) => void>();
  terminate = vi.fn();
  completed = new Set<number>();
  complete(result: unknown, id?: number) {
    const message = this.postMessage.mock.calls.map(([message]) => message).find(message => message.type === 'run' && (id !== undefined ? message.id === id : !this.completed.has(message.id)));
    if (message?.type === 'run') { this.completed.add(message.id); this.onmessage?.({ data: { id: message.id, result } } as MessageEvent); }
  }
}
const rows = [{ id: 'a', sequence: 'ACGT' }, { id: 'b', sequence: 'A-GT' }];
const requests = {
  analysis: { protocolVersion: 4, type: 'analyze', generation: 1, requestId: 1,
    sourceFingerprint: 'fixture', scope: 'all', scopeRowKeys: ['a', 'b'], sequences: rows, alignmentLength: 4 },
  motif: { protocolVersion: 3, type: 'search', requestId: 2, sourceFingerprint: 'fixture',
    sequences: [rows[1]], query: 'GT', matchMode: 'strict', strandMode: 'forward', maxMatches: 20_000 },
  range: { protocolVersion: 1, type: 'calculate', requestId: 3, sourceFingerprint: 'fixture',
    scopeRowKeys: ['a', 'b'], sequences: rows, range: { start: 1, end: 4 }, consensusMode: 'majority', reference: rows[0] },
  overview: { rows: [rows[1], rows[0]], sourceRows: rows, positions: { kind: 'identity', length: 4 }, scheme: 'nucleotide', store: null },
  export: { rows, positions: { kind: 'identity', length: 4 }, offset: 0, length: 4, start: 1, end: 4, contiguous: true }
} satisfies { [K in DataOperation]: DataRequest<K> };
afterEach(() => vi.useRealTimers());
describe('one alignment data owner', () => {
  it('initializes sequence data once across analysis, motif, range, overview and export', async () => {
    const worker = new MockWorker();
    const session = new MsaDataSession(rows, () => worker as unknown as Worker);
    const analysis = session.run('analysis', requests.analysis);
    const motif = session.run('motif', requests.motif);
    const range = session.run('range', requests.range);
    const overview = session.run('overview', requests.overview);
    const exported = session.run('export', requests.export);
    for (let i = 0; i < 5; i++) worker.complete(i);
    expect(await Promise.all([analysis, motif, range, overview, exported])).toEqual([0, 1, 2, 3, 4]);
    const messages = worker.postMessage.mock.calls.map(([value]) => value);
    expect(messages.filter(message => message.type === 'initialize')).toHaveLength(1);
    expect(messages.slice(1).every(message => message.type === 'run' && !('sequences' in message.request) && !('rows' in message.request) && !('sourceRows' in message.request))).toBe(true);
    expect(messages[2]).toMatchObject({ rows: [1] });
    expect(messages[3]).toMatchObject({ reference: 0 });
    expect(messages[4]).toMatchObject({ rows: [1, 0] });
    expect(session.diagnostics).toEqual({ workerStarts: 1, dataTransfers: 1, tasks: 5 });
    session.dispose();
  });
  it('cancels queued work without copying data again', async () => {
    const worker = new MockWorker(); const session = new MsaDataSession(rows, () => worker as unknown as Worker);
    const first = session.run('analysis', requests.analysis);
    const controller = new AbortController();
    const second = session.run('motif', { ...requests.motif, sequences: rows }, controller.signal);
    const rejected = expect(second).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort(); await rejected;
    worker.complete('done'); expect(await first).toBe('done');
    expect(worker.terminate).not.toHaveBeenCalled(); expect(session.diagnostics.dataTransfers).toBe(1); session.dispose();
  });
  it('cancels active work cooperatively, ignores late replies and retains the data owner', async () => {
    const workers: MockWorker[] = []; const session = new MsaDataSession(rows, () => { const worker = new MockWorker(); workers.push(worker); return worker as unknown as Worker; });
    const controller = new AbortController(); const first = session.run('motif', { ...requests.motif, sequences: rows }, controller.signal);
    const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    const next = session.run('overview', { ...requests.overview, rows }); controller.abort(); await rejected;
    expect(workers[0].terminate).not.toHaveBeenCalled(); expect(workers).toHaveLength(1);
    expect(workers[0].postMessage.mock.calls.some(([message]) => message.type === 'cancel')).toBe(true);
    workers[0].complete('stale'); workers[0].complete('current'); expect(await next).toBe('current');
    expect(session.diagnostics.dataTransfers).toBe(1); session.dispose();
  });
  it('keeps the session through a strict-mode remount and releases after the last consumer', async () => {
    vi.useFakeTimers(); const worker = new MockWorker(); const session = new MsaDataSession(rows, () => worker as unknown as Worker);
    const release = session.retain(); release(); const releaseAgain = session.retain();
    const promise = session.run('analysis', requests.analysis); worker.complete('ok'); await promise;
    await vi.runAllTimersAsync(); expect(worker.terminate).not.toHaveBeenCalled();
    releaseAgain(); await vi.runAllTimersAsync(); expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it('rejects rows from a different source rather than resolving indexes by title', async () => {
    const session = new MsaDataSession(rows);
    await expect(session.run('range', { ...requests.range, sequences: [{ ...rows[0] }] })).rejects.toThrow('does not belong');
  });
});
