import { useEffect, useState } from 'react';
import { calculateMinimapPair, type MinimapInput, type MinimapPair } from './minimapData';
import { useMsaDataSession, type MsaDataSession } from './sharedDataSession';
type Entry = { result: MinimapPair | null; promise: Promise<MinimapPair> | null; users: number; controller: AbortController | null; timer?: ReturnType<typeof setTimeout> };
const cache = new WeakMap<MinimapInput, Entry>();
function entryFor(input: MinimapInput) {
  let entry = cache.get(input);
  if (!entry) { entry = { result: null, promise: null, users: 0, controller: null }; cache.set(input, entry); }
  return entry;
}
function compute(input: MinimapInput, entry: Entry, session: MsaDataSession) {
  if (entry.result) return Promise.resolve(entry.result);
  if (entry.promise) return entry.promise;
  const controller = new AbortController(); entry.controller = controller;
  entry.promise = (typeof Worker === 'undefined' && import.meta.env.MODE === 'test'
    ? Promise.resolve(calculateMinimapPair(input))
    : session.run<MinimapPair>('overview', input, controller.signal))
    .then(result => { entry.result = result; return result; })
    .finally(() => { entry.promise = null; entry.controller = null; });
  return entry.promise;
}
/** The horizontal and vertical controls subscribe to the same image calculation. */
export function useMinimapImages(input: MinimapInput) {
  const session = useMsaDataSession(input.sourceRows ?? input.rows)!;
  const [state, setState] = useState<{ input: MinimapInput; result: MinimapPair | null; failed: boolean }>({ input, result: null, failed: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const entry = entryFor(input); entry.users++;
    if (entry.timer) clearTimeout(entry.timer);
    let current = true;
    setState({ input, result: entry.result, failed: false });
    compute(input, entry, session).then(result => {
      if (current) setState({ input, result, failed: false });
    }, error => {
      if (current && error?.name !== 'AbortError') setState({ input, result: null, failed: true });
    });
    return () => {
      current = false; entry.users--;
      if (!entry.users) entry.timer = setTimeout(() => { if (!entry.users) entry.controller?.abort(); }, 0);
    };
  }, [input, session, attempt]);
  return { images: state.input === input ? state.result : null, failed: state.input === input && state.failed, retry: () => setAttempt(n => n + 1) };
}
