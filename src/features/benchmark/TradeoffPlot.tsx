import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpLeft } from "lucide-react";
import type { BenchmarkBatch, BenchmarkDataset, BenchmarkMetric, BenchmarkSnapshot, MetricKey } from "./model";
import { displayMetricKey, formatAxisTicks, scoreAxisLabels, formatMetricSummary, makeMetricAxis, metricSpecs, metricEmphasis, selectMetricRows, type MetricAxis } from "./metrics";
import { type ResultScope } from "./selection";
import { ComparisonLegend, reasonLabel, stateLabel, words, type Locale } from "./presentation";
import "./tradeoff.css";

type Props = {
  snapshot: BenchmarkSnapshot; batch?: BenchmarkBatch; scope: ResultScope; dataset: BenchmarkDataset; locale: Locale;
  params: URLSearchParams; onParamsChange: (patch: Record<string, string>) => void;
};
const qualityKeys: MetricKey[] = ["q", "tc", "scaled_sp"];
const bounded = (n: number) => Math.min(100, Math.max(0, n));
type Label = { id: string; x: number; y: number; width: number };
export const tradeoffPlotHeight = (count:number, fontSize:number) => Math.max(420, Math.ceil(count * (fontSize * 1.5 + 16) + 24));
export const tradeoffYAxisGutter = (labels:string[],fontSize:number) => Math.max(62,Math.ceil(Math.max(0,...labels.map(label => label.length * fontSize * .62))) + 14);

/** Keep the true domain; choose labels using their actual positions, not a count budget. */
export function selectTradeoffXTicks(axis:MetricAxis, key:MetricKey, locale:Locale, width:number, fontSize:number): number[] {
  let candidates = axis.ticks;
  if (axis.scale === "log") {
    const decades:number[] = [];
    for (let exponent = Math.ceil(Math.log10(axis.min)); exponent <= Math.floor(Math.log10(axis.max)); exponent++) {
      const value = 10 ** exponent;
      if (value > axis.min && value < axis.max) decades.push(value);
    }
    candidates = [axis.min,...decades,axis.max];
  }
  if (candidates.length <= 2) return candidates;
  const labels = formatAxisTicks(candidates,key,locale);
  const boxes = candidates.map((tick,index) => {
    const labelWidth = labels[index].length * fontSize * .62;
    const position = bounded(axis.position(key === "max_rss_kib" ? tick * 1024 : tick)) / 100 * width;
    const left = index === 0 ? position : index === candidates.length - 1 ? position - labelWidth : position - labelWidth / 2;
    return {tick,left,right:left + labelWidth};
  });
  const selected = [boxes[0],boxes[boxes.length - 1]];
  for (const candidate of boxes.slice(1,-1)) {
    if (!selected.some(other => candidate.left < other.right + 10 && candidate.right + 10 > other.left)) selected.push(candidate);
  }
  return selected.sort((a,b) => a.tick - b.tick).map(box => box.tick);
}

/** Move labels only. Actual measurements and point coordinates never move. */
export function placeTradeoffLabels(points: {id:string; name:string; x:number; y:number}[], width:number, fontSize = 12, plotHeight = 350): Label[] {
  const placed: Label[] = [];
  const height = fontSize * 1.5;
  for (const point of points) {
    const labelWidth = Math.min(point.name.length * fontSize * .59 + 8, width);
    const desiredX = point.x + 13 + labelWidth <= width ? point.x + 13 : point.x - labelWidth - 13;
    let label: Label = {id:point.id, x:0, y:2, width:labelWidth}, bestCost = Infinity;
    // Search the whole vertical space, rather than stepping by a label height:
    // near-identical measurements otherwise create incompatible unused gaps.
    const candidatesY = Array.from({length:Math.max(1,Math.floor((plotHeight - height - 2) / 2) + 1)},(_,index) => 2 + index * 2)
      .sort((a,b) => Math.abs(a - (point.y - height)) - Math.abs(b - (point.y - height)) || a - b);
    for (const y of candidatesY) {
      for (const candidateX of [desiredX, point.x - labelWidth - 13, point.x + 13, 0, width - labelWidth]) {
        const x = Math.max(0, Math.min(width - labelWidth, candidateX));
        const labelsOverlapped = placed.filter(other => x < other.x + other.width + 4 && x + labelWidth + 4 > other.x && y < other.y + height + 2 && y + height + 2 > other.y).length;
        const pointsCovered = points.filter(other => x < other.x + 8 && x + labelWidth > other.x - 8 && y < other.y + 8 && y + height > other.y - 8).length;
        const cost = labelsOverlapped * 10 + pointsCovered;
        if (cost < bestCost) { label = {id:point.id, x, y, width:labelWidth}; bestCost = cost; }
        if (cost === 0) break;
      }
      if (bestCost === 0) break;
    }
    placed.push(label);
  }
  const intersects = (a:Label,b:Label) => a.x < b.x + b.width + 4 && a.x + a.width + 4 > b.x && a.y < b.y + height + 2 && a.y + height + 2 > b.y;
  if (placed.some((label,index) => placed.slice(0,index).some(other => intersects(label,other)))) {
    // If dense measurements exhaust greedy placement, allocate distinct label
    // rows in vertical measurement order. This never jitters the actual points.
    const rowHeight = (plotHeight - 4) / points.length;
    const rows = [...points].sort((a,b) => a.y - b.y || a.id.localeCompare(b.id)).map((point,index) => {
      const original = placed.find(label => label.id === point.id)!;
      return {...original,y:2 + index * rowHeight + Math.max(0,(rowHeight - height) / 2)};
    });
    return points.map(point => rows.find(label => label.id === point.id)!);
  }
  return placed;
}

