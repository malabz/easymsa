export type ConservationColumn = {
  position: number;
  conservation: number;
  gapFraction: number;
  dominantBase: string;
};

export function calculateConservationColumns(
  sequences: Array<{ sequence: string }>,
  alignmentLength: number
): ConservationColumn[] {
  return Array.from({ length: alignmentLength }, (_, index) => {
    const counts = new Map<string, number>();
    let observed = 0;
    let gaps = 0;
    let dominantBase = "";
    let dominantCount = 0;

    for (const sequence of sequences) {
      const base = sequence.sequence[index] ?? "";
      if (!base || base === "-") {
        gaps += 1;
        continue;
      }

      observed += 1;
      const count = (counts.get(base) ?? 0) + 1;
      counts.set(base, count);
      if (count > dominantCount) {
        dominantBase = base;
        dominantCount = count;
      }
    }

    return {
      position: index + 1,
      conservation: observed > 0 ? dominantCount / observed : 0,
      gapFraction: sequences.length > 0 ? gaps / sequences.length : 0,
      dominantBase
    };
  });
}
