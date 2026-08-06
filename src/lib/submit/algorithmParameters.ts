import type {
  AlgorithmParameters,
  AlignmentAlgorithm,
  MafftMode
} from "../types/job";

export type AlgorithmParameterDraft = {
  thread: string;
  mafftMode: MafftMode;
  mafftMaxiterate: string;
  mafftReorder: boolean;
};

export type AlgorithmParameterError =
  | "threadInteger"
  | "threadRange"
  | "maxiterateInteger"
  | "maxiterateRange";

export type AlgorithmParameterValidation =
  | { valid: true; params: AlgorithmParameters | undefined }
  | {
      valid: false;
      field: "thread" | "mafftMaxiterate";
      error: AlgorithmParameterError;
    };

export const DEFAULT_ALGORITHM_PARAMETER_DRAFT: AlgorithmParameterDraft = {
  thread: "",
  mafftMode: "auto",
  mafftMaxiterate: "",
  mafftReorder: false
};

function parseInteger(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

export function validateAlgorithmParameters(
  algorithm: AlignmentAlgorithm,
  draft: AlgorithmParameterDraft,
  maxThreadPerJob: number | null
): AlgorithmParameterValidation {
  const thread = parseInteger(draft.thread);
  if (Number.isNaN(thread)) {
    return { valid: false, field: "thread", error: "threadInteger" };
  }
  if (
    thread !== null &&
    (thread < 1 || (maxThreadPerJob !== null && thread > maxThreadPerJob))
  ) {
    return { valid: false, field: "thread", error: "threadRange" };
  }

  const params: AlgorithmParameters = {};
  if (thread !== null) {
    params.thread = thread;
  }

  if (algorithm === "mafft") {
    const maxiterate = parseInteger(draft.mafftMaxiterate);
    if (Number.isNaN(maxiterate)) {
      return {
        valid: false,
        field: "mafftMaxiterate",
        error: "maxiterateInteger"
      };
    }
    if (maxiterate !== null && (maxiterate < 0 || maxiterate > 1000)) {
      return {
        valid: false,
        field: "mafftMaxiterate",
        error: "maxiterateRange"
      };
    }

    if (draft.mafftMode !== "auto") {
      params.mode = draft.mafftMode;
    }
    if (maxiterate !== null) {
      params.maxiterate = maxiterate;
    }
    if (draft.mafftReorder) {
      params.reorder = true;
    }
  }

  return {
    valid: true,
    params: Object.keys(params).length > 0 ? params : undefined
  };
}
