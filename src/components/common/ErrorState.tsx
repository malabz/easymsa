import { AlertTriangle } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";

export function ErrorState({ message }: { message?: string }) {
  const { dictionary: d } = useLanguage();

  return (
    <div
      className="flex min-h-40 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-6 text-sm text-rose-800"
      role="alert"
    >
      <AlertTriangle className="mr-2 h-4 w-4" />
      {message ?? d.common.error}
    </div>
  );
}
