import { useLanguage } from "../../lib/i18n/useLanguage";
import {
  baseClass,
  msaCellColorClass,
  msaCellColorStyle,
  type ConservationColorContext,
  type MSAColorScheme
} from "../../features/msa-export/exportColors";
import { cn } from "../../lib/utils/cn";

export {
  baseClass,
  msaCellColorClass,
  msaCellColorStyle,
  type ConservationColorContext,
  type MSAColorScheme
};

function legendItems(
  scheme: MSAColorScheme,
  labels: {
    purine: string;
    pyrimidine: string;
    dominant: string;
    variant: string;
    gapEmpty: string;
  }
) {
  if (scheme === "purinePyrimidine") {
    return [
      { label: "A / G", title: labels.purine, className: "bg-indigo-100 text-indigo-900 border-indigo-200" },
      { label: "C / T / U", title: labels.pyrimidine, className: "bg-cyan-100 text-cyan-900 border-cyan-200" },
      { label: "N", title: "N", className: "bg-slate-100 text-slate-800 border-slate-200" },
      { label: "-", title: labels.gapEmpty, className: "bg-zinc-100 text-zinc-500 border-zinc-200" }
    ];
  }

  if (scheme === "conservation") {
    return [
      { label: labels.dominant, title: labels.dominant, className: "bg-teal-200 text-teal-950 border-teal-300" },
      { label: labels.variant, title: labels.variant, className: "bg-rose-100 text-rose-900 border-rose-200" },
      { label: labels.gapEmpty, title: labels.gapEmpty, className: "bg-zinc-100 text-zinc-500 border-zinc-200" }
    ];
  }

  return [
    { label: "A", title: "A", className: "bg-emerald-100 text-emerald-900 border-emerald-200" },
    { label: "T / U", title: "T / U", className: "bg-rose-100 text-rose-900 border-rose-200" },
    { label: "G", title: "G", className: "bg-amber-100 text-amber-900 border-amber-200" },
    { label: "C", title: "C", className: "bg-sky-100 text-sky-900 border-sky-200" },
    { label: "N", title: "N", className: "bg-slate-100 text-slate-800 border-slate-200" },
    { label: "-", title: labels.gapEmpty, className: "bg-zinc-100 text-zinc-500 border-zinc-200" }
  ];
}

export function MSAColorLegend({ scheme }: { scheme: MSAColorScheme }) {
  const { dictionary: d } = useLanguage();
  const items = legendItems(scheme, d.results.viewer.legendLabels);

  return (
    <div className="border-t border-slate-200 pt-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">
        {d.results.viewer.legend}
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            className={cn(
              "inline-flex h-8 items-center justify-center rounded border px-3 font-mono text-xs font-semibold",
              item.className
            )}
            key={item.label}
            title={item.title}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
