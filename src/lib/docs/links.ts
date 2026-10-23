import type { DocsSectionId } from "./content";
/** All contextual help routes point to the same documentation structure. */
export function docsLink(section: DocsSectionId, article?: string) {
  return `/docs?section=${section}${article ? `&article=${encodeURIComponent(article)}` : ""}`;
}
export const HELP_LINKS = {
  viewer: docsLink("msa-viewer"),
  input: docsLink("fasta-input"),
  realign: docsLink("quick-start", "workflow"),
  results: docsLink("results-downloads"),
  metrics: docsLink("metrics"),
  recovery: docsLink("status-access")
};
