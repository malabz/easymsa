import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FilePlus2, Loader2 } from "lucide-react";
import { loadExampleInput } from "../../lib/examples";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { workspaceText } from "../../lib/i18n/workspace";

export function ExampleInputLoader({ kind, disabled, onLoad, hasInput = false }: {
  kind: "alignment" | "realignment";
  disabled: boolean;
  onLoad: (file: File) => void;
  hasInput?: boolean;
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
  const requested = useRef(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function load() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true); setError(false); setConfirm(false);
    try {
      const { file } = await loadExampleInput(id);
      if (mounted.current) {
        callback.current(file);
        setParams(previous => {
          const next = new URLSearchParams(previous); next.delete("example"); return next;
        }, { replace: true, preventScrollReset: true });
      }
    } catch { if (mounted.current) setError(true); }
    finally { inFlight.current = false; if (mounted.current) setPending(false); }
  }
  useEffect(() => {
    if (params.get("example") === id && !requested.current && !disabled) {
      requested.current = true; void load();
    }
  }, [params, id, disabled]);
  return <div className="work-example">
    <button type="button" className="work-link disabled:opacity-50" disabled={disabled || pending}
      onClick={() => hasInput ? setConfirm(true) : void load()}>
      {pending ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />}
      {pending ? t.exampleLoading : t.sample}
    </button>
    {confirm && <span className="work-example-confirm" role="status">
      {t.exampleReplace}
      <button type="button" className="work-link" disabled={disabled} onClick={() => void load()}>{t.replace}</button>
      <button type="button" className="work-link" onClick={() => setConfirm(false)}>{t.cancel}</button>
    </span>}
    {error && <span className="work-error" role="alert">{t.exampleFailed}</span>}
  </div>;
}
