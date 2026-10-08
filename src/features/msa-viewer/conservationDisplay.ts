import type { ConservationScale } from "./types";

/** Display geometry only: column statistics and scientific thresholds stay unchanged. */
export function conservationScaleRange(mode: ConservationScale) {
  return mode === "high"
    ? { min: 0.8, max: 1, label: "80–100%" }
    : { min: 0, max: 1, label: "0–100%" };
}

export function conservationBar(value: number | null | undefined, mode: ConservationScale, height: number) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return { height: 0, opacity: 0, belowRange: false };
  }
  const range = conservationScaleRange(mode);
  const ratio = Math.max(0, Math.min(1, (value - range.min) / (range.max - range.min)));
  const belowRange = value < range.min;
  return {
    height: Math.min(height, belowRange ? 3 : Math.max(2, Math.round(height * ratio + 1e-9))),
    opacity: belowRange ? 0.85 : 0.3 + ratio * 0.65,
    belowRange
  };
}

export function formatConservation(value: number) {
  return `${Number((value * 100).toFixed(1))}%`;
}
