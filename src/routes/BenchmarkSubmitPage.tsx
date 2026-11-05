import {useEffect,useRef,useState,type FormEvent} from "react";
import {Link,useNavigate,useSearchParams} from "react-router-dom";
import {Activity,ArrowRight,ChevronRight,ExternalLink,Loader2} from "lucide-react";
import {EasyMsaApiError} from "../lib/api/client";
import {useLanguage} from "../lib/i18n/useLanguage";
import {githubRepository} from "../features/benchmark/privateModel";
import {privateApi,privateError,type SubmissionBody,type RepositoryPrecheck} from "../features/benchmark/privateApi";
import {PrivateShell,RequestError,useBenchmarkStatus} from "../features/benchmark/privateShared";
import {BenchmarkJourney} from "../features/benchmark/BenchmarkNavigation";
import {accessFor,saveBenchmarkAccess,pendingSubmissionKey,clearPendingSubmission,latestPendingSubmission} from "../features/benchmark/privateAccess";

type Draft={mode:"quick"|"full";repository:string;email:string;revision:string;name:string;types:("dna"|"rna")[]};
const template="https://github.com/malabz/MSA-Kit/tree/c49b49f748902798ce90c21cb734baf11ea4a3f9/benchmark";

export function BenchmarkSubmitPage(){
  const [params]=useSearchParams();
  const example=params.get("example")==="msa-kit",previousMode=useRef(example);
  useEffect(()=>{
    if(previousMode.current!==example){
      document.querySelector<HTMLAnchorElement>('.benchmark-entry-tabs a[aria-current="page"]')?.focus({preventScroll:true});
      previousMode.current=example;
    }
  },[example]);
  // Keep the form draft when visitors explore the example and come back.
  // It lives in memory; example mode never mounts the API-backed form.
  const [draft,setDraft]=useState<Draft>(()=>{
    const pending=latestPendingSubmission()?.body;
    const queryTypes=(params.get("types")??"").split(",").filter((type):type is "dna"|"rna"=>type==="dna"||type==="rna");
    return {mode:pending?(pending.mode??"full"):params.get("mode")==="full"?"full":"quick",repository:pending?.repository_url??(githubRepository.safeParse(params.get("repository")).success?params.get("repository")!:""),email:pending?.email??"",revision:pending?.revision??(/^[a-f0-9]{40}$/.test(params.get("revision")??"")?params.get("revision")!:""),name:pending?.method_name??(params.get("name")??"").trim().slice(0,80),types:pending?.supported_types??(queryTypes.length?[...new Set(queryTypes)]:["dna","rna"])};
  });
  return example?<ExampleSubmission/>:<RealBenchmarkSubmitPage draft={draft} update={patch=>setDraft(current=>({...current,...patch}))}/>;
}

function SubmissionTabs({example=false}:{example?:boolean}){
  const {locale}=useLanguage(),zh=locale==="zh";
  return <nav className="benchmark-entry-tabs" aria-label={zh?"评测方式":"Evaluation mode"}>
    <Link to="/benchmark/submit" aria-current={!example?"page":undefined}>{zh?"提交我的程序":"Submit my program"}</Link>
    <Link to="/benchmark/submit?example=msa-kit" aria-current={example?"page":undefined}>{zh?"用 MSA-Kit 体验":"Try MSA-Kit"}</Link>
  </nav>;
}

