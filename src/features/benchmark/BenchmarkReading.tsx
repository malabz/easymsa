import type {MetricKey} from "./model";
import {metricSpecs} from "./metrics";
import "./report.css";

type Props={locale:"en"|"zh";quality:MetricKey;reference:boolean;params:URLSearchParams;patch:(values:Record<string,string>)=>void;crowded?:[string,string]|null};
/** Shared controls for two simultaneous plots; the table always keeps every metric. */
export function BenchmarkReadingControls({locale,quality,reference,params,patch,crowded}:Props){
  const w=(en:string,zh:string)=>locale==="zh"?zh:en;
  const zoomed=params.get("zoom")==="1";
  // The full 0–1 range stays the default; a narrow spread only suggests zooming.
  const suggest=Boolean(crowded)&&!zoomed&&(quality==="q"||quality==="tc");
  return <div className="benchmark-report-controls">
    <label>{w("Chart quality","图表质量指标")}<select aria-label={w("Vertical axis","纵轴指标")} value={quality} onChange={event=>patch({y:event.target.value})}>{(["q","tc","scaled_sp"] as MetricKey[]).map(key=><option key={key} value={key} disabled={!reference&&key!=="scaled_sp"}>{metricSpecs[key][locale]}</option>)}</select></label>
    <label>{w("Resource axes","资源坐标")}<select aria-label={w("Horizontal scale","横轴坐标")} value={params.get("scale")==="linear"?"linear":"log"} onChange={event=>patch({scale:event.target.value})}><option value="log">{w("Log","对数")}</option><option value="linear">{w("Linear","线性")}</option></select></label>
    {(quality==="q"||quality==="tc")&&<label className={"benchmark-report-zoom"+(suggest?" is-suggested":"")}><input type="checkbox" aria-label={w("Zoom Q / TC differences","放大 Q / TC 差异")} checked={zoomed} onChange={event=>patch({zoom:event.target.checked?"1":""})}/>{w("Zoom quality differences","放大质量差异")}</label>}
    {suggest&&crowded&&<p className="benchmark-report-zoom-hint">{w(`All methods score ${crowded[0]}–${crowded[1]}; zoom to tell them apart`,`各方法都在 ${crowded[0]}–${crowded[1]} 之间，放大后更易区分`)}</p>}
  </div>;
}
