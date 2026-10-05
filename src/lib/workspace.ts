import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import type { UseFormWatch } from "react-hook-form";
import type { ResultStage } from "./types/job";
import type { ResultTab } from "../components/results/ResultTabs";

// Deliberately memory-only: selected files, pasted sequences and notification
// addresses survive in-app navigation without being written to browser storage.
const drafts = new Map<string, unknown>();
export function readDraft<T>(key: string, fallback: T): T {
  return drafts.has(key) ? drafts.get(key) as T : fallback;
}
export function clearDraft(prefix: string) {
  for (const key of drafts.keys()) if (key.startsWith(`${prefix}:`)) drafts.delete(key);
}
export function useDraftState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readDraft(key, initial));
  const current = useRef(value);
  const update = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    const next = typeof action === "function" ? (action as (previous: T) => T)(current.current) : action;
    current.current = next;
    drafts.set(key, next);
    setValue(next);
  }, [key]);
  return [value, update];
}
export function useDraftMetadata(key: string, watch: UseFormWatch<{ jobName: string; email: string }>) {
  useEffect(() => {
    const subscription = watch(values => drafts.set(key, {
      jobName: values.jobName ?? "", email: values.email ?? "",
    }));
    return () => subscription.unsubscribe();
  }, [key, watch]);
}

type WorkKind = "submit" | "realign" | "result" | "viewer" | "job" | "example";
type WorkEntry = { kind: WorkKind; path: string };
let entries: WorkEntry[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());
export function forgetWork(kind: WorkKind) {
  entries = entries.filter(entry => entry.kind !== kind);
  emit();
}
export function forgetJobWork(jobId: string, token: string) {
  entries = entries.filter(entry => {
    if (entry.kind !== "result" && entry.kind !== "job") return true;
    const [path, query] = entry.path.split("?");
    return path.split("/").pop() !== encodeURIComponent(jobId) || new URLSearchParams(query).get("token") !== token;
  });
  emit();
}
export function useRememberWork(kind: WorkKind, enabled = true) {
  const location = useLocation();
  useEffect(() => {
    if (!enabled) return;
    const path = `${location.pathname}${location.search}`;
    if (entries[0]?.path === path && entries[0]?.kind === kind) return;
    entries = [{ kind, path }, ...entries.filter(entry => entry.kind !== kind)].slice(0, 5);
    emit();
  }, [kind, enabled, location.pathname, location.search]);
}
export function useWorkEntries() {
  return useSyncExternalStore(
    useCallback((listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, []),
    () => entries,
    () => entries,
  );
}

export function useResultLocation() {
  const [params, setParams] = useSearchParams();
  const requestedStage = params.get("stage");
  const requestedTab = params.get("tab");
  const stage: ResultStage = requestedStage === "initial" || requestedStage === "refined" ? requestedStage : "final";
  const tab: ResultTab = requestedTab === "alignment" || requestedTab === "downloads" ? requestedTab : "overview";
  function update(name: string, value: string) {
    setParams(previous => { const next = new URLSearchParams(previous); next.set(name, value); return next; }, { replace: true, preventScrollReset: true });
  }
  return { stage, setStage: (value: ResultStage) => update("stage", value), tab, setTab: (value: ResultTab) => update("tab", value) };
}
