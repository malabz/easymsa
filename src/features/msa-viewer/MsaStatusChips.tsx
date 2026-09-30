import { X } from "lucide-react";

export type MsaStatusChipItem = {
  clearLabel?: string;
  id: string;
  label: string;
  onClear?: () => void;
  tone?: "default" | "info" | "warning";
};

const toneClasses: Record<NonNullable<MsaStatusChipItem["tone"]>, string> = {
  default: "border-slate-200 bg-slate-50 text-slate-700",
  info: "border-teal-200 bg-teal-50 text-teal-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900"
};

/**
 * Persistent, independently dismissible scientific-state indicators. Keeping
 * these outside menus prevents a filtered or scoped analysis from looking like
 * the unfiltered alignment.
 */
export function MsaStatusChips({
  items,
  label
}: {
  items: MsaStatusChipItem[];
  label: string;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <div
      aria-label={label}
      className="flex flex-nowrap items-center gap-1.5 overflow-x-auto border-t border-slate-200 px-3 py-2 pr-8 [mask-image:linear-gradient(to_right,transparent_0,black_12px,black_calc(100%-28px),transparent_100%)] lg:flex-wrap lg:overflow-visible lg:pr-3 lg:[mask-image:none]"
      data-msa-status-chips="true"
      role="list"
    >
      {items.map((item) => (
        <span
          className={`inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border pl-3 text-xs font-medium ${toneClasses[item.tone ?? "default"]}`}
          data-msa-status-chip={item.id}
          key={item.id}
          role="listitem"
        >
          <span className={item.onClear ? "py-1 pr-0.5" : "py-1 pr-3"}>
            {item.label}
          </span>
          {item.onClear ? (
            <button
              aria-label={item.clearLabel ?? item.label}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-current/70 transition hover:bg-black/5 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              onClick={item.onClear}
              type="button"
            >
              <X aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </span>
      ))}
    </div>
  );
}
