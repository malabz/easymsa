import { Loader2 } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";

export function LoadingState({ label }: { label?: string }) {
  const { dictionary: d } = useLanguage();

  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg border border-slate-200/80 bg-white/60 text-sm text-slate-600">
      <Loader2 className="mr-2 h-4 w-4 animate-spin text-teal-700" />
      {label ?? d.common.loading}
    </div>
  );
}