function SubmissionHelp({example=false,mode="full"}:{example?:boolean;mode?:"quick"|"full"}){
  const {locale}=useLanguage(),w=(en:string,zh:string)=>locale==="zh"?zh:en;
  return <aside className="benchmark-submit-help">
    <h2>{example?w("Experience the complete comparison","先看看评测能得到什么"):w("What happens next","提交后会发生什么")}</h2>
    <p>{example?w("Open MSA-Kit's completed evaluation and compare it with six alignment methods.","打开 MSA-Kit 已完成的真实评测，与六款比对方法一起比较。"):mode==="quick"?w("We build and check your program, then run two small datasets to check integration and output.","我们会构建并检查程序，再运行两个小数据集，检查接入、输出与指标。快速结果不计入完整评测排名。"):w("We build and check your program, evaluate it on the datasets, then prepare your comparison.","我们会自动构建并检查程序，逐组运行数据集，完成后生成对比结果。")}</p>
    <dl className="benchmark-help-facts">
      <div><dt>{w("Datasets","数据集")}</dt><dd>{mode==="quick"?2:26} {w("DNA / RNA datasets","组 DNA / RNA")}</dd></div>
      <div><dt>{w("Metrics","指标")}</dt><dd>{w("Time, memory and alignment quality","时间、内存和比对质量")}</dd></div>
      <div><dt>{w("Results","结果")}</dt><dd>{mode==="quick"?w("Your measurements, CSV and JSON","本程序成绩、CSV / JSON"):w("Charts, tables, CSV and JSON","对比图表、数值表、CSV / JSON")}</dd></div>
    </dl>
    <p>{w("Your own algorithm is welcome. It only needs the build and run adapters, not the internal MSA-Kit structure.","可以使用自行编写的算法，只需提供构建和运行适配脚本，无需改成 MSA-Kit 内部结构。")}</p><Link className="benchmark-template-link" target="_blank" rel="noreferrer" to="/docs?section=quick-start&article=benchmark-integration">{w("Integration guide and local check","接入说明与本地检查")}</Link>
    <a className="benchmark-template-link" href={template} target="_blank" rel="noreferrer">{w("View the integration template","查看程序接入模板")}<ExternalLink size={14} aria-hidden="true"/></a>
    <details><summary><ChevronRight size={15} aria-hidden="true"/>{w("Repository requirements","仓库接入要求")}</summary>
      <p>{w("Add these scripts at the repository root:","在仓库根目录提供这两个脚本：")}</p>
      <pre><code>{"benchmark/build.sh\nbenchmark/run.sh"}</code></pre>
      <p>{w("The run script receives input, output, threads and sequence type:","运行脚本依次接收输入、输出、线程数和序列类型：")}</p>
      <pre><code>bash benchmark/run.sh input.fasta aligned.fasta 4 dna</code></pre>
      <p>{w("C++ / CMake, Python and Bash. Builds run offline; include dependencies in the repository. Write aligned FASTA to the output path and return 0 on success.","支持 C++ / CMake、Python 和 Bash。离线构建，请附带所需依赖；将 aligned FASTA 写入指定路径，成功时返回 0。")}</p>
    </details>
  </aside>;
}

function ExampleSubmission(){
  const {locale}=useLanguage(),navigate=useNavigate(),w=(en:string,zh:string)=>locale==="zh"?zh:en;
  return <PrivateShell title={w("Evaluate my program","评测我的程序")} description={w("Submit your repository or try a completed evaluation first.","提交自己的程序，或先用示例了解评测过程。")}>
    <BenchmarkJourney/>
    <div className="benchmark-submit-layout">
      <div className="benchmark-submit-main"><SubmissionTabs example/>
        <div className="benchmark-form-intro"><h2>{w("Try MSA-Kit","体验 MSA-Kit")}</h2><p>{w("Use real, completed results. Compare instantly.","使用已完成的真实成绩，即时体验。")}</p></div>
        <form className="private-form benchmark-example-form" onSubmit={event=>{event.preventDefault();navigate("/benchmark/examples/msa-kit");}}>
          <label htmlFor="example-repository">{w("GitHub repository","GitHub 仓库")}<input id="example-repository" type="url" readOnly value="https://github.com/malabz/MSA-Kit"/></label>
          <div className="benchmark-example-identity"><div><strong>MSA-Kit</strong><small>{w("Version","版本")} c49b49f74890 · DNA / RNA</small></div><span>{w("25 complete · 1 timed out","25 组完成 · 1 组超时")}</span></div>
          <div className="benchmark-submit-actions"><button type="submit" className="private-button">{w("Try evaluation","体验评测")}<ArrowRight size={16} aria-hidden="true"/></button><p>{w("No waiting. Open the saved results directly.","无需等待，直接查看已完成的评测结果。")}</p></div>
        </form>
      </div><SubmissionHelp example/>
    </div>
  </PrivateShell>;
}

