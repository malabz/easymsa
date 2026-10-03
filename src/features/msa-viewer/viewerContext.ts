import type { ResultFile, ResultSummary } from "../../lib/types/result";

export type MsaViewerSourceType = "server-job" | "local-file" | "pasted" | "public-example";

/**
 * Provenance that is already available to the browser. This intentionally
 * keeps authenticated download URLs separate from serializable metadata: the
 * URL may contain a short-lived access token and must never enter a snapshot
 * or export manifest.
 */
export type MsaViewerContext = {
  source: {
    type: MsaViewerSourceType;
    name: string;
    jobId?: string;
  };
  algorithm: {
    requested: string | null;
    resolved: string | null;
  };
  preprocess: {
    mode: string | null;
    strictness: string | null;
  };
  downloads?: {
    /** UI-only link. Never serialize this value into scientific metadata. */
    fullResultHref?: string;
  };
};

export type SerializableMsaViewerContext = Omit<MsaViewerContext, "downloads">;

function safeSourceName(value: string, fallback: string) {
  const normalized = value.trim().replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const leaf = parts.length ? parts[parts.length - 1] : undefined;
  return leaf || fallback;
}

export function createServerViewerContext(
  summary: ResultSummary,
  files: ResultFile[] = []
): MsaViewerContext {
  return {
    source: {
      type: "server-job",
      name: `job-${summary.jobId}`,
      jobId: summary.jobId
    },
    algorithm: {
      requested: summary.algorithm?.name ?? null,
      resolved: summary.algorithm?.resolvedName ?? null
    },
    preprocess: {
      mode: summary.preprocess.mode,
      strictness: summary.preprocess.strictness
    },
    downloads: {
      fullResultHref: files.find((file) => file.name === "all_results.zip")?.href
    }
  };
}

export function createLocalViewerContext(
  sourceType: Extract<MsaViewerSourceType, "local-file" | "pasted">,
  sourceName: string
): MsaViewerContext {
  return {
    source: {
      type: sourceType,
      name: safeSourceName(
        sourceName,
        sourceType === "pasted" ? "pasted-alignment" : "local-alignment"
      )
    },
    algorithm: {
      requested: null,
      resolved: null
    },
    preprocess: {
      mode: null,
      strictness: null
    }
  };
}

export function serializableViewerContext(
  context: MsaViewerContext
): SerializableMsaViewerContext {
  return {
    source: { ...context.source },
    algorithm: { ...context.algorithm },
    preprocess: { ...context.preprocess }
  };
}
