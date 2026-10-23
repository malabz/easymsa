import { afterEach, describe, expect, it, vi } from 'vitest';
import { MsaDataSession, type SessionMessage } from './sharedDataSession';
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
afterEach(() => vi.useRealTimers());
describe('one alignment data owner', () => {
  it('initializes sequence data once across analysis, motif, range, overview and export', async () => {
    const worker = new MockWorker();
    const session = new MsaDataSession(rows, () => worker as unknown as Worker);
    const analysis = session.run('analysis', { sequences: rows, sourceFingerprint: 'fixture' });
    const motif = session.run('motif', { sequences: [rows[1]], query: 'GT' });
    const range = session.run('range', { sequences: rows, reference: rows[0] });
    const overview = session.run('overview', { rows: [rows[1], rows[0]], sourceRows: rows });
    const exported = session.run('export', { rows });
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
    const first = session.run('analysis', { sequences: rows });
    const controller = new AbortController();
    const second = session.run('motif', { sequences: rows }, controller.signal);
    const rejected = expect(second).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort(); await rejected;
    worker.complete('done'); expect(await first).toBe('done');
    expect(worker.terminate).not.toHaveBeenCalled(); expect(session.diagnostics.dataTransfers).toBe(1); session.dispose();
  });
  it('cancels active work cooperatively, ignores late replies and retains the data owner', async () => {
    const workers: MockWorker[] = []; const session = new MsaDataSession(rows, () => { const worker = new MockWorker(); workers.push(worker); return worker as unknown as Worker; });
    const controller = new AbortController(); const first = session.run('motif', { sequences: rows }, controller.signal);
    const rejected = expect(first).rejects.toMatchObject({ name: 'AbortError' });
    const next = session.run('overview', { rows }); controller.abort(); await rejected;
    expect(workers[0].terminate).not.toHaveBeenCalled(); expect(workers).toHaveLength(1);
    expect(workers[0].postMessage.mock.calls.some(([message]) => message.type === 'cancel')).toBe(true);
    workers[0].complete('stale'); workers[0].complete('current'); expect(await next).toBe('current');
    expect(session.diagnostics.dataTransfers).toBe(1); session.dispose();
  });
  it('keeps the session through a strict-mode remount and releases after the last consumer', async () => {
    vi.useFakeTimers(); const worker = new MockWorker(); const session = new MsaDataSession(rows, () => worker as unknown as Worker);
    const release = session.retain(); release(); const releaseAgain = session.retain();
    const promise = session.run('analysis', { sequences: rows }); worker.complete('ok'); await promise;
    await vi.runAllTimersAsync(); expect(worker.terminate).not.toHaveBeenCalled();
    releaseAgain(); await vi.runAllTimersAsync(); expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it('rejects rows from a different source rather than resolving indexes by title', async () => {
    const session = new MsaDataSession(rows);
    await expect(session.run('range', { rows: [{ ...rows[0] }] })).rejects.toThrow('does not belong');
  });
});
