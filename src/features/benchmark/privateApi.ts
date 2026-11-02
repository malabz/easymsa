import { z } from "zod";
import { apiUrl, EasyMsaApiError, parseApiError } from "../../lib/api/client";
import { privateFeatureSchema,privateResultSchema,privateRunSchema } from "./privateModel";
async function response(path:string,options:RequestInit={}) {
  const result=await fetch(apiUrl(path),{...options,credentials:"include",headers:{Accept:"application/json",...options.headers}});
  if(!result.ok)throw await parseApiError(result,"Could not complete the request.");return result;
}
async function json<S extends z.ZodTypeAny>(path:string,schema:S,options?:RequestInit):Promise<z.output<S>> {return schema.parse(await(await response(path,options)).json());}
const credential=(key:string)=>({Authorization:`Bearer ${key}`});
export type SubmissionBody={repository_url:string;revision?:string;method_name?:string;supported_types?:("dna"|"rna")[];email?:string;language?:"en"|"zh"};
export const privateApi={
  status:(signal?:AbortSignal)=>json("benchmark/status",privateFeatureSchema,{signal}),
  client:()=>json("benchmark/client",z.object({csrf_token:z.string().min(1)}).strict(),{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}),
  submit:(body:SubmissionBody,csrf:string,key:string)=>json("benchmark/submissions",z.object({run:privateRunSchema,access_key:z.string().min(32)}).strict(),{method:"POST",headers:{"Content-Type":"application/json","X-CSRF-Token":csrf,"Idempotency-Key":key},body:JSON.stringify(body)}),
  run:(id:string,key:string,signal?:AbortSignal)=>json(`benchmark/runs/${encodeURIComponent(id)}`,privateRunSchema,{headers:credential(key),signal}),
  cancel:(id:string,key:string)=>json(`benchmark/runs/${encodeURIComponent(id)}/cancel`,privateRunSchema,{method:"POST",headers:{...credential(key),"Content-Type":"application/json"},body:"{}"}),
  results:(id:string,key:string,signal?:AbortSignal)=>json(`benchmark/runs/${encodeURIComponent(id)}/results?format=json`,privateResultSchema,{headers:credential(key),signal}),
  logs:async(id:string,key:string)=>(await response(`benchmark/runs/${encodeURIComponent(id)}/logs`,{headers:credential(key)})).text(),
  download:async(id:string,key:string,format:"json"|"csv")=>{const result=await response(`benchmark/runs/${encodeURIComponent(id)}/results?format=${format}`,{headers:credential(key)});const blob=await result.blob(),url=URL.createObjectURL(blob),anchor=document.createElement("a");anchor.href=url;anchor.download=`benchmark-${id}.${format}`;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
};
export const isUnauthorized=(error:unknown)=>error instanceof EasyMsaApiError&&[401,403,404].includes(error.status??0);
export function privateError(error:unknown,locale:"en"|"zh") {
  const known:Record<string,[string,string]>={BENCHMARK_EXPIRED:["This evaluation has expired.","这项评测已过期。"],BENCHMARK_EMAIL_UNAVAILABLE:["Email is unavailable. Clear the email field and try again.","邮件通知暂不可用，请清空邮箱后重试。"],BENCHMARK_QUOTA:["Your evaluation limit has been reached. Try again later.","已达到评测额度，请稍后再试。"],BENCHMARK_UNAVAILABLE:["New evaluations are currently paused.","新评测暂未开放。"],BENCHMARK_PAUSED:["New evaluations are paused.","新评测已暂停。"],REPOSITORY_NOT_FOUND:["This public repository or revision could not be found.","找不到该公开仓库或版本。"],PUBLIC_REPOSITORY_REQUIRED:["Choose a public GitHub repository.","请选择公开的 GitHub 仓库。"],INVALID_REVISION:["The selected branch, tag or commit could not be found.","找不到所选分支、标签或提交。"],GITHUB_UNAVAILABLE:["GitHub is temporarily unavailable. Try again later.","暂时无法连接 GitHub，请稍后重试。"],GITHUB_RATE_LIMIT:["GitHub is busy. Try again later.","GitHub 请求较多，请稍后重试。"],BENCHMARK_RESULTS_PENDING:["Results are not available yet.","成绩尚未生成。"],BENCHMARK_RESULTS_UNAVAILABLE:["Results could not be loaded. Try again.","暂时无法读取成绩，请重试。"],IDEMPOTENCY_CONFLICT:["The submission has changed. Submit it again.","提交内容已变化，请重新提交。"],INVALID_REPOSITORY:["Enter a public GitHub repository URL.","请输入公开的 GitHub 仓库链接。"],CSRF_INVALID:["Please retry your submission.","请重新提交。"],CSRF_REJECTED:["Please retry your submission.","请重新提交。"]};
  if(error instanceof EasyMsaApiError){const specific=known[error.code.toUpperCase()];if(specific)return specific[locale==="zh"?1:0];if([401,403,404].includes(error.status??0))return locale==="zh"?"无法访问这项评测，请检查结果链接或恢复文件。":"This evaluation is unavailable. Check its result link or recovery file.";if(error.status===429)return locale==="zh"?"已达到请求额度，请稍后再试。":"The request limit has been reached. Try again later.";const message=known[error.code.toUpperCase()];if(message)return message[locale==="zh"?1:0];}return locale==="zh"?"无法完成请求，请重试。":"Could not complete the request. Try again.";
}
