import type { BenchmarkDataset } from "./model";

/** Dataset identity verified against the WMSA 2 paper and its matching ZIP links. */
export function isCipresRna(dataset: BenchmarkDataset) {
  return dataset.sequence_type === "rna"
    && [255, 511, 1023, 2047, 4095, 8191].includes(dataset.sequence_count)
    && dataset.id === `rna_${dataset.sequence_count}`
    && dataset.source_id === `RNA-${dataset.sequence_count}`;
}

export const rnaEvidence = {
  name: "CIPRES",
  paper: "https://doi.org/10.1093/bib/bbad190",
  downloads: "https://github.com/malabz/WMSA2#data",
};
