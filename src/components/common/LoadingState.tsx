import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";

export function LoadingState({ label, detail }: { label?: string; detail?: string }) {
  const { dictionary: d } = useLanguage();
  const [slow,setSlow]=useState(false);
  useEffect(()=>{setSlow(false);const timer=setTimeout(()=>setSlow(true),8000);return()=>clearTimeout(timer);},[label]);

  return (
    <div
      aria-live="polite"
      className="app-feedback text-slate-600"
      role="status"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-teal-700" aria-hidden="true" />
      {slow && detail ? detail : label ?? d.common.loading}
    </div>
  );
}
