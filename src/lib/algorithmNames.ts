export type DisplayAlgorithmName =
  | "auto"
  | "minipoa"
  | "mafft"
  | "mafft_fast"
  | "halign3"
  | "fmalign2_mafft"
  | "fmalign2_halign3";

/**
 * Format the algorithm shown to users.
 *
 * The requested `name` is always preserved for compatibility with older
 * responses. When the backend reports a resolved final tool, auto jobs show
 * "Auto (actual: <tool>)"; explicit jobs simply show their own name.
 */
export function displayAlgorithmLabel(
  requestedName: string | null | undefined,
  resolvedName: string | null | undefined,
  labels: Record<string, string>,
  autoResolvedTemplate: string
): string {
  const effectiveName = resolvedName ?? requestedName ?? "auto";
  const label = labels[effectiveName] ?? effectiveName;
  if (requestedName === "auto" && resolvedName) {
    return autoResolvedTemplate.replace("{value}", label);
  }
  return label;
}
