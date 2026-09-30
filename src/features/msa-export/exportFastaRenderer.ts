import type { MsaExportLayout } from "./exportTypes";

function wrapFastaSequence(sequence: string, width = 80) {
  if (!sequence) return "";
  const lines: string[] = [];
  for (let start = 0; start < sequence.length; start += width) {
    lines.push(sequence.slice(start, start + width));
  }
  return lines.join("\n");
}

/** Render exactly the row/column set resolved by the shared export layout. */
export function renderMsaExportToFasta(layout: MsaExportLayout) {
  return `${layout.rows.map((row) => {
    const sequence = layout.columns
      .map((column) => row.sequence[column.position - 1] ?? "")
      .join("");
    return `>${row.id}\n${wrapFastaSequence(sequence)}`;
  }).join("\n")}\n`;
}
