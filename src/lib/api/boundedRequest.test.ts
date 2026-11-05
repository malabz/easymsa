import {afterEach,describe,expect,it,vi} from "vitest";
import {boundedRequest} from "./boundedRequest";

afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe("bounded response loading",()=>{
  it.each([20_000,60_000])("ends a hung request at %i ms",async timeout=>{
    vi.useFakeTimers();vi.stubGlobal("fetch",vi.fn(()=>new Promise(()=>{})));
    const loading=boundedRequest("/fixture",{},response=>response.json(),timeout);
    const assertion=expect(loading).rejects.toMatchObject({code:"LOAD_TIMEOUT"});
    await vi.advanceTimersByTimeAsync(timeout);await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("keeps the timeout active while a response body is stuck",async()=>{
    vi.useFakeTimers();vi.stubGlobal("fetch",vi.fn(async()=>new Response("{}")));
    const loading=boundedRequest("/fixture",{},()=>new Promise(()=>{}),60_000);
    const assertion=expect(loading).rejects.toMatchObject({code:"LOAD_TIMEOUT"});
    await vi.advanceTimersByTimeAsync(60_000);await assertion;
  });
  it("distinguishes network, incompatible data and expired credentials",async()=>{
    const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
    fetcher.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(boundedRequest("/fixture",{},response=>response.json())).rejects.toMatchObject({code:"NETWORK_FAILURE"});
    fetcher.mockResolvedValueOnce(new Response("not JSON"));
    await expect(boundedRequest("/fixture",{},response=>response.json())).rejects.toMatchObject({code:"INCOMPATIBLE_RESULT"});
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({error:{code:"BENCHMARK_EXPIRED",message:"Expired"}}),{status:410}));
    await expect(boundedRequest("/fixture",{},response=>response.json())).rejects.toMatchObject({code:"BENCHMARK_EXPIRED",status:410});
  });
  it("cancels an old request and preserves the caller's cancellation",async()=>{
    vi.useFakeTimers();
    vi.stubGlobal("fetch",vi.fn((_url,options:RequestInit)=>new Promise((_resolve,reject)=>options.signal?.addEventListener("abort",()=>reject(new DOMException("Cancelled","AbortError"))))));
    const controller=new AbortController();
    const loading=boundedRequest("/fixture",{signal:controller.signal},response=>response.json());
    const assertion=expect(loading).rejects.toMatchObject({name:"AbortError"});
    controller.abort();await assertion;expect(vi.getTimerCount()).toBe(0);
  });
});
