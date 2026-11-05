import {useEffect,useState,type ReactNode} from "react";
import {Copy,Download} from "lucide-react";
import {useLanguage} from "../../lib/i18n/useLanguage";
import {privateApi,privateError} from "./privateApi";
import type {BenchmarkFeature} from "./privateModel";
import {benchmarkResultLink,downloadBenchmarkRecovery,type BenchmarkAccess} from "./privateAccess";
import "./private.css";
import {BenchmarkNavigation} from "./BenchmarkNavigation";
export function useBenchmarkStatus(){const[status,setStatus]=useState<BenchmarkFeature|null>(null),[error,setError]=useState<unknown>(null),[retry,setRetry]=useState(0);useEffect(()=>{const controller=new AbortController();setError(null);privateApi.status(controller.signal).then(setStatus).catch(error=>{if(!controller.signal.aborted)setError(error);});return()=>controller.abort();},[retry]);return{status,error,retry:()=>setRetry(value=>value+1)};}
export function PrivateShell({title,description,children,actions}:{title:string;description?:string;children:ReactNode;actions?:ReactNode}){return <div className="benchmark-workflow-frame"><BenchmarkNavigation/><div className="private-benchmark benchmark-workflow" data-testid="private-benchmark"><header className="private-title"><div><h1>{title}</h1>{description&&<p>{description}</p>}</div>{actions&&<div className="benchmark-title-actions">{actions}</div>}</header>{children}</div></div>;}
export function RequestError({error,retry}:{error:unknown;retry:()=>void}){const{locale}=useLanguage();return <div className="private-error" role="alert"><p>{privateError(error,locale)}</p><button className="private-quiet" onClick={retry}>{locale==="zh"?"重试":"Try again"}</button></div>;}
export function RecoveryActions({access,unsaved=false}:{access:BenchmarkAccess;unsaved?:boolean}){const{locale}=useLanguage(),w=(en:string,zh:string)=>locale==="zh"?zh:en,[copied,setCopied]=useState(false),[copyError,setCopyError]=useState(false);async function copy(){try{await navigator.clipboard.writeText(benchmarkResultLink(access));setCopied(true);setCopyError(false);}catch{setCopyError(true);}}return <section className="private-recovery" aria-label={w("Save evaluation","保存评测")}>{unsaved&&<p role="status">{w("This browser could not save the task. Save its link or recovery file.","当前浏览器无法保存任务，请保存结果链接或恢复文件。")}</p>}<div><button className="private-quiet" onClick={copy}><Copy size={14} aria-hidden="true"/>{copied?w("Link copied","链接已复制"):w("Copy result link","复制结果链接")}</button><button className="private-quiet" onClick={()=>downloadBenchmarkRecovery(access)}><Download size={14} aria-hidden="true"/>{w("Save recovery file","下载恢复文件")}</button>{access.expires_at&&<span className="private-expiry">{w("Available until ","保存至 ")}{new Date(access.expires_at).toLocaleDateString(locale==="zh"?"zh-CN":"en-US")}</span>}</div>{copyError&&<label className="private-copy-fallback">{w("Result link","结果链接")}<input readOnly value={benchmarkResultLink(access)} onFocus={event=>event.target.select()}/></label>}</section>;}
export function runState(value:string,locale:"en"|"zh"){const labels:Record<string,[string,string]>={queued:["Queued","排队中"],preparing:["Preparing source","准备源码"],building:["Building","构建"],prechecking:["Interface check","接口预检"],running:["Evaluating","评测中"],scoring:["Scoring","评分中"],validating:["Validating output","校验输出"],exporting:["Generating report","生成报告"],completed:["Completed","已完成"],failed:["Failed","失败"],cancelled:["Cancelled","已取消"],paused:["Paused","已暂停"]};return labels[value]?.[locale==="zh"?1:0]??(locale==="zh"?"处理中":"Processing");}

export function useSlowLoading(pending:boolean,identity:string){const[slow,setSlow]=useState(false);useEffect(()=>{setSlow(false);if(!pending)return;const timer=setTimeout(()=>setSlow(true),8000);return()=>clearTimeout(timer);},[pending,identity]);return slow;}
export function runFailureMessage(error:{code:string;message:string},locale:"zh"|"en"){
  const labels:Record<string,[string,string]>={
    source_failed:["Source preparation failed. Check the public repository and pinned commit.","源码准备失败，请检查公开仓库与固定提交是否可访问。"],
    missing_entrypoint:["An adapter script is missing from the built project.","构建后的程序缺少适配脚本，请检查 build.sh 与 run.sh。"],
    execution_failed:["The program did not exit successfully. Check the dataset and task log.","程序未正常退出，请检查对应数据集和任务日志。"],
    invalid_output:["The output failed FASTA integrity checks. Run the local interface checker.","输出未通过 FASTA 完整性检查，请运行本地接口检查器。"],
    scoring_failed:["The scoring program could not produce a valid measurement.","评分程序未生成有效测量值，请保留任务编号联系维护人员。"],
    profile_changed:["The frozen evaluation profile changed. Submit a new evaluation.","固定评测配置已变化，请重新提交评测。"],
    build_failed:["Build failed. Check benchmark/build.sh and bundled offline dependencies.","构建失败。请检查 benchmark/build.sh 和仓库内的离线依赖。"],
    precheck_failed:["Interface check failed. Check all four run arguments and FASTA output.","接口检查失败。请检查四个运行参数和 FASTA 输出。"],
    timeout:["The stage exceeded its time limit.","当前阶段超过时间限制。"],oom:["The stage exceeded its memory limit.","当前阶段超过内存限制。"],
    platform_error:["The evaluation stopped because of a platform error. Contact support with the task ID.","评测因平台故障停止，请提供任务编号联系维护人员。"],
    incomplete:["The evaluation did not finish. Check the build and task log below.","评测未完成，请查看下方构建与任务日志。"]};
  const code=error.code.replace(/^BENCHMARK_/,"").toLowerCase();
  return labels[code]?.[locale==="zh"?1:0]??(locale==="zh"&&/_(timeout|oom)$/.test(code)?(/_timeout$/.test(code)?"当前阶段超过时间限制，请查看任务日志和资源边界。":"当前阶段超过内存限制，请查看任务日志和资源边界。"):error.message);
}
