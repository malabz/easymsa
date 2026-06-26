export type MSAColorScheme = "nucleotide" | "purinePyrimidine" | "conservation";

export type ConservationColorContext = {
  dominantBase?: string;
  conservation?: number;
};

export type MsaCellColorStyle = {
  background: string;
  text: string;
  border: string;
};

const COLORS = {
  transparent: "transparent",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate800: "#1e293b",
  emerald100: "#d1fae5",
  emerald200: "#a7f3d0",
  emerald900: "#064e3b",
  rose100: "#ffe4e6",
  rose200: "#fecdd3",
  rose900: "#881337",
  amber100: "#fef3c7",
  amber200: "#fde68a",
  amber900: "#78350f",
  sky100: "#e0f2fe",
  sky200: "#bae6fd",
  sky900: "#0c4a6e",
  zinc100: "#f4f4f5",
  zinc200: "#e4e4e7",
  zinc500: "#71717a",
  indigo100: "#e0e7ff",
  indigo200: "#c7d2fe",
  indigo900: "#312e81",
  cyan100: "#cffafe",
  cyan200: "#a5f3fc",
  cyan900: "#164e63",
  teal100: "#ccfbf1",
  teal200: "#99f6e4",
  teal300: "#5eead4",
  teal900: "#134e4a",
  teal950: "#042f2e"
};

function style(background: string, text: string, border: string): MsaCellColorStyle {
  return { background, text, border };
}

function baseStyle(base: string): MsaCellColorStyle {
  switch (base.toUpperCase()) {
    case "A":
      return style(COLORS.emerald100, COLORS.emerald900, COLORS.emerald200);
    case "T":
    case "U":
      return style(COLORS.rose100, COLORS.rose900, COLORS.rose200);
    case "G":
      return style(COLORS.amber100, COLORS.amber900, COLORS.amber200);
    case "C":
      return style(COLORS.sky100, COLORS.sky900, COLORS.sky200);
    case "-":
      return style(COLORS.zinc100, COLORS.zinc500, COLORS.zinc200);
    default:
      return style(COLORS.slate100, COLORS.slate800, COLORS.slate200);
  }
}

export function baseClass(base: string) {
  switch (base.toUpperCase()) {
    case "A":
      return "bg-emerald-100 text-emerald-900 border-emerald-200";
    case "T":
    case "U":
      return "bg-rose-100 text-rose-900 border-rose-200";
    case "G":
      return "bg-amber-100 text-amber-900 border-amber-200";
    case "C":
      return "bg-sky-100 text-sky-900 border-sky-200";
    case "-":
      return "bg-zinc-100 text-zinc-500 border-zinc-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
}

export function msaCellColorStyle(
  base: string,
  scheme: MSAColorScheme,
  conservation?: ConservationColorContext
): MsaCellColorStyle {
  const normalizedBase = base.toUpperCase();
  if (!base) {
    return style(COLORS.transparent, COLORS.transparent, COLORS.transparent);
  }

  if (scheme === "purinePyrimidine") {
    if (normalizedBase === "A" || normalizedBase === "G") {
      return style(COLORS.indigo100, COLORS.indigo900, COLORS.indigo200);
    }
    if (normalizedBase === "C" || normalizedBase === "T" || normalizedBase === "U") {
      return style(COLORS.cyan100, COLORS.cyan900, COLORS.cyan200);
    }
    if (normalizedBase === "-") {
      return style(COLORS.zinc100, COLORS.zinc500, COLORS.zinc200);
    }
    return style(COLORS.slate100, COLORS.slate800, COLORS.slate200);
  }

  if (scheme === "conservation") {
    if (normalizedBase === "-") {
      return style(COLORS.zinc100, COLORS.zinc500, COLORS.zinc200);
    }

    const dominantBase = conservation?.dominantBase?.toUpperCase();
    const conservationScore = conservation?.conservation ?? 0;
    if (dominantBase && normalizedBase === dominantBase) {
      return conservationScore >= 0.8
        ? style(COLORS.teal200, COLORS.teal950, COLORS.teal300)
        : style(COLORS.teal100, COLORS.teal900, COLORS.teal200);
    }
    if (dominantBase) {
      return style(COLORS.rose100, COLORS.rose900, COLORS.rose200);
    }
    return style(COLORS.slate100, COLORS.slate800, COLORS.slate200);
  }

  return baseStyle(base);
}

export function msaCellColorClass(
  base: string,
  scheme: MSAColorScheme,
  conservation?: ConservationColorContext
) {
  const normalizedBase = base.toUpperCase();
  if (!base) {
    return "bg-transparent text-transparent border-transparent";
  }

  if (scheme === "purinePyrimidine") {
    if (normalizedBase === "A" || normalizedBase === "G") {
      return "bg-indigo-100 text-indigo-900 border-indigo-200";
    }
    if (normalizedBase === "C" || normalizedBase === "T" || normalizedBase === "U") {
      return "bg-cyan-100 text-cyan-900 border-cyan-200";
    }
    if (normalizedBase === "-") {
      return "bg-zinc-100 text-zinc-500 border-zinc-200";
    }
    return "bg-slate-100 text-slate-800 border-slate-200";
  }

  if (scheme === "conservation") {
    if (normalizedBase === "-") {
      return "bg-zinc-100 text-zinc-500 border-zinc-200";
    }

    const dominantBase = conservation?.dominantBase?.toUpperCase();
    const conservationScore = conservation?.conservation ?? 0;
    if (dominantBase && normalizedBase === dominantBase) {
      return conservationScore >= 0.8
        ? "bg-teal-200 text-teal-950 border-teal-300"
        : "bg-teal-100 text-teal-900 border-teal-200";
    }
    if (dominantBase) {
      return "bg-rose-100 text-rose-900 border-rose-200";
    }
    return "bg-slate-100 text-slate-800 border-slate-200";
  }

  return baseClass(base);
}

export function legendColorStyles(
  scheme: MSAColorScheme,
  labels?: {
    dominant: string;
    variant: string;
    gapEmpty: string;
  }
) {
  if (scheme === "purinePyrimidine") {
    return [
      { label: "A / G", style: msaCellColorStyle("A", scheme) },
      { label: "C / T / U", style: msaCellColorStyle("C", scheme) },
      { label: "N", style: msaCellColorStyle("N", scheme) },
      { label: labels?.gapEmpty ?? "-", style: msaCellColorStyle("-", scheme) }
    ];
  }
  if (scheme === "conservation") {
    return [
      {
        label: labels?.dominant ?? "Dominant",
        style: msaCellColorStyle("A", scheme, { dominantBase: "A", conservation: 1 })
      },
      {
        label: labels?.variant ?? "Variant",
        style: msaCellColorStyle("C", scheme, { dominantBase: "A", conservation: 1 })
      },
      { label: labels?.gapEmpty ?? "Gap", style: msaCellColorStyle("-", scheme) }
    ];
  }
  return ["A", "T / U", "G", "C", "N", "-"].map((label) => ({
    label,
    style: msaCellColorStyle(label[0] ?? "N", scheme)
  }));
}
