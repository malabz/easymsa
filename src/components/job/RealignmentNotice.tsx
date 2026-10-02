import type {JobDetail} from "../../lib/types/job";
import {useLanguage} from "../../lib/i18n/useLanguage";
import {realignText,realignmentError} from "../../lib/i18n/realignment";
import {getDownloadFiles} from "../../lib/api/results";
export function RealignmentNotice({job,token}:{job:JobDetail;token:string}){
  const {locale}=useLanguage();const t=realignText[locale];const info=job.realignment;if(!info)return null;
  const fallback=info.status==='failed'||info.status==='skipped';
  return <section role="status" className={`space-y-2 rounded-lg border p-4 text-sm ${fallback?'border-amber-300 bg-amber-50 text-amber-950':'border-teal-200 bg-teal-50 text-teal-950'}`}>
    <p className="font-medium">{fallback?(info.initialAvailable?t.fallback:t.failed):info.status==='completed'?t.success:t[info.status]}</p>
    {job.jobKind === "realignment" && <p>{t.preprocessNotApplicable}</p>}
    {info.failure && <p>{realignmentError(locale,info.failure.code,info.failure.message)}</p>}
    {info.version && <p>ReAlign-N {info.version}{info.durationSeconds!=null?` · ${info.durationSeconds}s`:''}</p>}
    {info.initialAvailable && ['completed','failed'].includes(job.status) && <a className="inline-block underline" href={getDownloadFiles(job.jobId,token,'initial')[1].href}>{t.downloadInitial}</a>}
  </section>;
}
