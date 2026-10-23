import { useEffect, useMemo } from "react";
import type { MSASequence } from "../../lib/types/msa";

export type DataOperation = "analysis" | "motif" | "range" | "overview" | "export";
export type SessionTask = {
  type: "run"; id: number; operation: DataOperation; rows: number[] | null;
  reference?: number; referenceSequence?: number; request: Record<string, unknown>;
};
export type SessionMessage = { type: "initialize"; sequences: MSASequence[] } | SessionTask;
type Pending = { id: number; message: SessionTask; resolve: (result: unknown) => void; reject: (error: unknown) => void; cleanup: () => void; progress?: (value: number) => void };
const sessions = new WeakMap<MSASequence[], MsaDataSession>();
const aborted = () => new DOMException("Operation cancelled", "AbortError");

/** One data owner per mounted alignment. Requests carry row indexes, not sequence copies. */
export class MsaDataSession {
  private worker: Worker | null = null;
  private active: Pending | null = null;
  private queue: Pending[] = [];
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
  run<T>(operation: DataOperation, input: object, signal?: AbortSignal, progress?: (value: number) => void): Promise<T> {
    if (signal?.aborted) return Promise.reject(aborted());
    const { sequences, rows, sourceRows: _sourceRows, reference, referenceSequence, ...request } = input as Record<string, unknown>;
    const selected = (sequences ?? rows ?? this.sequences) as MSASequence[];
    let message: SessionTask;
    try {
      message = { type: "run", id: ++this.id, operation, request,
        rows: selected === this.sequences ? null : selected.map(row => this.index(row)),
        reference: reference ? this.index(reference as MSASequence) : undefined,
        referenceSequence: referenceSequence ? this.index(referenceSequence as MSASequence) : undefined };
    } catch (error) { return Promise.reject(error); }
    return new Promise<T>((resolve, reject) => {
      const cancel = () => {
        const queued = this.queue.findIndex(task => task.id === message.id);
        if (queued >= 0) { this.queue.splice(queued, 1)[0].cleanup(); reject(aborted()); }
        if (this.active?.id === message.id) {
          this.active.cleanup(); this.active = null;
          this.worker?.terminate(); this.worker = null;
          reject(aborted()); queueMicrotask(() => this.pump());
        }
      };
      signal?.addEventListener("abort", cancel, { once: true });
      this.queue.push({ id: message.id, message, progress, resolve: result => resolve(result as T), reject, cleanup: () => signal?.removeEventListener("abort", cancel) });
      this.pump();
    });
  }
  private pump() {
    if (this.active || !this.queue.length) return;
    this.active = this.queue.shift()!;
    try {
      if (!this.worker) {
        const worker = this.createWorker();
        this.worker = worker;
        this.diagnostics.workerStarts++;
        worker.onmessage = event => {
          if (worker !== this.worker || event.data.id !== this.active?.id) return;
          if (typeof event.data.progress === "number") { this.active?.progress?.(event.data.progress); return; }
          const task = this.active!; this.active = null; task.cleanup();
          if (event.data.error) task.reject(Object.assign(new Error(event.data.error.message), event.data.error));
          else task.resolve(event.data.result);
          this.pump();
        };
        worker.onerror = () => {
          if (worker !== this.worker) return;
          const task = this.active; this.active = null;
          worker.terminate(); this.worker = null;
          task?.cleanup(); task?.reject(new Error("Alignment worker failed.")); this.pump();
        };
        worker.postMessage({ type: "initialize", sequences: this.sequences } satisfies SessionMessage);
        this.diagnostics.dataTransfers++;
      }
      this.diagnostics.tasks++;
      this.worker.postMessage(this.active.message);
    } catch (error) {
      const task = this.active; this.active = null;
      this.worker?.terminate(); this.worker = null;
      task?.cleanup(); task?.reject(error); this.pump();
    }
  }
  dispose() {
    if (this.disposeTimer) clearTimeout(this.disposeTimer);
    this.disposeTimer = null;
    this.worker?.terminate(); this.worker = null;
    const pending = [...this.queue, ...(this.active ? [this.active] : [])];
    this.queue = []; this.active = null;
    pending.forEach(task => { task.cleanup(); task.reject(aborted()); });
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
