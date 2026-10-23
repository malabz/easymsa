import { afterEach, expect, it, vi } from 'vitest';
import { CooperativeScheduler, drainTask } from './cooperativeTask';

afterEach(() => vi.useRealTimers());
it('runs interactive work before background work and returns exact results', async () => {
  vi.useFakeTimers(); const order: string[] = []; const scheduler = new CooperativeScheduler(0);
  function* job(name: string) { for (let i = 0; i < 4; i++) { order.push(name); yield; } return 42; }
  const done = vi.fn(); const failed = vi.fn();
  scheduler.add(1, 0, job('background'), done, failed);
  scheduler.add(2, 4, job('interactive'), done, failed);
  await vi.runAllTimersAsync();
  expect(order.slice(0,4)).toEqual(Array(4).fill('interactive'));
  expect(done).toHaveBeenCalledTimes(2); expect(done).toHaveBeenCalledWith(42); expect(failed).not.toHaveBeenCalled();
});
it('cancels at a checkpoint without publishing a partial result', async () => {
  vi.useFakeTimers(); const scheduler = new CooperativeScheduler(0); const done = vi.fn(), failed = vi.fn(); let steps = 0, closed = false;
  function* job() { try { for (let i=0;i<100;i++) {steps++; yield;} return 1; } finally {closed=true;} }
  scheduler.add(1, 1, job(), done, failed); await vi.advanceTimersToNextTimerAsync(); scheduler.cancel(1);
  await vi.runAllTimersAsync(); expect(steps).toBe(1); expect(closed).toBe(true); expect(done).not.toHaveBeenCalled(); expect(failed).not.toHaveBeenCalled();
});
it('sync callers preserve generator calculation order', () => {
  function* sum() {let result=0; for(let i=0;i<100;i++) {result += i/3; yield;} return result; }
  let expected=0; for(let i=0;i<100;i++) expected+=i/3;
  expect(drainTask(sum())).toBe(expected);
});
