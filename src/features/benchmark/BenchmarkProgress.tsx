import {useRef} from "react";
import {CheckCircle2,Loader2,Save} from "lucide-react";
import {terminalRun,type PrivateRun} from "./privateModel";
import {BenchmarkJourney} from "./BenchmarkNavigation";
import {RecoveryActions,runState} from "./privateShared";
import type {BenchmarkAccess} from "./privateAccess";
import {useLanguage} from "../../lib/i18n/useLanguage";
import {useDismissDetails} from "./useDismissDetails";

export function BenchmarkSaveMenu({access}:{access:BenchmarkAccess}){
  const {locale}=useLanguage(),menu=useRef<HTMLDetailsElement>(null);
  useDismissDetails(menu);
  return <details className="benchmark-save-menu" ref={menu}>
    <summary><Save size={15} aria-hidden="true"/>{locale==="zh"?"保存结果链接":"Save result link"}</summary>
    <div><RecoveryActions access={access}/></div>
  </details>;
}

export function BenchmarkProgress({run,validDatasets,busy,onCancel}:{run:PrivateRun;validDatasets:number|null;busy:boolean;onCancel:()=>void}){
  const {locale}=useLanguage(),w=(en:string,zh:string)=>locale==="zh"?zh:en,finished=terminalRun(run);
  const current=run.cancel_requested&&!finished?w("Cancelling…","正在取消…"):runState(run.status==="running"?run.stage:run.status,locale);
  const summary=<p>{run.completed_units} / {run.total_units} {w("datasets processed","组已处理")}{validDatasets!==null&&<> · {validDatasets} {w("valid alignments","组合法比对")}</>}</p>;
  if(finished)return <section className="private-progress is-compact" aria-label={w("Evaluation progress","评测进度")}><div className="private-progress-heading"><div><strong className={`private-status is-${run.status}`} role="status">{run.status==="completed"&&<CheckCircle2 size={17} aria-hidden="true"/>}{current}</strong>{summary}</div></div></section>;
  return <section className="benchmark-task-progress" aria-label={w("Evaluation progress","评测进度")}>
    <BenchmarkJourney submitted step={["running","scoring"].includes(run.stage)?1:0}/>
    <div className="private-progress"><div className="private-progress-heading"><div><strong className={`private-status is-${run.status}`} role="status"><Loader2 className="benchmark-spin" size={18} aria-hidden="true"/>{current}</strong>{summary}</div>{!run.cancel_requested&&<button className="private-button is-outline" onClick={onCancel} disabled={busy}>{w("Cancel evaluation","取消评测")}</button>}</div><progress value={run.completed_units} max={run.total_units} aria-label={w("Datasets processed","已处理数据集")}/></div>
    <p className="benchmark-task-guidance">{w("Your evaluation runs in the background. Find it again in Recent evaluations.","评测会在后台继续，可在「最近评测」中随时回来查看。")}</p>
  </section>;
}
