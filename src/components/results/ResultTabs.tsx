import { AlignJustify, BarChart3, Download } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { cn } from "../../lib/utils/cn";

export type ResultTab = "overview" | "alignment" | "downloads";

const tabs: Array<{ value: ResultTab; icon: typeof BarChart3 }> = [
  { value: "overview", icon: BarChart3 },
  { value: "alignment", icon: AlignJustify },
  { value: "downloads", icon: Download }
];

export function ResultTabs({
  value,
  onChange
}: {
  value: ResultTab;
  onChange: (value: ResultTab) => void;
}) {
  const { dictionary: d } = useLanguage();

  return (
    <div className="grid gap-1 rounded border border-slate-200 bg-white/80 p-1 sm:inline-grid sm:grid-cols-3">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = value === tab.value;

        return (
          <button
            className={cn(
              "flex h-9 items-center justify-center gap-2 rounded px-3 text-sm font-medium transition",
              selected
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            )}
            key={tab.value}
            onClick={() => onChange(tab.value)}
            type="button"
          >
            <Icon className="h-4 w-4" />
            {d.results.tabs[tab.value]}
          </button>
        );
      })}
    </div>
  );
}
