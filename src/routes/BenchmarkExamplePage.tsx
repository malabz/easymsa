import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {ArrowRight,CheckCircle2} from "lucide-react";
import {useLanguage} from "../lib/i18n/useLanguage";
import {PrivateShell} from "../features/benchmark/privateShared";
import {ComparisonView} from "../features/benchmark/ComparisonView";
import {loadComparisonExample} from "../features/benchmark/comparisonApi";
import type {ComparisonReport} from "../features/benchmark/comparisonModel";
export function BenchmarkExamplePage(){
 const{locale}=useLanguage(),w=(en:string,zh:string)=>locale==="zh"?zh:en,[report,setReport]=useState<ComparisonReport|null>(null),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();setFailed(false);loadComparisonExample(controller.signal).then(value=>{if(!controller.signal.aborted)setReport(value);}).catch(()=>{if(!controller.signal.aborted)setFailed(true);});return()=>controller.abort();},[retry]);
 const candidateRows=report?.results.filter(row=>row.method_id===report.candidate.id)??[],complete=candidateRows.filter(row=>row.status==="complete").length,timeout=candidateRows.filter(row=>row.status==="timeout").length;
 return <PrivateShell title={w("MSA-Kit · Example","MSA-Kit · 示例")} description={w("Compare a completed evaluation with six alignment methods.","用一次已完成的真实评测，了解程序与六款方法的表现。")} actions={<Link className="private-button" to="/benchmark/submit">{w("Evaluate my program","评测我的程序")}<ArrowRight size={16} aria-hidden="true"/></Link>}>
   <div className="benchmark-results-banner"><span><CheckCircle2 size={17} aria-hidden="true"/>{w("Real, completed evaluation","已完成的真实评测")}{report&&` · ${complete} ${w("complete","组完成")} · ${timeout} ${w("timed out","组超时")}`}</span><Link to="/benchmark/submit?example=msa-kit">{w("Back to the example","返回示例入口")}</Link></div>
   {report?<ComparisonView report={report} example/>:failed?<div className="private-state" role="alert"><p>{w("Could not load the example.","示例加载失败。")}</p><button className="private-button is-outline" onClick={()=>setRetry(value=>value+1)}>{w("Try again","重试")}</button></div>:<p className="private-state" role="status">{w("Loading example…","正在加载示例…")}</p>}
   <p className="private-example-description"><a href="https://github.com/malabz/MSA-Kit/tree/c49b49f748902798ce90c21cb734baf11ea4a3f9/benchmark" target="_blank" rel="noreferrer">{w("Use the MSA-Kit integration scripts","查看 MSA-Kit 接入脚本")} ↗</a></p>
 </PrivateShell>;
}
