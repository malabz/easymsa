import {readFileSync} from "node:fs";
import {afterEach,expect,it,vi} from "vitest";
import {privateFeatureSchema,privateRunSchema} from "./privateModel";
import {privateApi} from "./privateApi";

const contract=JSON.parse(readFileSync("contracts/benchmark-feedback-v2.json","utf8"));
afterEach(()=>vi.unstubAllGlobals());

it("reads the backend's captured v1 and negotiated v2 private payloads without dropping fields",()=>{
  for(const name of ["status_v1","status_v2"])expect(privateFeatureSchema.parse(contract.cases[name])).toEqual(contract.cases[name]);
  for(const name of ["queued_v2","failed_v1","failed_v2"])expect(privateRunSchema.parse(contract.cases[name])).toEqual(contract.cases[name]);
  expect(contract.cases.queued_v2.mode).toBe("quick");expect(contract.cases.queued_v2.total_units).toBe(2);
  expect(contract.cases.failed_v1.error).toEqual({code:"BENCHMARK_BUILD_FAILED",message:"Build failed."});
  expect(contract.cases.failed_v2.error).toMatchObject({stage:"building",retryable:false,error_id:"f".repeat(32)});
});

it("negotiates version 2 for status, static precheck and per-run access",async()=>{
  const fetcher=vi.fn((url:string)=>Promise.resolve(new Response(JSON.stringify(url.endsWith("/status")?contract.cases.status_v2:url.endsWith("/precheck")?contract.cases.precheck:contract.cases.queued_v2),{status:200})));
  vi.stubGlobal("fetch",fetcher);
  expect(await privateApi.status()).toEqual(contract.cases.status_v2);
  expect(await privateApi.precheck({repository_url:"https://github.com/lab/align",revision:"main"},"csrf")).toEqual(contract.cases.precheck);
  expect(await privateApi.run("f".repeat(32),"test-access-key")).toEqual(contract.cases.queued_v2);
  for(const [,options] of fetcher.mock.calls as unknown as [string,RequestInit][])expect(options.headers).toMatchObject(contract.negotiation_header);
});
