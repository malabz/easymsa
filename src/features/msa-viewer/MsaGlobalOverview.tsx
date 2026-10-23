import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useLanguage } from '../../lib/i18n/useLanguage';
import { positionAt, visibleIndexOfPosition } from './columnStatsStore';
import type { MinimapInput } from './minimapData';
import { useMinimapImages } from './useMinimapImages';
import { parseViewerPosition } from './viewerWorkflowModel';

export function MsaGlobalOverview({input, scrollRef, pitch, rowHeight, headerHeight, labelWidth, alignmentLength, onRevealColumn}: {
  input:MinimapInput; scrollRef:RefObject<HTMLDivElement>; pitch:number; rowHeight:number; headerHeight:number; labelWidth:number; alignmentLength?:number; onRevealColumn?:(position:number)=>void;
}) {
  const {locale} = useLanguage(); const zh=locale==='zh';
  const canvas=useRef<HTMLCanvasElement>(null); const area=useRef<HTMLDivElement>(null);
  const {images, failed: failure, retry} = useMinimapImages(input);
  const image = images?.vertical ?? null;
  const [error, setError] = useState<string | null>(null);
  const [hiddenColumn, setHiddenColumn] = useState<number | null>(null);
  const [view,setView]=useState({left:0,top:0,width:1,height:1,row:1,col:1});
  const [target,setTarget]=useState({row:'',col:''});
  const size=useMemo(()=>({width:Math.max(1,input.positions.length*pitch),height:Math.max(1,input.rows.length*rowHeight)}),[input.positions.length,input.rows.length,pitch,rowHeight]);
  useEffect(()=>{if(!image||!canvas.current)return;const ctx=canvas.current.getContext('2d');if(!ctx)return;const data=ctx.createImageData(image.width,image.height);data.data.set(image.pixels);ctx.putImageData(data,0,0);},[image]);
  useEffect(()=>{
    const el=scrollRef.current;if(!el)return;let frame=0;
    const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>setView({
      left:el.scrollLeft/size.width,top:el.scrollTop/size.height,
      width:Math.min(1,Math.max(1,el.clientWidth-labelWidth-24)/size.width),
      height:Math.min(1,Math.max(1,el.clientHeight-headerHeight)/size.height),
      row:Math.min(input.rows.length,Math.floor(el.scrollTop/rowHeight)+1),
      col:positionAt(input.positions,Math.floor(el.scrollLeft/pitch))??1
    }));};
    update();el.addEventListener('scroll',update,{passive:true});const observer=new ResizeObserver(update);observer.observe(el);
    return()=>{el.removeEventListener('scroll',update);observer.disconnect();cancelAnimationFrame(frame);};
  },[scrollRef,size,labelWidth,headerHeight,rowHeight,pitch,input]);
  const locate=(x:number,y:number)=>{const el=scrollRef.current;if(!el)return;el.scrollLeft=x*size.width-(el.clientWidth-labelWidth-24)/2;el.scrollTop=y*size.height-(el.clientHeight-headerHeight)/2;};
  const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
  const maximumColumn = useMemo(() => alignmentLength ?? input.rows.reduce((max, row) => Math.max(max, row.sequence.length), 1), [alignmentLength, input.rows]);
  const jump=()=>{
    const el=scrollRef.current;if(!el)return;
    setError(null); setHiddenColumn(null);
    const row = target.row.trim() ? parseViewerPosition(target.row,input.rows.length) : null;
    const column = target.col.trim() ? parseViewerPosition(target.col,maximumColumn) : null;
    if (target.row.trim() && row === null) { setError(zh ? `请输入 1–${input.rows.length} 的整数行号。` : `Enter an integer row from 1 to ${input.rows.length}.`); return; }
    if (target.col.trim() && column === null) { setError(zh ? `请输入 1–${maximumColumn} 的整数列号。` : `Enter an integer column from 1 to ${maximumColumn}.`); return; }
    const col = column === null ? -1 : visibleIndexOfPosition(input.positions,column);
    if (column !== null && col < 0) { setError(zh ? '该位置已被筛选隐藏。' : 'This position is hidden by the column filter.'); setHiddenColumn(column); return; }
    if(row !== null) el.scrollTop=(row-1)*rowHeight;
    if(col >= 0) el.scrollLeft=col*pitch;
  };
  return <aside className="msa-global-overview" aria-label={zh?'全局缩略图':'Global overview'}>
    <span className="msa-map-title">{zh?'全局':'Overview'}</span>
    <div ref={area} className="msa-map-area" tabIndex={0} role="group" aria-label={zh?'缩略图定位，方向键平移':'Overview navigation, arrow keys to pan'}
      onKeyDown={e=>{const el=scrollRef.current;if(!el)return; if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();if(e.key==='Home'){el.scrollTop=0;el.scrollLeft=0;}else if(e.key==='End'){el.scrollTop=el.scrollHeight;el.scrollLeft=el.scrollWidth;}else if(e.key==='ArrowLeft')el.scrollLeft-=pitch*10;else if(e.key==='ArrowRight')el.scrollLeft+=pitch*10;else el.scrollTop+=(e.key==='ArrowUp'?-1:1)*rowHeight*5;}}}
      onPointerDown={e=>{const rect=e.currentTarget.getBoundingClientRect();const x=(e.clientX-rect.left)/rect.width,y=(e.clientY-rect.top)/rect.height;
        if(x>=view.left&&x<=view.left+view.width&&y>=view.top&&y<=view.top+view.height)drag.current={x:e.clientX,y:e.clientY,left:scrollRef.current?.scrollLeft??0,top:scrollRef.current?.scrollTop??0};
        else {locate(x,y);drag.current={x:e.clientX,y:e.clientY,left:scrollRef.current?.scrollLeft??0,top:scrollRef.current?.scrollTop??0};}
        e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerMove={e=>{if(!drag.current||!scrollRef.current)return;const rect=e.currentTarget.getBoundingClientRect();scrollRef.current.scrollLeft=drag.current.left+(e.clientX-drag.current.x)/rect.width*size.width;scrollRef.current.scrollTop=drag.current.top+(e.clientY-drag.current.y)/rect.height*size.height;}}
      onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
      {image ? <canvas ref={canvas} width={image.width} height={image.height} aria-hidden="true"/> : <span className="msa-map-loading">{failure ? (zh?'暂不可用':'Unavailable') : '…'}</span>}
      <div className="msa-map-viewport" style={{left:`${Math.min(1-view.width,view.left)*100}%`,top:`${Math.min(1-view.height,view.top)*100}%`,width:`${view.width*100}%`,height:`${view.height*100}%`}}/>
    </div>
    {failure&&<button onClick={retry} type="button">{zh?'重试':'Retry'}</button>}
    <form noValidate className="msa-map-jump" onSubmit={e=>{e.preventDefault();jump();}}>
      <label>{zh?'行':'Row'}<input aria-label={zh?'定位到行':'Go to row'} min={1} max={input.rows.length} type="number" placeholder={String(view.row)} value={target.row} onChange={e=>setTarget({...target,row:e.target.value})}/></label>
      <label>{zh?'列':'Col'}<input aria-label={zh?'定位到列':'Go to column'} min={1} type="number" placeholder={String(view.col)} value={target.col} onChange={e=>setTarget({...target,col:e.target.value})}/></label>
      <button type="submit">{zh?'定位':'Go'}</button>
    </form>
    {error && <p role="alert" className="break-words text-xs">{error}{hiddenColumn !== null && onRevealColumn && <button type="button" onClick={() => {onRevealColumn(hiddenColumn); setError(null); setHiddenColumn(null);}}>{zh ? "显示并定位" : "Show and locate"}</button>}</p>}
  </aside>;
}
