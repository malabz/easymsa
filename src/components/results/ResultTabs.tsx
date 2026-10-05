import { AlignJustify, BarChart3, Download } from "lucide-react";
import { useRef } from "react";
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
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  return (
    <div
      aria-label={d.results.title}
      className="result-tabs inline-flex flex-wrap gap-1"
      role="tablist"
    >
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const selected = value === tab.value;

        return (
          <button
            aria-controls={`result-panel-${tab.value}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            ref={node => { buttons.current[index] = node; }}
            onKeyDown={event => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const target = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
                : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
              onChange(tabs[target].value); buttons.current[target]?.focus();
            }}
            className={cn(
              "flex h-9 items-center justify-center gap-2 rounded px-3 text-sm font-medium transition",
              selected
                ? "bg-teal-50 text-teal-800"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            )}
            key={tab.value}
            id={`result-tab-${tab.value}`}
            onClick={() => onChange(tab.value)}
            type="button"
            role="tab"
          >
            <Icon className="h-4 w-4" />
            {d.results.tabs[tab.value]}
          </button>
        );
      })}
    </div>
  );
}