function RealBenchmarkSubmitPage({draft,update}:{draft:Draft;update:(patch:Partial<Draft>)=>void}){
  const {locale}=useLanguage(),w=(en:string,zh:string)=>locale==="zh"?zh:en,state=useBenchmarkStatus(),navigate=useNavigate();
  const [pendingRetry,setPendingRetry]=useState(latestPendingSubmission);
  const {repository,email,revision,name,types,mode}=draft;
  const [checked,setChecked]=useState<{identity:string;result:RepositoryPrecheck}|null>(null);
  const repositoryIdentity=JSON.stringify([repository.trim(),revision.trim()]);
  const prechecked=checked?.identity===repositoryIdentity?checked.result:null;
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[repositoryError,setRepositoryError]=useState(""),[typeError,setTypeError]=useState("");
  const pendingDraftIdentity=useRef<string|null>(null);
  const submitting=useRef(false),repositoryInput=useRef<HTMLInputElement>(null),errorSummary=useRef<HTMLParagraphElement>(null),settings=useRef<HTMLDetailsElement>(null);
  const available=!!state.status?.accepting;
  useEffect(()=>{if(error&&!busy)errorSummary.current?.focus();},[error,busy]);

  function validateRepository(){
    const valid=githubRepository.safeParse(repository.trim()).success;
    setRepositoryError(valid?"":w("Enter a public GitHub repository URL.","请输入公开的 GitHub 仓库链接。"));
    return valid;
  }
  async function submit(event:FormEvent){
    event.preventDefault();if(submitting.current||!available||mode==="quick"&&state.status?.quick_available===false)return;setError("");
    if(!validateRepository()){repositoryInput.current?.focus();return;}
    if(!types.length){setTypeError(w("Select at least one sequence type.","请选择至少一种序列类型。"));if(settings.current){settings.current.open=true;settings.current.querySelector<HTMLInputElement>('input[type="checkbox"]')?.focus();}return;}
    setTypeError("");
    const fields=(value:SubmissionBody)=>JSON.stringify([value.repository_url,value.revision??"",value.method_name??"",[...(value.supported_types??["dna","rna"])].sort(),value.email??"",value.mode??"full"]);
    const draftBody:SubmissionBody={repository_url:repository.trim(),mode,revision:revision.trim()||undefined,method_name:name.trim()||undefined,supported_types:types,email:email.trim()||undefined};
    if(pendingRetry&&(fields(draftBody)===fields(pendingRetry.body)||pendingDraftIdentity.current===fields(draftBody))){await send(pendingRetry.body,pendingRetry.fingerprint,pendingRetry.key);return;}
    if(!prechecked){
      submitting.current=true;setBusy(true);
      try{const client=await privateApi.client();const result=await privateApi.precheck({repository_url:repository.trim(),...(revision.trim()?{revision:revision.trim()}:{})},client.csrf_token);setChecked({identity:repositoryIdentity,result});}
      catch(error){setError(privateError(error,locale));}
      finally{submitting.current=false;setBusy(false);}
      return;
    }
    const body:SubmissionBody={repository_url:prechecked.repository_url,revision:prechecked.commit_sha,mode,language:locale,...(name.trim()?{method_name:name.trim()}:{}),...(types.length===2?{}:{supported_types:types}),...(email.trim()?{email:email.trim()}:{})};
    if(!state.status?.email_available)delete body.email;
    if(pendingRetry&&fields(body)===fields(pendingRetry.body)){await send(pendingRetry.body,pendingRetry.fingerprint,pendingRetry.key);return;}
    pendingDraftIdentity.current=fields(draftBody);
    const fingerprint=JSON.stringify(body),key=pendingSubmissionKey(fingerprint);await send(body,fingerprint,key);
  }
  async function send(body:SubmissionBody,fingerprint:string,key:string){
    if(submitting.current)return;submitting.current=true;setPendingRetry({body,fingerprint,key});setBusy(true);setError("");
    try{
      const client=await privateApi.client(),result=await privateApi.submit(body,client.csrf_token,key),access=accessFor(result.run,result.access_key),saved=saveBenchmarkAccess(access);
      clearPendingSubmission(fingerprint);navigate(`/benchmark/runs/${result.run.id}${saved?"":`?key=${encodeURIComponent(result.access_key)}`}`);
    }catch(error){
      if(error instanceof EasyMsaApiError&&error.code==="BENCHMARK_EMAIL_UNAVAILABLE"){update({email:""});clearPendingSubmission(fingerprint);setPendingRetry(null);}
      setError(privateError(error,locale));
    }finally{submitting.current=false;setBusy(false);}
  }
  return <PrivateShell title={w("Evaluate my program","评测我的程序")} description={w("Check your program with a quick evaluation, or compare performance with a full evaluation.","先用快速评测检查接入，再用完整评测比较速度与质量。")}>
    <BenchmarkJourney/>
    <div className="benchmark-submit-layout">
      <div className="benchmark-submit-main"><SubmissionTabs/>
        <div className="benchmark-form-intro"><h2>{w("Your repository","提交仓库")}</h2><p>{w("Only the public repository URL is required.","填写公开仓库链接即可，其余设置可保留默认值。")}</p></div>
        {state.error?<RequestError error={state.error} retry={state.retry}/>:state.status?.reason==="local_preview"?<p className="benchmark-notice" role="status">{w("Local preview. Try MSA-Kit here, or ","当前为本地预览，可体验 MSA-Kit 示例；真实评测请")}<a href="https://easymsa.cn/#/benchmark/submit">{w("submit on EasyMSA.","前往正式网站提交。")}</a></p>:state.status&&!available?<p className="benchmark-notice" role="status">{w("New evaluations are paused. You can still try the MSA-Kit example or view saved results.","新评测暂未开放，可以先体验 MSA-Kit 示例或查看已有结果。")}</p>:<p className="benchmark-service-state" data-ready={available} role="status">{available?<Activity size={15} aria-hidden="true"/>:<Loader2 className="benchmark-spin" size={15} aria-hidden="true"/>}{available?w("Evaluation service ready","评测服务可用"):w("Checking availability…","正在检查服务状态…")}</p>}
        {pendingRetry&&<button className="private-button is-outline private-pending-retry" type="button" disabled={busy} onClick={()=>send(pendingRetry.body,pendingRetry.fingerprint,pendingRetry.key)}>{w("Retry saved submission","找回上次提交")}</button>}
        <form className="private-form" onSubmit={submit} aria-label={w("GitHub evaluation","GitHub 评测")} aria-busy={busy}>
          <fieldset disabled={busy}>
            <label htmlFor="benchmark-repository">{w("GitHub repository","GitHub 仓库")}
              <input ref={repositoryInput} id="benchmark-repository" type="url" autoComplete="url" required maxLength={300} placeholder="https://github.com/owner/repository" value={repository} onChange={event=>{update({repository:event.target.value});if(repositoryError)setRepositoryError("");}} onBlur={()=>{if(repository.trim())validateRepository();}} aria-invalid={!!repositoryError} aria-describedby={repositoryError?"benchmark-repository-error":"benchmark-repository-hint"}/>
            </label>
            {repositoryError?<span className="benchmark-field-error" id="benchmark-repository-error" role="alert">{repositoryError}</span>:<span className="private-field-hint" id="benchmark-repository-hint">{w("Include benchmark/build.sh and benchmark/run.sh in your repository.","仓库需包含 benchmark/build.sh 和 benchmark/run.sh。")}</span>}
            <fieldset className="benchmark-mode-choice"><legend>{w("Evaluation mode","评测模式")}</legend>
              <label><input type="radio" name="benchmark-mode" checked={mode==="quick"} onChange={()=>update({mode:"quick"})}/><span><strong>{w("Quick evaluation","快速评测")}</strong><small>{w("2 small datasets · integration and output check · 60 s per dataset for alignment and scoring","2 个小数据集 · 接入与输出检查 · 每组比对、评分各限 60 秒")}</small></span></label>
              <label><input type="radio" name="benchmark-mode" checked={mode==="full"} onChange={()=>update({mode:"full"})}/><span><strong>{w("Full evaluation","完整评测")}</strong><small>{w("All 26 datasets · formal comparison under the existing measurement conditions","全部 26 个数据集 · 采用现有测量条件进行正式比较")}</small></span></label>
            </fieldset>
            {mode==="quick"&&state.status?.quick_available===false&&<p className="benchmark-notice" role="status">{w("Quick evaluation is temporarily unavailable. Choose full evaluation or try later.","快速评测暂不可用，可选择完整评测或稍后重试。")}</p>}
            {prechecked&&<p className="benchmark-precheck-result" role="status"><strong>{w("Repository check passed","仓库检查通过")}</strong><code>{prechecked.commit_sha}</code><span>{w("Both adapter scripts exist. This exact commit will be evaluated. No repository code has been executed.","两个适配脚本均存在；将评测这个固定提交。检查未执行仓库代码。")}</span></p>}
            <label className="private-email" htmlFor="benchmark-email">{w("Notification email","通知邮箱")} <span className="private-optional">{w("optional","可选")}</span>
              <input id="benchmark-email" type="email" autoComplete="email" maxLength={254} placeholder={w("Your email address","你的邮箱地址")} value={email} onChange={event=>update({email:event.target.value})} disabled={!state.status?.email_available} aria-describedby="benchmark-email-hint"/>
              <span id="benchmark-email-hint" className="private-field-hint">{!state.status&&!state.error?w("Checking email service…","正在读取邮件服务状态…"):state.error?w("Email availability could not be checked. Retry the service check.","暂时无法确认邮件服务状态，请重试服务检查。"):state.status?.email_available?w("Receive progress and result links.","接收任务和结果链接。"):w("Email notifications are currently unavailable.","邮件通知暂不可用。")}</span>
            </label>
            <details className="private-more-settings" ref={settings}><summary>{w("More settings","更多设置")}</summary>
              <div className="private-form-pair"><label htmlFor="benchmark-method-name">{w("Method name","方法名称")}<input id="benchmark-method-name" maxLength={80} value={name} placeholder={w("Repository name","默认使用仓库名称")} onChange={event=>update({name:event.target.value})}/></label><label htmlFor="benchmark-revision">{w("Version","版本")}<input id="benchmark-revision" maxLength={160} value={revision} placeholder={w("Default branch","默认分支")} onChange={event=>update({revision:event.target.value})}/></label></div>
              <fieldset className="private-types" aria-describedby={typeError?"benchmark-type-error":undefined}><legend>{w("Supported sequences","支持的序列类型")}</legend>{(["dna","rna"]as const).map(type=><label key={type}><input type="checkbox" checked={types.includes(type)} onChange={event=>{update({types:event.target.checked?[...types,type]:types.filter(value=>value!==type)});setTypeError("");}}/>{type.toUpperCase()}</label>)}</fieldset>
              {typeError&&<span id="benchmark-type-error" className="benchmark-field-error" role="alert">{typeError}</span>}
            </details>
          </fieldset>
          {error&&<p className="private-error" tabIndex={-1} ref={errorSummary} role="alert">{error} <Link target="_blank" rel="noreferrer" to="/docs?section=quick-start&article=benchmark-integration">{w("Integration help","接入帮助")}</Link></p>}
          <div className="benchmark-submit-actions"><button className="private-button" type="submit" disabled={busy||!available||mode==="quick"&&state.status?.quick_available===false}>{busy?<><Loader2 className="benchmark-spin" size={16} aria-hidden="true"/>{prechecked?w("Submitting…","正在提交…"):w("Checking repository…","正在检查仓库…")}</>:<>{prechecked?w("Start evaluation","开始评测"):w("Check repository","检查仓库")}<ArrowRight size={16} aria-hidden="true"/></>}</button><p>{w("Saved to Recent evaluations in this browser.","任务会保存在此浏览器的「最近评测」中。")}</p></div>
        </form>
      </div><SubmissionHelp mode={mode}/>
    </div>
  </PrivateShell>;
}
