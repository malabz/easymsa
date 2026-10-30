import type { BenchmarkDataset } from "./model";

export function datasetFamily(dataset: BenchmarkDataset, locale: "en" | "zh") {
  if (dataset.sequence_type === "rna") return "RNA";
  if (dataset.id.startsWith("dna_16s")) return "16S";
  if (dataset.source_kind === "simulated") return locale === "zh" ? "线粒体模拟" : "Mitochondrial simulation";
  if (dataset.id.startsWith("dna_mt")) return locale === "zh" ? "线粒体" : "Mitochondrial";
  return "DNA";
}

export function datasetName(dataset: BenchmarkDataset, locale: "en" | "zh", short = false) {
  const count = dataset.sequence_count.toLocaleString(locale === "zh" ? "zh-CN" : "en-US");
  const label = dataset.source_kind === "simulated" && dataset.similarity_label !== null
    ? `${dataset.similarity_label}%` : `${count} ${locale === "zh" ? "条" : "sequences"}`;
  return short ? label : `${datasetFamily(dataset, locale)} · ${label}`;
}

export function matchesDatasetName(dataset: BenchmarkDataset, query: string) {
  const normalize = (text: string) => text.toLowerCase().replace(/[,，\s·]/g, "");
  const terms = [dataset.id, datasetName(dataset, "en"), datasetName(dataset, "zh"), String(dataset.sequence_count)];
  return terms.some(term => normalize(term).includes(normalize(query)));
}
