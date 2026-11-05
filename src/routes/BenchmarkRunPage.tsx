import {useEffect,useState} from "react";
import {Link,useParams,useSearchParams} from "react-router-dom";
import {ExternalLink} from "lucide-react";
import {useLanguage} from "../lib/i18n/useLanguage";
import {privateApi,privateError,retryableBenchmarkError} from "../features/benchmark/privateApi";
import {terminalRun,type PrivateRun,type PrivateResult} from "../features/benchmark/privateModel";
import {PrivateShell,RecoveryActions,runState,useSlowLoading,runFailureMessage} from "../features/benchmark/privateShared";
import {accessFor,findBenchmarkAccess,saveBenchmarkAccess,type BenchmarkAccess} from "../features/benchmark/privateAccess";
import {PrivateResults} from "../features/benchmark/privateResults";
import {ComparisonView} from "../features/benchmark/ComparisonView";
import {loadComparison} from "../features/benchmark/comparisonApi";
import type {ComparisonReport} from "../features/benchmark/comparisonModel";
import {BenchmarkProgress,BenchmarkSaveMenu} from "../features/benchmark/BenchmarkProgress";

export function BenchmarkRunPage(){
  const {locale}=useLanguage(),w=(en:string,zh:string)=>locale==="zh"?zh:en,{runId=""}=useParams();
  const [query,setQuery]=useSearchParams(),accessKey=query.get("key")??findBenchmarkAccess(runId)?.key??"";
  const [access,setAccess]=useState<BenchmarkAccess|null>(null),[unsaved,setUnsaved]=useState(false),[validatedKey,setValidatedKey]=useState<string|null>(null);
  const [run,setRun]=useState<PrivateRun|null>(null),[report,setReport]=useState<PrivateResult|null>(null),[error,setError]=useState(""),[resultError,setResultError]=useState(""),[refresh,setRefresh]=useState(0),[busy,setBusy]=useState(false),[confirmCancel,setConfirmCancel]=useState(false),[logs,setLogs]=useState<string|null>(null);
  const [resultRetry,setResultRetry]=useState(0);
  const [comparison,setComparison]=useState<ComparisonReport|null>(null),[comparisonError,setComparisonError]=useState<string|null>(null),[comparisonRetry,setComparisonRetry]=useState(0);
  useEffect(()=>{setRun(null);setReport(null);setLogs(null);setError("");setResultError("");setAccess(null);setValidatedKey(null);},[runId,accessKey]);
  useEffect(()=>{
    if(!accessKey)return;
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined, failures=0;
    async function read(){
      try{const next=await privateApi.run(runId,accessKey,controller.signal);if(controller.signal.aborted)return;if(next.id!==runId)throw Error("Run identity mismatch");failures=0;setRun(next);setValidatedKey(accessKey);setError("");const recovered=accessFor(next,accessKey),saved=saveBenchmarkAccess(recovered);setAccess(recovered);setUnsaved(!saved);if(saved&&query.has("key")){setQuery(current=>{const clean=new URLSearchParams(current);clean.delete("key");return clean;},{replace:true});}if(!terminalRun(next)||next.email_status==="pending")timer=setTimeout(read,3000);}
      catch(error){if(!controller.signal.aborted){setError(privateError(error,locale));if(retryableBenchmarkError(error))timer=setTimeout(read,[3000,6000,12000,30000][Math.min(failures++,3)]);else{setValidatedKey(null);setReport(null);}}}
    }
    void read();return()=>{controller.abort();clearTimeout(timer);};
  },[runId,accessKey,refresh,locale]);
  useEffect(()=>{
    if(!run?.has_results||run.id!==runId||validatedKey!==accessKey)return;
    const controller=new AbortController();setResultError("");
    privateApi.results(runId,accessKey,controller.signal).then(result=>{if(result.run_id!==runId)throw new Error("Result identity mismatch");if(!controller.signal.aborted)setReport(result);}).catch(error=>{if(!controller.signal.aborted){setResultError(privateError(error,locale));}});
    return()=>controller.abort();
  },[run?.id,run?.has_results,run?.completed_units,run?.status,runId,accessKey,validatedKey,resultRetry]);
  useEffect(()=>{setComparison(null);setComparisonError(null);if(!report||report.run_id!==runId||validatedKey!==accessKey||run?.mode==="quick")return;const controller=new AbortController();loadComparison(runId,accessKey,controller.signal).then(value=>{if(!controller.signal.aborted)setComparison(value);}).catch(error=>{if(!controller.signal.aborted)setComparisonError(privateError(error,locale));});return()=>controller.abort();},[report,runId,accessKey,validatedKey,comparisonRetry,run?.mode]);
  async function cancel(){if(!accessKey||busy)return;setBusy(true);setError("");try{setRun(await privateApi.cancel(runId,accessKey));setConfirmCancel(false);}catch(error){setError(privateError(error,locale));}finally{setBusy(false);}}
  async function readLogs(){setBusy(true);try{setLogs((await privateApi.logs(runId,accessKey)).slice(0,100000));}catch(error){setError(privateError(error,locale));}finally{setBusy(false);}}
  const current=run?.id===runId&&validatedKey===accessKey?run:null;
  const slowRun=useSlowLoading(!!accessKey&&!current&&!error,runId+accessKey);
  const slowResults=useSlowLoading(!!current?.has_results&&!report&&!resultError,runId);
  const slowComparison=useSlowLoading(!!report&&!comparison&&!comparisonError&&current?.mode!=="quick",runId+comparisonRetry);
  const validDatasets=report?.run_id===runId?report.results.filter(result=>result.valid_repeats>0).length:null;

  return <PrivateShell title={current?.method_name??w("Evaluation","评测任务")} actions={access&&!unsaved?<BenchmarkSaveMenu access={access}/>:undefined}>
    {!accessKey&&<div className="private-state"><p>{w("Open this task from a saved result link or recovery file.","请通过保存的结果链接或恢复文件打开任务。")}</p><Link className="private-button is-outline" to="/benchmark/recent">{w("Restore evaluation","恢复评测")}</Link></div>}
      {error&&<div className="private-error" role="alert"><p>{error}</p>{current&&!terminalRun(current)&&<p>{w("Keeping the last valid status while automatic refresh recovers.","保留最近一次有效状态，正在自动恢复刷新。")}</p>}<button className="private-quiet" onClick={()=>setRefresh(value=>value+1)}>{w("Try again","重试")}</button></div>}
      {!!accessKey&&!current&&!error&&<p className="private-state" role="status">{slowRun?w("Reading task status and checking your result link…","正在读取任务状态并检查结果链接…"):w("Loading evaluation…","正在加载评测…")}</p>}
      {current&&<>
        {access&&unsaved&&<RecoveryActions access={access} unsaved/>}
        <div className="private-run-source"><a href={`${current.repository_url}/tree/${current.commit_sha}`} rel="noreferrer" target="_blank">{current.repository_url.replace("https://github.com/","")} <ExternalLink size={13} aria-hidden="true"/></a><code title={current.commit_sha}>{current.commit_sha.slice(0,12)}</code><span>{current.mode==="quick"?w("Quick · integration and small-scale check","快速 · 接入与小规模检查"):w("Full · single measurement","完整 · 单次评测")} · 4 CPU · 32 GiB</span></div>
        <BenchmarkProgress run={current} validDatasets={validDatasets} busy={busy} onCancel={()=>setConfirmCancel(true)}/>
        {confirmCancel&&<div className="private-confirm-cancel" role="group" aria-label={w("Confirm cancellation","确认取消")}><p>{w("Cancel this evaluation? Completed results will remain available.","取消本次评测？已完成的结果会保留。")}</p><button className="private-button" onClick={cancel} disabled={busy}>{busy?w("Cancelling…","正在取消…"):w("Confirm cancellation","确认取消")}</button><button className="private-quiet" onClick={()=>setConfirmCancel(false)}>{w("Keep running","继续评测")}</button></div>}
        {current.error&&<div className="private-notice" role="status"><strong>{runState(current.status,locale)}</strong><p>{runFailureMessage(current.error,locale)}</p><code>{current.error.code}</code>{current.error.stage&&<p>{w("Failed during: ","失败阶段：")}{runState(current.error.stage,locale)}</p>}<p>{w("Error ID: ","错误编号：")}<code>{current.error.error_id??current.id}</code></p> · <Link to="/docs?section=quick-start&article=benchmark-integration">{w("Troubleshooting help","故障排查说明")}</Link></div>}
        {slowResults&&<p role="status">{w("Reading dataset measurements and validating the saved report…","正在读取各数据集测量值并校验已保存报告…")}</p>}
        {resultError&&<p className="private-error" role="alert">{resultError} <button className="private-quiet" onClick={()=>setResultRetry(value=>value+1)}>{w("Retry results","重试成绩加载")}</button></p>}
        <p className="benchmark-notification-state">{w("Email: ","邮件通知：")}{({skipped:w("No email provided","未填写邮箱"),pending:w("Waiting to send","等待发送"),sent:w("Sent by the mail provider; inbox delivery is not guaranteed","邮件服务已发送；不代表已进入收件箱"),failed:w("Sending failed; results are unaffected","发送失败，不影响评测结果")})[current.email_status]}{["pending","failed"].includes(current.email_status)&&<> · <button className="private-quiet" onClick={()=>setRefresh(value=>value+1)}>{w("Refresh notification status","刷新通知状态")}</button></>}</p>
        {current.mode==="quick"&&current.status==="completed"&&<div className="benchmark-quick-next"><p>{w("Quick results check integration and two small datasets; they are not included in full evaluation rankings.","快速结果用于接入和两个小数据集检查，不计入完整评测排名。")}</p><Link className="private-button is-outline" to={`/benchmark/submit?${new URLSearchParams({repository:current.repository_url,revision:current.commit_sha,mode:"full",types:current.supported_types.join(","),...(current.method_name.length<=80?{name:current.method_name}:{})})}`}>{w("Submit full evaluation at this commit","使用相同 commit 提交完整评测")}</Link></div>}
        {terminalRun(current)&&!current.has_results&&<div className="private-state"><p role="status">{w("No results available.","暂无可用成绩。")}</p><p>{w("Check the task log below, then submit your updated repository.","可查看下方任务日志，修改程序后重新提交。")}</p><Link className="private-button is-outline" to="/benchmark/submit">{w("Submit an updated program","重新提交程序")}</Link></div>}
        {report?.run_id===runId&&<>
          <div className="private-compare-heading"><h2>{w("Results","评测结果")}</h2>{current.mode!=="quick"&&<div className="private-compare-links"><button aria-pressed={query.get("results")!=="mine"} onClick={()=>setQuery(current=>{const next=new URLSearchParams(current);next.delete("results");return next;},{replace:true})}>{w("Compare methods","与其他方法对比")}</button><button aria-pressed={query.get("results")==="mine"} onClick={()=>setQuery(current=>{const next=new URLSearchParams(current);next.set("results","mine");return next;},{replace:true})}>{w("My results","我的成绩")}</button></div>}</div>
          {current.mode!=="quick"&&query.get("results")!=="mine"&&comparison?<ComparisonView report={comparison} accessKey={accessKey} runId={runId}/>:<>
            {current.mode!=="quick"&&query.get("results")!=="mine"&&!comparison&&<p className={comparisonError?"private-error":"benchmark-result-loading"} role="status">{comparisonError?<>{w("Comparison unavailable. Your results are below.","暂时无法加载对比，以下是本程序成绩。")} {comparisonError} <button className="private-quiet" onClick={()=>setComparisonRetry(value=>value+1)}>{w("Retry comparison","重试对比")}</button></>:slowComparison?w("Reading the frozen public baseline and matching measurement conditions…","正在读取固定公开基线并匹配测量条件…"):w("Loading comparison…","正在加载对比…")}</p>}
            <PrivateResults report={report} accessKey={accessKey}/>
          </>}
        </>}
        <details className="private-events" onToggle={event=>{if(event.currentTarget.open&&logs===null)void readLogs();}}><summary>{w("Build and task log","构建与任务日志")}</summary>{logs===null?<p>{w("Loading…","正在加载…")} <button className="private-quiet" disabled={busy} onClick={readLogs}>{w("Retry log","重试日志")}</button></p>:<pre tabIndex={0}>{logs||w("No log entries yet.","暂无日志。")}</pre>}</details>
      </>}

  </PrivateShell>;
}
