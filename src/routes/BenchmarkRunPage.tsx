import {useEffect,useState} from "react";
import {Link,useParams,useSearchParams} from "react-router-dom";
import {ExternalLink} from "lucide-react";
import {useLanguage} from "../lib/i18n/useLanguage";
import {privateApi,privateError} from "../features/benchmark/privateApi";
import {terminalRun,type PrivateRun,type PrivateResult} from "../features/benchmark/privateModel";
import {PrivateShell,RecoveryActions,runState} from "../features/benchmark/privateShared";
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
  const [comparison,setComparison]=useState<ComparisonReport|null>(null),[comparisonError,setComparisonError]=useState(false),[comparisonRetry,setComparisonRetry]=useState(0);
  useEffect(()=>{
    setRun(null);setReport(null);setLogs(null);setError("");setResultError("");
    setAccess(null);setValidatedKey(null);if(!accessKey)return;
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
    async function read(){
      try{const next=await privateApi.run(runId,accessKey,controller.signal);if(controller.signal.aborted)return;if(next.id!==runId)throw Error("Run identity mismatch");setRun(next);setValidatedKey(accessKey);setError("");const recovered=accessFor(next,accessKey),saved=saveBenchmarkAccess(recovered);setAccess(recovered);setUnsaved(!saved);if(saved&&query.has("key")){setQuery(current=>{const clean=new URLSearchParams(current);clean.delete("key");return clean;},{replace:true});}if(!terminalRun(next))timer=setTimeout(read,3000);}
      catch(error){if(!controller.signal.aborted){setError(privateError(error,locale));}}
    }
    void read();return()=>{controller.abort();clearTimeout(timer);};
  },[runId,accessKey,refresh,locale]);
  useEffect(()=>{
    if(!run?.has_results||run.id!==runId||validatedKey!==accessKey)return;
    const controller=new AbortController();setResultError("");
    privateApi.results(runId,accessKey,controller.signal).then(result=>{if(result.run_id!==runId)throw new Error("Result identity mismatch");if(!controller.signal.aborted)setReport(result);}).catch(error=>{if(!controller.signal.aborted){setResultError(privateError(error,locale));}});
    return()=>controller.abort();
  },[run?.id,run?.has_results,run?.completed_units,run?.status,runId,accessKey,validatedKey]);
  useEffect(()=>{setComparison(null);setComparisonError(false);if(!report||report.run_id!==runId||validatedKey!==accessKey)return;const controller=new AbortController();loadComparison(runId,accessKey,controller.signal).then(value=>{if(!controller.signal.aborted)setComparison(value);}).catch(()=>{if(!controller.signal.aborted)setComparisonError(true);});return()=>controller.abort();},[report,runId,accessKey,validatedKey,comparisonRetry]);
  async function cancel(){if(!accessKey||busy)return;setBusy(true);setError("");try{setRun(await privateApi.cancel(runId,accessKey));setConfirmCancel(false);}catch(error){setError(privateError(error,locale));}finally{setBusy(false);}}
  async function readLogs(){setBusy(true);try{setLogs((await privateApi.logs(runId,accessKey)).slice(0,100000));}catch(error){setError(privateError(error,locale));}finally{setBusy(false);}}
  const current=run?.id===runId&&validatedKey===accessKey?run:null;
  const validDatasets=report?.run_id===runId?report.results.filter(result=>result.valid_repeats>0).length:null;

  return <PrivateShell title={current?.method_name??w("Evaluation","评测任务")} actions={access&&!unsaved?<BenchmarkSaveMenu access={access}/>:undefined}>
    {!accessKey&&<div className="private-state"><p>{w("Open this task from a saved result link or recovery file.","请通过保存的结果链接或恢复文件打开任务。")}</p><Link className="private-button is-outline" to="/benchmark/recent">{w("Restore evaluation","恢复评测")}</Link></div>}
      {error&&<div className="private-error" role="alert"><p>{error}</p><button className="private-quiet" onClick={()=>setRefresh(value=>value+1)}>{w("Try again","重试")}</button></div>}
      {!!accessKey&&!current&&!error&&<p className="private-state" role="status">{w("Loading evaluation…","正在加载评测…")}</p>}
      {current&&<>
        {access&&unsaved&&<RecoveryActions access={access} unsaved/>}
        <div className="private-run-source"><a href={`${current.repository_url}/tree/${current.commit_sha}`} rel="noreferrer" target="_blank">{current.repository_url.replace("https://github.com/","")} <ExternalLink size={13} aria-hidden="true"/></a><code title={current.commit_sha}>{current.commit_sha.slice(0,12)}</code><span>{w("Single measurement","单次评测")} · 4 CPU · 32 GiB</span></div>
        <BenchmarkProgress run={current} validDatasets={validDatasets} busy={busy} onCancel={()=>setConfirmCancel(true)}/>
        {confirmCancel&&<div className="private-confirm-cancel" role="group" aria-label={w("Confirm cancellation","确认取消")}><p>{w("Cancel this evaluation? Completed results will remain available.","取消本次评测？已完成的结果会保留。")}</p><button className="private-button" onClick={cancel} disabled={busy}>{busy?w("Cancelling…","正在取消…"):w("Confirm cancellation","确认取消")}</button><button className="private-quiet" onClick={()=>setConfirmCancel(false)}>{w("Keep running","继续评测")}</button></div>}
        {current.error&&<div className="private-notice" role="status"><strong>{runState(current.status,locale)}</strong><p>{current.error.message}</p></div>}
        {resultError&&<p className="private-error" role="alert">{resultError}</p>}
        {terminalRun(current)&&!current.has_results&&<div className="private-state"><p role="status">{w("No results available.","暂无可用成绩。")}</p><p>{w("Check the task log below, then submit your updated repository.","可查看下方任务日志，修改程序后重新提交。")}</p><Link className="private-button is-outline" to="/benchmark/submit">{w("Submit an updated program","重新提交程序")}</Link></div>}
        {report?.run_id===runId&&<><div className="private-compare-heading"><h2>{w("Results","评测结果")}</h2><div className="private-compare-links"><button aria-pressed={query.get("results")!=="mine"} onClick={()=>setQuery(current=>{const next=new URLSearchParams(current);next.delete("results");return next;},{replace:true})}>{w("Compare methods","与其他方法对比")}</button><button aria-pressed={query.get("results")==="mine"} onClick={()=>setQuery(current=>{const next=new URLSearchParams(current);next.set("results","mine");return next;},{replace:true})}>{w("My results","我的成绩")}</button></div></div>{query.get("results")==="mine"?<PrivateResults report={report} accessKey={accessKey}/>:comparison?<ComparisonView report={comparison} accessKey={accessKey} runId={runId}/>:comparisonError?<><p className="private-error">{w("Comparison unavailable. Your results are below.","暂时无法加载对比，以下是本程序成绩。")} <button className="private-quiet" onClick={()=>setComparisonRetry(value=>value+1)}>{w("Try again","重试")}</button></p><PrivateResults report={report} accessKey={accessKey}/></>:<div className="benchmark-result-loading" role="status"><p>{w("Loading comparison…","正在加载对比…")}</p></div>}</>}
        <details className="private-events" onToggle={event=>{if(event.currentTarget.open&&logs===null)void readLogs();}}><summary>{w("Build and task log","构建与任务日志")}</summary>{logs===null?<p>{w("Loading…","正在加载…")}</p>:<pre tabIndex={0}>{logs||w("No log entries yet.","暂无日志。")}</pre>}</details>
      </>}

  </PrivateShell>;
}
