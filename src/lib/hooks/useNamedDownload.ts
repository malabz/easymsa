import {useEffect, useRef, useState} from 'react';
/** Download names are assigned locally; authenticated URLs never enter filenames or logs. */
export function useNamedDownload(scope: unknown) {
  const request=useRef<AbortController|null>(null);
  const [busy,setBusy]=useState<string|null>(null),[failed,setFailed]=useState<string|null>(null);
  useEffect(()=>{setBusy(null);setFailed(null);return()=>request.current?.abort();},[scope]);
  async function download(file:{href:string;name:string}) {
    request.current?.abort();const controller=new AbortController();request.current=controller;
    setBusy(file.name);setFailed(null);
    try {
      const response=await fetch(file.href,{signal:controller.signal});
      if(!response.ok)throw new Error('Download failed');
      const blob=await response.blob();if(controller.signal.aborted)return;
      const url=URL.createObjectURL(blob), anchor=document.createElement('a');
      anchor.href=url;anchor.download=file.name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    } catch {if(!controller.signal.aborted)setFailed(file.name);}
    finally {if(request.current===controller)setBusy(null);}
  }
  return {busy,failed,download,cancel:()=>request.current?.abort()};
}
