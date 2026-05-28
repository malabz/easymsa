import { Database, FileUp, TextCursorInput } from "lucide-react";
import type { InputMethod } from "../../lib/types/job";
import { cn } from "../../lib/utils/cn";
import { useLanguage } from "../../lib/i18n/useLanguage";

const methods: Array<{ value: InputMethod; icon: typeof TextCursorInput }> = [
  { value: "paste", icon: TextCursorInput },
  { value: "upload", icon: FileUp },
  { value: "demo", icon: Database }
];

export function InputMethodTabs({
  value,
  onChange
}: {
  value: InputMethod;
  onChange: (method: InputMethod) => void;
}) {
  const { dictionary: d } = useLanguage();

  return (
    <div className="grid gap-2 rounded-lg border border-slate-200 bg-white/55 p-1 sm:grid-cols-3">
      {methods.map((method) => {
        const Icon = method.icon;
        const selected = value === method.value;

        return (
          <button
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition",
              selected
                ? "bg-teal-700 text-white shadow-sm"
                : "text-slate-600 hover:bg-white/80 hover:text-slate-950"
            )}
            key={method.value}
            onClick={() => onChange(method.value)}
            type="button"
          >
            <Icon className="h-4 w-4" />
            {d.submit.methods[method.value]}
          </button>
        );
      })}
    </div>
  );
}
