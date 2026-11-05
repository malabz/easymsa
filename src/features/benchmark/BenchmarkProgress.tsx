import {useEffect,useRef,useState} from "react";
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
  const [clock,setClock]=useState(Date.now);
  useEffect(()=>{if(finished)return;const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[finished]);
  const elapsed=(value:string|null|undefined)=>value?Math.max(0,Math.floor((clock-Date.parse(value))/1000)):0;
  const duration=(seconds:number)=>`${Math.floor(seconds/60)} ${w("min","分")} ${seconds%60} ${w("s","秒")}`;
  const current=run.cancel_requested&&!finished?w("Cancelling…","正在取消…"):runState(run.status==="running"?run.stage:run.status,locale);
  const summary=<p>{run.completed_units} / {run.total_units} {w("datasets processed","组已处理")}{validDatasets!==null&&<> · {validDatasets} {w("valid alignments","组合法比对")}</>}</p>;
  if(finished)return <section className="private-progress is-compact" aria-label={w("Evaluation progress","评测进度")}><div className="private-progress-heading"><div><strong className={`private-status is-${run.status}`} role="status">{run.status==="completed"&&<CheckCircle2 size={17} aria-hidden="true"/>}{current}</strong>{summary}</div></div></section>;
  return <section className="benchmark-task-progress" aria-label={w("Evaluation progress","评测进度")}>
    <BenchmarkJourney submitted step={["running","scoring"].includes(run.stage)?1:0}/>
    <div className="private-progress"><div className="private-progress-heading"><div><strong className={`private-status is-${run.status}`} role="status"><Loader2 className="benchmark-spin" size={18} aria-hidden="true"/>{current}</strong>{summary}</div>{!run.cancel_requested&&<button className="private-button is-outline" onClick={onCancel} disabled={busy}>{w("Cancel evaluation","取消评测")}</button>}</div><progress value={run.completed_units} max={run.total_units} aria-label={w("Datasets processed","已处理数据集")}/></div>
    <dl className="benchmark-progress-facts">
      <div><dt>{run.status==="queued"?w("Waiting","已等待"):w("Time in this stage","本阶段已用")}</dt><dd>{duration(elapsed(run.status==="queued"?run.stage_started_at??run.created_at:run.stage_started_at??run.started_at))}</dd></div>
      {run.status==="queued"&&<div><dt>{w("Reference queue position","轮转参考顺位")}</dt><dd>{run.queue_position??"—"}</dd></div>}
      {run.active_dataset&&<div><dt>{w("Current dataset","当前数据集")}</dt><dd><code>{run.active_dataset}</code></dd></div>}
      {run.last_progress_at&&<div><dt>{w("Last activity","最近活动")}</dt><dd><time dateTime={run.last_progress_at}>{new Date(run.last_progress_at).toLocaleTimeString(locale==="zh"?"zh-CN":"en-US")}</time></dd></div>}
    </dl>
    {run.status==="queued"&&<p className="benchmark-task-guidance">{w("Browsers take turns; submissions within a browser run in order. Position can change after cancellations and scheduling; no completion time is promised.","不同浏览器轮流执行，同一浏览器按提交时间执行。参考顺位会随取消与调度变化，暂无可靠的完成时间估计。")}</p>}
    {run.completed_units===0&&run.status!=="queued"&&<p className="benchmark-task-guidance">{w(`0/${run.total_units} means no dataset has finished yet. It is normal during source preparation, building and interface checking.`,`0/${run.total_units} 表示尚未完成数据集；准备源码、构建与接口检查期间保持为零是正常的。`)}</p>}
    {run.status==="running"&&run.heartbeat_at&&elapsed(run.heartbeat_at)>90&&<p className="benchmark-notice" role="status">{w("The worker heartbeat has not updated for over 90 seconds. Service connection may be interrupted; this does not mark the evaluation as failed.","工作进程心跳已超过 90 秒未更新，服务连接可能异常；不会因此把评测直接判为失败。")}</p>}
    <p className="benchmark-task-guidance">{w("Your evaluation runs in the background. Find it again in Recent evaluations.","评测会在后台继续，可在「最近评测」中随时回来查看。")}</p>
  </section>;
}
