import { BarChart3, Download } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { cn } from "../../lib/utils/cn";

export type ResultTab = "overview" | "downloads";

const tabs: Array<{ value: ResultTab; icon: typeof BarChart3 }> = [
  { value: "overview", icon: BarChart3 },
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
    <div className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:inline-grid sm:grid-cols-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = value === tab.value;

        return (
          <button
            className={cn(
              "flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition",
              selected
                ? "bg-white text-cyan-800 shadow-sm"
                : "text-slate-600 hover:bg-white/80 hover:text-slate-950"
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