function interval(metric?: BenchmarkMetric): [number, number] | null {
  if (!metric || metric.valid_count < 2 || metric.mean === null) return null;
  if (metric.display === "mean_sd" && metric.sd !== null) return [metric.mean - metric.sd, metric.mean + metric.sd];
  if (metric.display === "mean_range" && metric.min !== null && metric.max !== null) return [metric.min, metric.max];
  return null;
}

export function TradeoffPlot({ snapshot, batch, scope, dataset, locale, params, onParamsChange }: Props) {
  const xKey: MetricKey = params.get("x") === "max_rss_kib" ? "max_rss_kib" : "wall_seconds";
  const requestedY = displayMetricKey(params.get("y") as MetricKey);
  const hasQ = dataset.reference && selectMetricRows(snapshot,batch,dataset.id,"q",scope).some(row => row.raw !== null);
  const yKey: MetricKey = qualityKeys.includes(requestedY) && (dataset.reference || !["q", "tc"].includes(requestedY)) ? requestedY : hasQ ? "q" : "scaled_sp";
  const isQuality = yKey === "q" || yKey === "tc";
  const xRows = selectMetricRows(snapshot, batch, dataset.id, xKey, scope);
  const yRows = selectMetricRows(snapshot, batch, dataset.id, yKey, scope);
  const rows = xRows.map((x, index) => ({...x, x:x.raw, y:yRows[index].raw, yMetric:yRows[index].metric}));
  const xEmphasis = metricEmphasis(xKey,rows.map(row => row.metric));
  const yEmphasis = metricEmphasis(yKey,rows.map(row => row.yMetric));
  const valid = rows.filter(row => row.x !== null && row.y !== null);
  const xAxis = makeMetricAxis(xKey, valid.map(row => row.metric), {linear:params.get("scale") === "linear"});
  const yAxis = makeMetricAxis(yKey, valid.map(row => row.yMetric), {zoom:isQuality && params.get("zoom") === "1"});
  const [width, setWidth] = useState(560);
  const [labelFontSize, setLabelFontSize] = useState(12);
  const plotHeight = tradeoffPlotHeight(valid.length,labelFontSize);
  const xTicks = selectTradeoffXTicks(xAxis,xKey,locale,width,labelFontSize);
  const yTicks = yAxis.ticks.length > 5 ? [yAxis.ticks[0], yAxis.ticks[Math.floor(yAxis.ticks.length / 2)], yAxis.ticks[yAxis.ticks.length - 1]] : yAxis.ticks;
  const xLabels = formatAxisTicks(xTicks, xKey, locale);
  const yPresentation = scoreAxisLabels(yTicks,yKey,locale), yLabels = yPresentation.labels;
  const yGutter = tradeoffYAxisGutter(yLabels,labelFontSize);
  const plane = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(params.get("method") ?? "");
  const [showDetails, setShowDetails] = useState(false);
  const interaction = useRef<"focus" | "pointer">("pointer");
  useLayoutEffect(() => {
    const element = plane.current;
    if (!element) return;
    const measure = () => {
      if (element.clientWidth > 0) setWidth(element.clientWidth);
      setLabelFontSize(parseFloat(getComputedStyle(element).fontSize) || 12);
    };
    // A newly mounted chart may already have enlarged text. Measure before its
    // first paint instead of briefly placing 26px text using 12px label boxes.
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element); observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, [yGutter]);
  useEffect(() => { setActive(params.get("method") ?? ""); }, [params.get("method")]);
  useEffect(() => { setShowDetails(false); }, [dataset.id, batch?.id, scope.mode, xKey, yKey]);
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") setShowDetails(false); };
    window.addEventListener("keydown", dismiss); return () => window.removeEventListener("keydown", dismiss);
  }, []);
  const locations = valid.map(row => ({id:row.method.id, name:row.method.name, x:bounded(xAxis.position(row.x!)) / 100 * width, y:(100 - bounded(yAxis.position(row.y!))) / 100 * plotHeight}));
  const labels = placeTradeoffLabels(locations, width, labelFontSize,plotHeight);
  const focused = rows.find(row => row.method.id === active);
  const choose = (id:string) => { setActive(id); setShowDetails(true); };
  const status = (row:typeof rows[number]) => row.outsideBatch ? stateLabel("outside_batch", locale) : row.result?.reason_code ? reasonLabel(row.result.reason_code, locale) : row.x === null || row.y === null ? [row.metric, row.yMetric].flatMap(metric => metric?.reason_codes ?? []).map(reason => reasonLabel(reason, locale)).join(" · ") || stateLabel("unavailable", locale) : stateLabel(row.result?.status ?? "not_run", locale);
  const axes = `${metricSpecs[xKey][locale]} (${metricSpecs[xKey].unit}) / ${metricSpecs[yKey][locale]}`;
  const rangeLabel = isQuality ? params.get("zoom") === "1" ? `${words(locale,"Zoomed range","局部范围")} ${formatAxisTicks([yAxis.min,yAxis.max],yKey,locale).join("–")}` : "0–1" : words(locale,"Dataset range · linear","本数据集范围 · 线性");
  return <section className="tradeoff" aria-label={words(locale, "Resource and quality comparison", "资源与质量比较")}>
    <div className="tradeoff-responsive">
    <div className="tradeoff-layout">
      <div className="tradeoff-chart-column">
      <figure className="tradeoff-figure" data-testid="tradeoff-chart" data-x-key={xKey} data-y-key={yKey} data-x-min={xAxis.min} data-x-max={xAxis.max} data-x-scale={xAxis.scale} data-y-min={yAxis.min} data-y-max={yAxis.max} data-y-scale={yAxis.scale} data-y-divisor={yPresentation.divisor} aria-label={axes}>
        <figcaption><span className="tradeoff-axis-summary">{metricSpecs[yKey][locale]}{yPresentation.unit && <span className="benchmark-score-unit"> ({yPresentation.unit})</span>} ↑ <span>{rangeLabel}</span></span>{isQuality && <label className="tradeoff-zoom"><input type="checkbox" aria-label={words(locale,"Zoom Q / TC differences","放大 Q / TC 差异")} checked={params.get("zoom") === "1"} onChange={e => onParamsChange({zoom:e.target.checked ? "1" : ""})} /><span>{words(locale,"Zoom differences","放大差异")}</span></label>}</figcaption>
        {valid.length > 0 && <p className="tradeoff-direction" data-testid="tradeoff-direction"><ArrowUpLeft size={20} aria-hidden="true"/><strong>{words(locale,"Upper left is better","左上更优")}</strong><span>· {words(locale,xKey === "max_rss_kib" ? "Less memory" : "Faster",xKey === "max_rss_kib" ? "更省内存" : "更快")} · {words(locale,`Higher ${metricSpecs[yKey].en}`,`${metricSpecs[yKey].zh} 更高`)}</span></p>}
        <div className="tradeoff-plot-area" style={{paddingLeft:yGutter}}>
          <div ref={plane} className="tradeoff-plane" style={{height:plotHeight}}>
            {valid.length > 0 && <svg className="tradeoff-grid" viewBox={`0 0 ${width} ${plotHeight}`} preserveAspectRatio="none" aria-hidden="true">
              {xTicks.map((tick,i) => { const x = bounded(xAxis.position(xKey === "max_rss_kib" ? tick * 1024 : tick)) / 100 * width; return <line key={`x${i}`} x1={x} y1="0" x2={x} y2={plotHeight} />; })}
              {yTicks.map((tick,i) => { const y = (100 - bounded(yAxis.position(tick))) / 100 * plotHeight; return <line key={`y${i}`} x1="0" y1={y} x2={width} y2={y} />; })}
              {locations.map((point,index) => <line key={point.id} className="tradeoff-leader" x1={point.x} y1={point.y} x2={Math.max(labels[index].x, Math.min(labels[index].x + labels[index].width, point.x))} y2={labels[index].y + labelFontSize * .75} />)}
            </svg>}
            {valid.map((row,index) => {
              const x = bounded(xAxis.position(row.x!)), y = bounded(yAxis.position(row.y!));
              const label = labels[index], xRange = interval(row.metric), yRange = interval(row.yMetric);
              return <div key={row.method.id} className={active === row.method.id ? "tradeoff-mark is-active" : "tradeoff-mark"}>
                {xRange && <span className="tradeoff-range x" data-testid="tradeoff-x-range" style={{left:`${bounded(xAxis.position(xRange[0]))}%`, width:`${bounded(xAxis.position(xRange[1])) - bounded(xAxis.position(xRange[0]))}%`, top:`${100-y}%`}} />}
                {yRange && <span className="tradeoff-range y" data-testid="tradeoff-y-range" style={{left:`${x}%`, top:`${100 - bounded(yAxis.position(yRange[1]))}%`, height:`${bounded(yAxis.position(yRange[1])) - bounded(yAxis.position(yRange[0]))}%`}} />}
                <button type="button" className="tradeoff-point" data-testid="tradeoff-point" data-method={row.method.id} data-batch-id={row.batch?.id} data-shape="circle" data-x-raw={row.x!} data-y-raw={row.y!} data-x-percent={x} data-y-percent={y} style={{left:`${x}%`, top:`${100-y}%`}}
                  aria-label={`${row.method.name}: ${formatMetricSummary(row.metric,xKey,locale)} ${metricSpecs[xKey].unit}; ${metricSpecs[yKey][locale]} ${formatMetricSummary(row.yMetric,yKey,locale)}; `} aria-describedby={showDetails && active === row.method.id ? "tradeoff-description" : undefined}
                  onMouseEnter={() => { if (interaction.current === "pointer") choose(row.method.id); }} onPointerMove={() => { interaction.current = "pointer"; choose(row.method.id); }} onFocus={() => { interaction.current = "focus"; choose(row.method.id); }} onClick={event => { interaction.current = event.detail === 0 ? "focus" : "pointer"; onParamsChange({method:row.method.id}); choose(row.method.id); }}><i className="tradeoff-marker circle" aria-hidden="true" /></button>
                <span className="tradeoff-direct-label" style={{left:label.x, top:label.y, maxWidth:label.width}}>{row.method.name}</span>
              </div>;
            })}
            {!valid.length && <p className="tradeoff-empty">{words(locale, "No results to plot", "暂无可绘制结果")}</p>}
            {valid.length > 0 && yTicks.map((tick,index) => <span className="tradeoff-y-tick" key={index} style={{bottom:`${bounded(yAxis.position(tick))}%`}}>{yLabels[index]}</span>)}
            {valid.length > 0 && xTicks.map((tick,index) => <span className={`tradeoff-x-tick ${index === 0 ? "first" : index === xTicks.length - 1 ? "last" : ""}`} key={index} style={{left:`${bounded(xAxis.position(xKey === "max_rss_kib" ? tick * 1024 : tick))}%`}}>{xLabels[index]}</span>)}
          </div>
        </div>
        <p className="tradeoff-x-title">{metricSpecs[xKey][locale]} ({metricSpecs[xKey].unit}) ↓ · {xAxis.scale === "log" ? words(locale,"Log scale","对数刻度") : words(locale,"Linear scale","线性刻度")}</p>
        {xAxis.zeroFallback && <p className="tradeoff-note">{words(locale, "Non-positive value or interval: linear axis used.", "数值或区间含非正值：已采用线性轴。")}</p>}
      </figure>
      <div className="tradeoff-controls">
        <label><span aria-hidden="true">{words(locale,"X axis","X 轴")}</span><select aria-label={words(locale,"Horizontal axis","横轴指标")} value={xKey} onChange={e => onParamsChange({x:e.target.value})}><option value="wall_seconds">{metricSpecs.wall_seconds[locale]} (s)</option><option value="max_rss_kib">{metricSpecs.max_rss_kib[locale]} (MiB)</option></select></label>
        <label><span aria-hidden="true">{words(locale,"Y axis","Y 轴")}</span><select aria-label={words(locale,"Vertical axis","纵轴指标")} value={yKey} onChange={e => onParamsChange({y:e.target.value})}>{qualityKeys.map(key => <option key={key} value={key} disabled={!dataset.reference && (key === "q" || key === "tc")}>{metricSpecs[key][locale]}{!dataset.reference && (key === "q" || key === "tc") ? words(locale," · no reference"," · 无参考") : ""}</option>)}</select></label>
        <label><span aria-hidden="true">{words(locale,"Scale","刻度")}</span><select aria-label={words(locale,"Horizontal scale","横轴坐标")} value={params.get("scale") === "linear" ? "linear" : "log"} onChange={e => onParamsChange({scale:e.target.value})}><option value="log">{words(locale,"Log","对数")}</option><option value="linear">{words(locale,"Linear","线性")}</option></select></label>
      </div>
      </div>
      <div className="tradeoff-methods" aria-label={words(locale, "Methods and result states", "方法与结果状态")}>
        <ComparisonLegend locale={locale}/>
        <div className="tradeoff-method-heading" aria-hidden="true"><span>{words(locale,"Method","方法")}</span><span>{metricSpecs[xKey][locale]} ({metricSpecs[xKey].unit})</span><span>{metricSpecs[yKey][locale]}</span></div>
        {rows.map((row,index) => <button key={row.method.id} type="button" data-testid="tradeoff-method" data-method={row.method.id} data-batch-id={row.batch?.id ?? ""} data-status={row.outsideBatch ? "outside_batch" : row.result?.status ?? "not_run"} className={(active === row.method.id ? "is-active " : "") + (row.x === null || row.y === null ? "is-unavailable" : "")} aria-label={`${row.method.name}: ${metricSpecs[xKey][locale]} ${row.x === null ? status(row) : `${formatMetricSummary(row.metric,xKey,locale)} ${metricSpecs[xKey].unit}`}; ${metricSpecs[yKey][locale]} ${row.y === null ? status(row) : formatMetricSummary(row.yMetric,yKey,locale)}; `} aria-pressed={active === row.method.id} aria-describedby={showDetails && active === row.method.id ? "tradeoff-description" : undefined} onClick={event => { interaction.current = event.detail === 0 ? "focus" : "pointer"; onParamsChange({method:row.method.id}); choose(row.method.id); }} onFocus={() => { interaction.current = "focus"; choose(row.method.id); }}>
          <span className="tradeoff-method-name">{row.batch && <i className="tradeoff-marker circle" aria-hidden="true" />}<span><strong>{row.method.name}</strong></span></span>
          <span className={"benchmark-emphasis tradeoff-method-value " + (row.x === null ? "is-missing" : "")} data-tone={xEmphasis[index].tone} data-best={xEmphasis[index].best} data-heat={xEmphasis[index].strength ?? ""} data-testid="tradeoff-method-x" data-raw={row.x ?? ""}>{row.x === null ? status(row) : formatMetricSummary(row.metric,xKey,locale,true)}</span>
          <span className={"benchmark-emphasis tradeoff-method-value " + (row.y === null ? "is-missing" : "")} data-tone={yEmphasis[index].tone} data-best={yEmphasis[index].best} data-heat={yEmphasis[index].strength ?? ""} data-testid="tradeoff-method-y" data-raw={row.y ?? ""}>{row.y === null ? row.x === null ? "—" : status(row) : formatMetricSummary(row.yMetric,yKey,locale,true)}</span>
        </button>)}
      </div>
    </div>
    </div>
    {showDetails && focused && <div className="tradeoff-details" data-testid="tradeoff-details"><div className="tradeoff-details-content" id="tradeoff-description" role="tooltip">
      <strong>{focused.method.name} · {status(focused)}</strong>
      <p>{metricSpecs[xKey][locale]}: {formatMetricSummary(focused.metric,xKey,locale)} {metricSpecs[xKey].unit} · {metricSpecs[yKey][locale]}: {formatMetricSummary(focused.yMetric,yKey,locale)}</p>
      {xKey === "max_rss_kib" && focused.x !== null && <p>{words(locale,"Original: ","原始值：")}{focused.x.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {maximumSignificantDigits:21})} KiB</p>}
      {focused.spec && <p>{focused.spec.version}</p>}
      {((focused.metric?.planned_count ?? 0) > 1 || focused.metric?.status === "partial" || focused.yMetric?.status === "partial") && <p>{focused.metric?.valid_count ?? 0}/{focused.metric?.planned_count ?? "—"} {words(locale,"valid for horizontal metric","横轴指标有效")} · {focused.yMetric?.valid_count ?? 0}/{focused.yMetric?.planned_count ?? "—"} {words(locale,"valid for vertical metric","纵轴指标有效")}</p>}
      </div><button type="button" aria-label={words(locale,"Close result details","关闭结果详情")} onClick={() => setShowDetails(false)}>×</button>
    </div>}
  </section>;
}
