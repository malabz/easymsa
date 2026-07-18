import { Activity, CircleAlert, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { useServiceHealth } from "../../lib/query/useServiceHealth";
import { cn } from "../../lib/utils/cn";
import { Button } from "./Button";

export function ServiceStatus({ compact = false }: { compact?: boolean }) {
  const { dictionary: d } = useLanguage();
  const health = useServiceHealth();

  if (health.isPending) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-slate-600" role="status">
        <Loader2 className="h-4 w-4 animate-spin" />
        {d.common.checkingService}
      </div>
    );
  }

  const status = health.isError ? "offline" : health.data.status;
  const config = {
    ready: {
      Icon: Activity,
      label: d.common.serviceReady,
      description: d.common.serviceReadyDescription,
      className: "border-emerald-200 bg-emerald-50 text-emerald-800"
    },
    degraded: {
      Icon: CircleAlert,
      label: d.common.serviceDegraded,
      description: d.common.serviceDegradedDescription,
      className: "border-amber-200 bg-amber-50 text-amber-900"
    },
    offline: {
      Icon: WifiOff,
      label: d.common.serviceOffline,
      description: d.common.serviceOfflineDescription,
      className: "border-rose-200 bg-rose-50 text-rose-800"
    }
  }[status];
  const Icon = config.Icon;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
          config.className
        )}
        role="status"
      >
        <Icon className="h-3.5 w-3.5" />
        {config.label}
        {health.data?.queueLength != null ? (
          <span className="font-normal opacity-80">
            · {d.common.queueJobs.replace("{count}", String(health.data.queueLength))}
          </span>
        ) : null}
      </span>
    );
  }

  return (
    <div className={cn("rounded-2xl border p-4", config.className)} role="status">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-full bg-white/70 p-2">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="font-semibold">{config.label}</p>
            <p className="mt-1 text-sm leading-6 opacity-85">{config.description}</p>
            {health.data?.queueLength != null ? (
              <p className="mt-1 text-xs font-medium opacity-75">
                {d.common.queueJobs.replace("{count}", String(health.data.queueLength))}
              </p>
            ) : null}
          </div>
        </div>
        {health.isError ? (
          <Button
            aria-label={d.common.retry}
            className="h-8 shrink-0 border-current bg-white/60 px-2"
            onClick={() => health.refetch()}
            size="sm"
            variant="outline"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
