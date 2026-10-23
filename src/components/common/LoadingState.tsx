import { Loader2 } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";

export function LoadingState({ label }: { label?: string }) {
  const { dictionary: d } = useLanguage();

  return (
    <div
      aria-live="polite"
      className="app-feedback text-slate-600"
      role="status"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-teal-700" aria-hidden="true" />
      {label ?? d.common.loading}
    </div>
  );
}
