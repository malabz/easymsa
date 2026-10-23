import {act,renderHook,waitFor} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {useNamedDownload} from './useNamedDownload';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('named downloads',()=>{
 it('uses the stage filename and never the credential-bearing URL as a name',async()=>{
  const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(this:HTMLAnchorElement){expect(this.download).toBe('sample-initial.fasta.gz');expect(this.href).toBe('blob:http://localhost/download');});
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,blob:async()=>new Blob(['ACGT'])}));
  vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:vi.fn(()=> 'blob:http://localhost/download'),revokeObjectURL:vi.fn()}));
  const {result}=renderHook(()=>useNamedDownload('initial'));
  await act(()=>result.current.download({href:'/api/result?token=test-only',name:'sample-initial.fasta.gz'}));
  expect(click).toHaveBeenCalledOnce();expect(result.current.busy).toBe(null);expect(result.current.failed).toBe(null);
 });
 it('aborts a pending download when its result stage changes',async()=>{
  let signal:AbortSignal|undefined;
  vi.stubGlobal('fetch',vi.fn((_url,options)=>{signal=options.signal;return new Promise((_resolve,reject)=>signal?.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError'))));}));
  const {result,rerender}=renderHook(({stage})=>useNamedDownload(stage),{initialProps:{stage:'initial'}});
  let pending:Promise<void>;
  act(()=>{pending=result.current.download({href:'/initial',name:'initial.gz'});});
  rerender({stage:'refined'});
  await act(()=>pending!);
  await waitFor(()=>expect(signal?.aborted).toBe(true));
  expect(result.current.failed).toBe(null);expect(result.current.busy).toBe(null);
 });
 it('reports failures and can retry',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false}));
  const {result}=renderHook(()=>useNamedDownload('same'));
  await act(()=>result.current.download({href:'/result',name:'result.zip'}));
  expect(result.current.failed).toBe('result.zip');expect(result.current.busy).toBe(null);
 });
});
