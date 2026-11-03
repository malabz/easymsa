import type {MetricKey} from "./model";
import {metricSpecs} from "./metrics";
import "./report.css";

type Props={locale:"en"|"zh";quality:MetricKey;reference:boolean;params:URLSearchParams;patch:(values:Record<string,string>)=>void};
/** Shared controls for two simultaneous plots; the table always keeps every metric. */
export function BenchmarkReadingControls({locale,quality,reference,params,patch}:Props){
  const w=(en:string,zh:string)=>locale==="zh"?zh:en;
  return <div className="benchmark-report-controls">
    <label>{w("Chart quality","图表质量指标")}<select aria-label={w("Vertical axis","纵轴指标")} value={quality} onChange={event=>patch({y:event.target.value})}>{(["q","tc","scaled_sp"] as MetricKey[]).map(key=><option key={key} value={key} disabled={!reference&&key!=="scaled_sp"}>{metricSpecs[key][locale]}</option>)}</select></label>
    <label>{w("Resource axes","资源坐标")}<select aria-label={w("Horizontal scale","横轴坐标")} value={params.get("scale")==="linear"?"linear":"log"} onChange={event=>patch({scale:event.target.value})}><option value="log">{w("Log","对数")}</option><option value="linear">{w("Linear","线性")}</option></select></label>
    {(quality==="q"||quality==="tc")&&<label className="benchmark-report-zoom"><input type="checkbox" aria-label={w("Zoom Q / TC differences","放大 Q / TC 差异")} checked={params.get("zoom")==="1"} onChange={event=>patch({zoom:event.target.checked?"1":""})}/>{w("Zoom quality differences","放大质量差异")}</label>}
  </div>;
}
