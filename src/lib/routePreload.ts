import type { ComponentType } from "react";

type RouteModule = { default: ComponentType };
type RouteLoader = () => Promise<RouteModule>;

export const routeLoaders = {
  about: () => import("../routes/AboutPage").then((m) => ({ default: m.AboutPage })),
  docs: () => import("../routes/DocsPage").then((m) => ({ default: m.DocsPage })),
  job: () => import("../routes/JobStatusPage").then((m) => ({ default: m.JobStatusPage })),
  lookup: () => import("../routes/LookupPage").then((m) => ({ default: m.LookupPage })),
  results: () => import("../routes/ResultsPage").then((m) => ({ default: m.ResultsPage })),
  submit: () => import("../routes/SubmitPage").then((m) => ({ default: m.SubmitPage })),
  viewer: () => import("../routes/ViewerPage").then((m) => ({ default: m.ViewerPage })),
  realign: () => import("../routes/RealignPage").then((m) => ({ default: m.RealignPage })),
  examples: () => import("../routes/ExamplesPage").then((m) => ({ default: m.ExamplesPage })),
  license: () => import("../routes/LicensePage").then((m) => ({ default: m.LicensePage })),
  privacy: () => import("../routes/PrivacyPage").then((m) => ({ default: m.PrivacyPage })),
  benchmark: () => import("../routes/BenchmarkPage").then((m) => ({ default: m.BenchmarkPage })),
  benchmarkDataset: () => import("../routes/BenchmarkDatasetPage").then((m) => ({ default: m.BenchmarkDatasetPage })),
  benchmarkSubmit: () => import("../routes/BenchmarkSubmitPage").then((m) => ({ default: m.BenchmarkSubmitPage })),
  benchmarkMine: () => import("../routes/BenchmarkMinePage").then((m) => ({ default: m.BenchmarkMinePage })),
  benchmarkRun: () => import("../routes/BenchmarkRunPage").then((m) => ({ default: m.BenchmarkRunPage })),
  benchmarkExample: () => import("../routes/BenchmarkExamplePage").then((m) => ({ default: m.BenchmarkExamplePage }))
} satisfies Record<string, RouteLoader>;

export type RouteKey = keyof typeof routeLoaders;

const warmed = new Set<RouteKey>();

export function resolveRouteKey(to: string): RouteKey | null {
  const path = to.split(/[?#]/)[0] || "/";
  if (path === "/submit") return "submit";
  if (path === "/realign") return "realign";
  if (path === "/viewer") return "viewer";
  if (path === "/lookup") return "lookup";
  if (path === "/docs") return "docs";
  if (path === "/about") return "about";
  if (path === "/license") return "license";
  if (path === "/privacy") return "privacy";
  if (path === "/examples" || path.startsWith("/examples/")) return "examples";
  if (path === "/benchmark") return "benchmark";
  if (path === "/benchmark/submit") return "benchmarkSubmit";
  if (path === "/benchmark/recent" || path === "/benchmark/mine") return "benchmarkMine";
  if (path.startsWith("/benchmark/datasets/")) return "benchmarkDataset";
  if (path.startsWith("/benchmark/runs/")) return "benchmarkRun";
  if (path.startsWith("/benchmark/examples/")) return "benchmarkExample";
  if (path.startsWith("/job/")) return "job";
  if (path.startsWith("/results/")) return "results";
  return null;
}

export function preloadRouteKey(key: RouteKey): void {
  if (warmed.has(key)) return;
  warmed.add(key);
  void routeLoaders[key]().catch(() => {
    warmed.delete(key);
  });
}

export function preloadRoute(to: string): void {
  const key = resolveRouteKey(to);
  if (key) preloadRouteKey(key);
}

const PRIMARY_PRELOAD_KEYS: readonly RouteKey[] = [
  "submit",
  "realign",
  "lookup",
  "benchmark",
  "docs",
  "about",
  "viewer",
  "examples"
];

/** Gently warms primary navigation chunks during browser idle time so tab switches stay instant. */
export function schedulePrimaryRoutePreload(): () => void {
  if (typeof window === "undefined") return () => {};
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return () => {};

  let cancelled = false;
  let idleId: number | null = null;
  let timerId: number | null = null;

  const warmNext = (index: number) => {
    if (cancelled || index >= PRIMARY_PRELOAD_KEYS.length) return;
    preloadRouteKey(PRIMARY_PRELOAD_KEYS[index]);
    timerId = window.setTimeout(() => warmNext(index + 1), 80);
  };

  const start = () => warmNext(0);
  const requestIdle = (window as Window & {
    requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  }).requestIdleCallback;

  if (typeof requestIdle === "function") {
    idleId = requestIdle(start, { timeout: 1500 });
  } else {
    timerId = window.setTimeout(start, 600);
  }

  return () => {
    cancelled = true;
    if (idleId !== null) {
      const cancelIdle = (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
      cancelIdle?.(idleId);
    }
    if (timerId !== null) window.clearTimeout(timerId);
  };
}
