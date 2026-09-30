import type { MsaCellColorStyle } from "../msa-export/exportColors";
import type { DifferenceKind } from "./types";

const STYLES: Record<DifferenceKind, MsaCellColorStyle> = {
  match: {
    background: "#f8fafc",
    text: "#64748b",
    border: "#e2e8f0"
  },
  compatibleAmbiguity: {
    background: "#ede9fe",
    text: "#5b21b6",
    border: "#a78bfa"
  },
  substitution: {
    background: "#fce7f3",
    text: "#831843",
    border: "#f9a8d4"
  },
  insertion: {
    background: "#ccfbf1",
    text: "#134e4a",
    border: "#5eead4"
  },
  deletion: {
    background: "#ffedd5",
    text: "#9a3412",
    border: "#fdba74"
  },
  empty: {
    background: "transparent",
    text: "transparent",
    border: "transparent"
  },
  unknown: {
    background: "#f1f5f9",
    text: "#334155",
    border: "#64748b"
  }
};

const CLASSES: Record<DifferenceKind, string> = {
  match: "bg-slate-50 text-slate-500 border-slate-200 opacity-70",
  compatibleAmbiguity:
    "bg-violet-100 text-violet-800 border-violet-400 border-dashed",
  substitution: "bg-pink-100 text-pink-900 border-pink-300 ring-1 ring-inset ring-pink-300",
  insertion: "bg-teal-100 text-teal-900 border-teal-300",
  deletion: "bg-orange-100 text-orange-900 border-orange-300",
  empty: "bg-transparent text-transparent border-transparent",
  unknown: "bg-slate-100 text-slate-700 border-slate-500 border-dotted"
};

export function differenceColorStyle(kind: DifferenceKind) {
  return STYLES[kind];
}

export function differenceColorClass(kind: DifferenceKind) {
  return CLASSES[kind];
}
