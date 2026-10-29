import { useEffect, useMemo } from "react";
import type { MSASequence } from "../../lib/types/msa";
import type { DataOperation, DataRequest, DataResult, SessionMessage, SessionResponse, SessionTask } from "./sharedDataProtocol";

export type { DataOperation, SessionMessage, SessionTask } from "./sharedDataProtocol";
type Pending = { id: number; message: SessionTask; resolve: (result: unknown) => void; reject: (error: unknown) => void; cleanup: () => void; progress?: (value: number) => void };
const sessions = new WeakMap<MSASequence[], MsaDataSession>();
const aborted = () => new DOMException("Operation cancelled", "AbortError");

/** One data owner per mounted alignment. Requests carry row indexes, not sequence copies. */
export class MsaDataSession {
  private worker: Worker | null = null;
  private pending = new Map<number, Pending>();
  private id = 0;
  private users = 0;
  private disposeTimer: ReturnType<typeof setTimeout> | null = null;
  private rowIndexes: Map<MSASequence, number>;
  readonly diagnostics = { workerStarts: 0, dataTransfers: 0, tasks: 0 };
  constructor(private readonly sequences: MSASequence[], private readonly createWorker = () => new Worker(new URL("./sharedData.worker.ts", import.meta.url), { type: "module" })) {
    this.rowIndexes = new Map(sequences.map((row, index) => [row, index]));
  }
  retain() {
    this.users++;
    if (this.disposeTimer) clearTimeout(this.disposeTimer);
    this.disposeTimer = null;
    return () => {
      this.users--;
      if (!this.users) this.disposeTimer = setTimeout(() => this.dispose(), 0);
    };
  }
  private index(row: MSASequence) {
    const index = this.rowIndexes.get(row);
    if (index === undefined) throw new Error("Sequence does not belong to the current alignment.");
    return index;
  }
  run<K extends DataOperation>(operation: K, input: DataRequest<NoInfer<K>>, signal?: AbortSignal, progress?: (value: number) => void): Promise<DataResult<K>> {
    if (signal?.aborted) return Promise.reject(aborted());
    const { sequences, rows, sourceRows: _sourceRows, reference, referenceSequence, ...request } = input as Record<string, unknown>;
    const selected = (sequences ?? rows ?? this.sequences) as MSASequence[];
    let message: SessionTask;
    try {
      message = { type: "run", id: ++this.id, operation, request,
        rows: selected === this.sequences ? null : selected.map(row => this.index(row)),
        reference: reference ? this.index(reference as MSASequence) : undefined,
        // The generic operation and its request remain paired while row fields are removed.
        referenceSequence: referenceSequence ? this.index(referenceSequence as MSASequence) : undefined } as SessionTask;
    } catch (error) { return Promise.reject(error); }
    return new Promise<DataResult<K>>((resolve, reject) => {
      const cancel = () => {
        const task = this.pending.get(message.id);
        if (!task) return;
        this.pending.delete(message.id); task.cleanup();
        this.worker?.postMessage({ type: "cancel", id: message.id } satisfies SessionMessage);
        reject(aborted());
      };
      signal?.addEventListener("abort", cancel, { once: true });
      const task = { id: message.id, message, progress, resolve: (result: unknown) => resolve(result as DataResult<K>), reject, cleanup: () => signal?.removeEventListener("abort", cancel) };
      this.pending.set(message.id, task);
      this.send(task);
    });
  }
  private send(pending: Pending) {
    try {
      if (!this.worker) {
        const worker = this.createWorker();
        this.worker = worker;
        this.diagnostics.workerStarts++;
        worker.onmessage = (event: MessageEvent<SessionResponse>) => {
          if (worker !== this.worker) return;
          const task = this.pending.get(event.data.id);
          if (!task) return;
          if (typeof event.data.progress === "number") { task.progress?.(event.data.progress); return; }
          this.pending.delete(task.id); task.cleanup();
          if (event.data.error) task.reject(Object.assign(new Error(event.data.error.message), event.data.error));
          else task.resolve(event.data.result);
        };
        worker.onerror = () => {
          if (worker !== this.worker) return;
          worker.terminate(); this.worker = null;
          this.failAll(new Error("Alignment worker failed."));
        };
        worker.postMessage({ type: "initialize", sequences: this.sequences } satisfies SessionMessage);
        this.diagnostics.dataTransfers++;
      }
      this.diagnostics.tasks++;
      this.worker.postMessage(pending.message);
    } catch (error) {
      this.worker?.terminate(); this.worker = null;
      this.failAll(error);
    }
  }
  private failAll(error: unknown) {
    const pending = [...this.pending.values()]; this.pending.clear();
    pending.forEach(task => { task.cleanup(); task.reject(error); });
  }
  dispose() {
    if (this.disposeTimer) clearTimeout(this.disposeTimer);
    this.disposeTimer = null;
    this.worker?.terminate(); this.worker = null;
    this.failAll(aborted());
  }
}

export function getMsaDataSession(rows: MSASequence[]) {
  let session = sessions.get(rows);
  if (!session) { session = new MsaDataSession(rows); sessions.set(rows, session); }
  return session;
}
export function useMsaDataSession(rows?: MSASequence[]) {
  const session = useMemo(() => rows ? getMsaDataSession(rows) : null, [rows]);
  useEffect(() => session?.retain(), [session]);
  return session;
}
