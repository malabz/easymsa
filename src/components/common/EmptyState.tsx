import { SearchX } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";

export function EmptyState({ message }: { message?: string }) {
  const { dictionary: d } = useLanguage();

  return (
    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-sm text-slate-600">
      <SearchX className="mr-2 h-4 w-4" />
      {message ?? d.common.empty}
    </div>
  );
}
