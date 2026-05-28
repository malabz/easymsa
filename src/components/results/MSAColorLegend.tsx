import { useLanguage } from "../../lib/i18n/useLanguage";
import { cn } from "../../lib/utils/cn";

const legendItems = [
  { label: "A", className: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  { label: "T / U", className: "bg-rose-100 text-rose-900 border-rose-200" },
  { label: "G", className: "bg-amber-100 text-amber-900 border-amber-200" },
  { label: "C", className: "bg-sky-100 text-sky-900 border-sky-200" },
  { label: "N", className: "bg-slate-100 text-slate-800 border-slate-200" },
  { label: "-", className: "bg-zinc-100 text-zinc-500 border-zinc-200" }
];

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

export function MSAColorLegend() {
  const { dictionary: d } = useLanguage();

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">
        {d.results.viewer.legend}
      </h3>
      <div className="flex flex-wrap gap-2">
        {legendItems.map((item) => (
          <span
            className={cn(
              "inline-flex h-8 items-center justify-center rounded border px-3 font-mono text-xs font-semibold",
              item.className
            )}
            key={item.label}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
