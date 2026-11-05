import { z } from "zod";
import { apiUrl, EasyMsaApiError } from "../../lib/api/client";
import { boundedRequest } from "../../lib/api/boundedRequest";
import { privateFeatureSchema,privateResultSchema,privateRunSchema,resolvedRepositorySchema } from "./privateModel";
function request<T>(path:string,options:RequestInit,read:(response:Response)=>Promise<T>,timeout=20_000) {
  return boundedRequest(apiUrl(path),{...options,credentials:"include",headers:{Accept:"application/json","X-EasyMSA-Benchmark-Version":"2",...options.headers}},read,timeout);
}
function json<S extends z.ZodTypeAny>(path:string,schema:S,options:RequestInit={},timeout?:number):Promise<z.output<S>> {return request(path,options,async result=>schema.parse(await result.json()),timeout);}
const credential=(key:string)=>({Authorization:`Bearer ${key}`});
const precheckSchema=resolvedRepositorySchema.extend({requirements:z.object({build_script:z.literal(true),run_script:z.literal(true)}).strict()});
export type RepositoryPrecheck=z.infer<typeof precheckSchema>;
export type SubmissionBody={repository_url:string;revision?:string;method_name?:string;supported_types?:("dna"|"rna")[];email?:string;language?:"en"|"zh";mode?:"quick"|"full"};
export const privateApi={
  status:(signal?:AbortSignal)=>json("benchmark/status",privateFeatureSchema,{signal}),
  client:()=>json("benchmark/client",z.object({csrf_token:z.string().min(1)}).strict(),{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}),
  precheck:(body:Pick<SubmissionBody,"repository_url"|"revision">,csrf:string,signal?:AbortSignal)=>json("benchmark/precheck",precheckSchema,{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf},body:JSON.stringify(body),signal},60_000),
  submit:(body:SubmissionBody,csrf:string,key:string)=>json("benchmark/submissions",z.object({run:privateRunSchema,access_key:z.string().min(32)}).strict(),{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf,"Idempotency-Key":key},body:JSON.stringify(body)},60_000),
  run:(id:string,key:string,signal?:AbortSignal)=>json(`benchmark/runs/${encodeURIComponent(id)}`,privateRunSchema,{headers:credential(key),signal}),
  cancel:(id:string,key:string)=>json(`benchmark/runs/${encodeURIComponent(id)}/cancel`,privateRunSchema,{method:"POST",headers:{...credential(key),"Content-Type":"application/json"},body:"{}"}),
  results:(id:string,key:string,signal?:AbortSignal)=>json(`benchmark/runs/${encodeURIComponent(id)}/results?format=json`,privateResultSchema,{headers:credential(key),signal},60_000),
  logs:(id:string,key:string)=>request(`benchmark/runs/${encodeURIComponent(id)}/logs`,{headers:credential(key)},response=>response.text()),
  download:async(id:string,key:string,format:"json"|"csv")=>{const blob=await request(`benchmark/runs/${encodeURIComponent(id)}/results?format=${format}`,{headers:credential(key)},response=>response.blob(),60_000),url=URL.createObjectURL(blob),anchor=document.createElement("a");anchor.href=url;anchor.download=`benchmark-${id}.${format}`;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
};
export const isUnauthorized=(error:unknown)=>error instanceof EasyMsaApiError&&[401,403,404,410].includes(error.status??0);
export const retryableBenchmarkError=(error:unknown)=>!isUnauthorized(error)&&(!(error instanceof EasyMsaApiError)||error.code!=="INCOMPATIBLE_RESULT"&&(!error.status||error.status>=500||[408,425,429].includes(error.status)));
export function privateError(error:unknown,locale:"en"|"zh") {
  const extra:Record<string,[string,string]>={LOAD_TIMEOUT:["Loading timed out. Retry the request.","加载超时，请重试。"],NETWORK_FAILURE:["Network connection failed. Check your connection and retry.","网络连接失败，请检查网络后重试。"],INCOMPATIBLE_RESULT:["The result format could not be read. Retry or contact support with the task ID.","结果格式无法读取。请重试，或提供任务编号联系维护人员。"],BENCHMARK_INTERFACE_MISSING:["The selected commit must contain benchmark/build.sh and benchmark/run.sh. See the integration guide.","所选提交缺少 benchmark/build.sh 或 benchmark/run.sh，请查看程序接入说明。"],BENCHMARK_QUICK_UNAVAILABLE:["Quick evaluation is temporarily unavailable. Choose full evaluation or try later.","快速评测暂不可用，可选择完整评测或稍后重试。"]};
  if(error instanceof EasyMsaApiError&&extra[error.code])return extra[error.code][locale==="zh"?1:0];
  const known:Record<string,[string,string]>={BENCHMARK_EXPIRED:["This evaluation has expired.","这项评测已过期。"],BENCHMARK_EMAIL_UNAVAILABLE:["Email is unavailable. Clear the email field and try again.","邮件通知暂不可用，请清空邮箱后重试。"],BENCHMARK_UNAVAILABLE:["New evaluations are currently paused.","新评测暂未开放。"],BENCHMARK_PAUSED:["New evaluations are paused.","新评测已暂停。"],REPOSITORY_NOT_FOUND:["This public repository or revision could not be found.","找不到该公开仓库或版本。"],PUBLIC_REPOSITORY_REQUIRED:["Choose a public GitHub repository.","请选择公开的 GitHub 仓库。"],INVALID_REVISION:["The selected branch, tag or commit could not be found.","找不到所选分支、标签或提交。"],GITHUB_UNAVAILABLE:["GitHub is temporarily unavailable. Try again later.","暂时无法连接 GitHub，请稍后重试。"],GITHUB_RATE_LIMIT:["GitHub is busy. Try again later.","GitHub 请求较多，请稍后重试。"],BENCHMARK_RESULTS_PENDING:["Results are not available yet.","成绩尚未生成。"],BENCHMARK_RESULTS_UNAVAILABLE:["Results could not be loaded. Try again.","暂时无法读取成绩，请重试。"],IDEMPOTENCY_CONFLICT:["The submission has changed. Submit it again.","提交内容已变化，请重新提交。"],INVALID_REPOSITORY:["Enter a public GitHub repository URL.","请输入公开的 GitHub 仓库链接。"],CSRF_INVALID:["Please retry your submission.","请重新提交。"],CSRF_REJECTED:["Please retry your submission.","请重新提交。"]};
  if(error instanceof EasyMsaApiError){const specific=known[error.code.toUpperCase()];if(specific)return specific[locale==="zh"?1:0];if([401,403,404].includes(error.status??0))return locale==="zh"?"无法访问这项评测，请检查结果链接或恢复文件。":"This evaluation is unavailable. Check its result link or recovery file.";if(error.status===429)return locale==="zh"?"请求过于频繁，请稍后重试。":"Too many requests. Try again shortly.";const message=known[error.code.toUpperCase()];if(message)return message[locale==="zh"?1:0];}return locale==="zh"?"无法完成请求，请重试。":"Could not complete the request. Try again.";
}
