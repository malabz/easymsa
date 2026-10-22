import { useEffect, useId, useMemo, useState } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { viewerText } from "../../lib/i18n/viewerWorkflow";
import { validateThreshold } from "./viewerWorkflowModel";

export type ThresholdField<T> = { key: keyof T; label: string; percent?: boolean; integer?: boolean; max?: number };
export function ThresholdForm<T extends object>({ value, fields, onApply, onPreview, preview, disabled = false }: {
  value: T; fields: ThresholdField<T>[]; onApply: (value: T) => void; onPreview?: (value: T | null) => void; preview?: string; disabled?: boolean;
}) {
  const { dictionary: d } = useLanguage(); const t = d.viewerWorkflow;
  const id = useId();
  const serialized = JSON.stringify(value);
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(field => [String(field.key), value[field.key] == null ? "" : String(Number(value[field.key]) * (field.percent ? 100 : 1))])));
  const [applied, setApplied] = useState(false);
  useEffect(() => {
    setDraft(Object.fromEntries(fields.map(field => [String(field.key), value[field.key] == null ? "" : String(Number(value[field.key]) * (field.percent ? 100 : 1))])));
  // Field labels may change language without discarding an unfinished edit.
  }, [serialized]);
  const parsed = useMemo(() => {
    const next = { ...value }; const errors: Record<string, string> = {};
    for (const field of fields) {
      const raw = draft[String(field.key)] ?? "";
      const result = validateThreshold(raw, Boolean(field.percent), field.integer);
      if (!result.valid || (result.value !== null && field.max !== undefined && result.value > field.max)) {
        errors[String(field.key)] = field.integer ? t.invalidInteger : viewerText(t.invalidNumber, { min: 0, max: field.percent ? 100 : field.max ?? "∞" });
      } else next[field.key] = result.value as T[keyof T];
    }
    const pairs = [["minGcFraction", "maxGcFraction"], ["minUngappedLength", "maxUngappedLength"]];
    for (const [min, max] of pairs) {
      const low = next[min as keyof T], high = next[max as keyof T];
      if (low != null && high != null && Number(low) > Number(high)) errors[max] = t.invalidRange;
    }
    return { next, errors, valid: Object.keys(errors).length === 0 };
  }, [draft, serialized, fields, t]);
  const previewValue = JSON.stringify(parsed.valid ? parsed.next : null);
  useEffect(() => { onPreview?.(parsed.valid ? parsed.next : null); }, [previewValue, onPreview]);
  return <div className="msa-threshold-form">
    {fields.map(field => {
      const key = String(field.key), error = parsed.errors[key];
      return <label key={key}><span>{field.label}</span><input aria-label={field.label} type="text" inputMode={field.integer ? "numeric" : "decimal"}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-${key}-error` : undefined}
        value={draft[key] ?? ""} onChange={event => { setApplied(false); setDraft(old => ({ ...old, [key]: event.target.value })); }} />
        {error && <span className="text-rose-700" id={`${id}-${key}-error`} role="alert">{error}</span>}</label>;
    })}
    {preview && <p role="status">{preview}</p>}
    <div className="flex flex-wrap gap-3"><button type="button" disabled={disabled || !parsed.valid} onClick={() => { onApply(parsed.next); setApplied(true); }}>{t.apply}</button>
      <button type="button" onClick={() => { setApplied(false); setDraft(Object.fromEntries(fields.map(field => [String(field.key), ""]))); }}>{t.reset}</button>
      {applied && <span role="status">{t.applied}</span>}</div>
  </div>;
}
