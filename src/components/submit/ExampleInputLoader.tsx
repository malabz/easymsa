import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FilePlus2, Loader2 } from "lucide-react";
import { loadExampleInput } from "../../lib/examples";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { workspaceText } from "../../lib/i18n/workspace";

export function ExampleInputLoader({ kind, disabled, onLoad, hasInput = false, label, confirmationMessage, confirmLabel, onPendingChange }: {
  kind: "alignment" | "realignment";
  disabled: boolean;
  onLoad: (file: File) => void | Promise<void>;
  hasInput?: boolean;
  label?: string;
  confirmationMessage?: string;
  confirmLabel?: string;
  onPendingChange?: (pending: boolean) => void;
}) {
  const { locale } = useLanguage();
  const t = workspaceText[locale];
  const [params, setParams] = useSearchParams();
  const id = `${kind}-small`;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const callback = useRef(onLoad);
  callback.current = onLoad;
  const pendingCallback = useRef(onPendingChange);
  pendingCallback.current = onPendingChange;
  const requested = useRef(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const currentHasInput = useRef(hasInput);
  currentHasInput.current = hasInput;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function load() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true); setError(false); setConfirm(false);
    pendingCallback.current?.(true);
    try {
      const { file } = await loadExampleInput(id);
      if (mounted.current) {
        await callback.current(file);
        setParams(previous => {
          const next = new URLSearchParams(previous); next.delete("example"); return next;
        }, { replace: true, preventScrollReset: true });
      }
    } catch { if (mounted.current) setError(true); }
    finally {
      inFlight.current = false;
      if (mounted.current) { setPending(false); pendingCallback.current?.(false); }
    }
  }
  useEffect(() => {
    if (params.get("example") === id && !requested.current && !disabled) {
      requested.current = true;
      if (currentHasInput.current || confirmationMessage) setConfirm(true);
      else void load();
    }
  }, [params, id, disabled, confirmationMessage]);
  function cancelReplacement() {
    setConfirm(false);
    setParams(previous => {
      const next = new URLSearchParams(previous); next.delete("example"); return next;
    }, { replace: true, preventScrollReset: true });
  }
  return <div className="work-example">
    <button type="button" className="work-link disabled:opacity-50" disabled={disabled || pending}
      onClick={() => hasInput || confirmationMessage ? setConfirm(true) : void load()}>
      {pending ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />}
      {pending ? t.exampleLoading : label ?? t.sample}
    </button>
    {confirm && <span className="work-example-confirm" role="status">
      <span>{confirmationMessage ?? (locale === "zh" ? "示例将替换当前输入和任务设置。" : "The example will replace your current input and task settings.")}</span>
      <button type="button" className="work-link" disabled={disabled || pending} onClick={() => void load()}>{confirmLabel ?? t.replace}</button>
      <button type="button" className="work-link" onClick={cancelReplacement}>{t.cancel}</button>
    </span>}
    {error && <span className="work-error" role="alert">{t.exampleFailed}</span>}
  </div>;
}
