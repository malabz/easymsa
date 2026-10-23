import { AlertTriangle } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";

export function ErrorState({ message }: { message?: string }) {
  const { dictionary: d } = useLanguage();

  return (
    <div
      className="app-feedback text-rose-800"
      role="alert"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      {message ?? d.common.error}
    </div>
  );
}
