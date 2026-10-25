export type DisplayAlgorithmName =
  | "realign_n"
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
 * Prefer the recorded final method, falling back to the requested name for
 * older responses. Auto's final method does not by itself establish whether
 * model selection or the server's default strategy led to that method.
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
