export type CooperativeTask<T> = Generator<void, T, void>;

/** Sync entry points remain available to existing callers and numerical tests. */
export function drainTask<T>(task: CooperativeTask<T>): T {
  let step = task.next();
  while (!step.done) step = task.next();
  return step.value;
}

type Scheduled = { id: number; priority: number; lastRun: number; iterator: CooperativeTask<unknown>; done: (value: unknown) => void; failed: (error: unknown) => void };
/** A turn is bounded by checkpoints in the calculation, not by its data size. */
export class CooperativeScheduler {
  private tasks = new Map<number, Scheduled>();
  private scheduled = false;
  constructor(
    private readonly budgetMs = 8,
    private readonly scheduleTurn: (callback: () => void) => void = callback => { setTimeout(callback, 0); }
  ) {}
  add<T>(id: number, priority: number, iterator: CooperativeTask<T>, done: (value: T) => void, failed: (error: unknown) => void) {
    this.cancel(id);
    this.tasks.set(id, { id, priority, iterator, done: value => done(value as T), failed, lastRun: performance.now() });
    this.schedule();
  }
  cancel(id: number) {
    const task = this.tasks.get(id);
    this.tasks.delete(id);
    task?.iterator.return(undefined);
  }
  private schedule() {
    if (this.scheduled || !this.tasks.size) return;
    this.scheduled = true;
    this.scheduleTurn(() => { this.scheduled = false; this.turn(); });
  }
  private turn() {
    const start = performance.now();
    // Interactive work wins normally; aging guarantees background progress.
    const task = [...this.tasks.values()].sort((a, b) =>
      (b.priority + (start - b.lastRun) / 150) - (a.priority + (start - a.lastRun) / 150) || a.id - b.id)[0];
    if (!task) return;
    try {
      do {
        const step = task.iterator.next();
        if (step.done) { this.tasks.delete(task.id); task.done(step.value); break; }
      } while (performance.now() - start < this.budgetMs);
    } catch (error) { this.tasks.delete(task.id); task.failed(error); }
    task.lastRun = performance.now();
    this.schedule();
  }
}
