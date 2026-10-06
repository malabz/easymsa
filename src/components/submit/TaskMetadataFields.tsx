import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { useRef } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { workspaceText } from "../../lib/i18n/workspace";
type Values = { jobName: string; email: string };
export function TaskMetadataFields({ register, errors, disabled, onSuggestName }: {
  register: UseFormRegister<Values>; errors: FieldErrors<Values>; disabled?: boolean;
  onSuggestName?: (input: HTMLInputElement) => boolean;
}) {
  const { dictionary: d, locale } = useLanguage();
  const suggestedOnFocus = useRef(false);
  return <>
    <div className="work-field">
      <label className="work-label" htmlFor="jobName">{d.submit.jobName}</label>
      <input className="work-control" id="jobName" disabled={disabled} placeholder={d.submit.jobNamePlaceholder}
        aria-invalid={Boolean(errors.jobName)} aria-describedby={errors.jobName ? "jobName-error" : undefined} {...register("jobName")}
        onFocus={event => { suggestedOnFocus.current = onSuggestName?.(event.currentTarget) ?? false; }}
        onMouseUp={event => { if (suggestedOnFocus.current) { event.preventDefault(); event.currentTarget.select(); suggestedOnFocus.current = false; } }} />
      {errors.jobName && <p id="jobName-error" className="work-error" role="alert">{errors.jobName.message}</p>}
    </div>
    <div className="work-field">
      <label className="work-label" htmlFor="email">{d.submit.email} <span className="font-normal text-slate-500">({d.common.optional})</span></label>
      <input className="work-control" id="email" type="email" disabled={disabled} placeholder={d.submit.emailPlaceholder}
        aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : "email-hint"} {...register("email")} />
      {errors.email ? <p id="email-error" className="work-error" role="alert">{errors.email.message}</p>
        : <p id="email-hint" className="work-hint">{workspaceText[locale].emailHint}</p>}
    </div>
  </>;
}
