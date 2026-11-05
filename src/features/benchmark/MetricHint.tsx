import { cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useInRouterContext } from "react-router-dom";
import "./controls.css";
import { displayMetricKeys } from "./metrics";
import { words, type Locale } from "./presentation";

type DisplayKey = typeof displayMetricKeys[number];
const help: Record<DisplayKey, [string, string]> = {
  wall_seconds:["Wall-clock seconds to finish the alignment. Lower is better.","完成比对用了多少秒（墙钟时间），越短越好。"],
  max_rss_kib:["Peak memory while aligning, in MiB. Lower is better.","比对过程中的峰值内存（MiB），越少越好。"],
  scaled_sp:["Average sum-of-pairs score per sequence pair and column. Needs no reference. Higher is better.","每对序列、每个比对列的平均 SP 得分，不需要参考比对，越高越好。"],
  q:["Share of residue pairs in the reference alignment that are aligned the same way (0–1). Higher is better; only on datasets with a reference.","参考比对里的残基配对，有多少被同样对齐（0–1），越高越好；只在有参考比对的数据集上计算。"],
  tc:["Share of reference columns reproduced exactly (0–1). Higher is better; only on datasets with a reference.","参考比对里的整列，有多少被完整复现（0–1），越高越好；只在有参考比对的数据集上计算。"],
};
export function metricHelp(key: DisplayKey, locale: Locale) { return words(locale, ...help[key]); }

/** A short explanation shown on hover or keyboard focus, and read as the control's description. */
export function Hint({text, align = "center", children,guide}: {text: string; align?: "start" | "center" | "end"; children: ReactNode;guide?:Locale}) {
  const routed=useInRouterContext();
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null), bubble = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const [open,setOpen] = useState(false), [position,setPosition] = useState({left:12,top:12});
  const keep = () => { clearTimeout(timer.current); };
  const show = () => { keep(); setOpen(true); };
  const leave = () => {
    keep();
    if (!anchor.current?.contains(document.activeElement)) timer.current = setTimeout(() => setOpen(false),120);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const target = anchor.current?.getBoundingClientRect(), tip = bubble.current?.getBoundingClientRect();
      if (!target || !tip) return;
      const edge = 12, viewportWidth = document.documentElement.clientWidth || window.innerWidth;
      const left = align === "start" ? target.left : align === "end" ? target.right-tip.width : target.left+(target.width-tip.width)/2;
      const top = target.bottom+8+tip.height <= window.innerHeight-edge ? target.bottom+8 : target.top-tip.height-8;
      setPosition({left:Math.max(edge,Math.min(left,viewportWidth-tip.width-edge)),top:Math.max(edge,Math.min(top,window.innerHeight-tip.height-edge))});
    };
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape") { clearTimeout(timer.current); setOpen(false); } };
    place();
    window.addEventListener("resize",place);window.addEventListener("scroll",place,true);document.addEventListener("keydown",dismiss);
    return () => { window.removeEventListener("resize",place);window.removeEventListener("scroll",place,true);document.removeEventListener("keydown",dismiss); };
  }, [open,text,align]);
  const description = open ? id : undefined;
  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<{"aria-describedby"?: string}>, {"aria-describedby": [children.props["aria-describedby"],description].filter(Boolean).join(" ") || undefined})
    : <span className="bench-tip-label" tabIndex={0} aria-describedby={description}>{children}</span>;
  // A body-level portal never contributes overflow to the table containing its trigger.
  return <span className="bench-tip" ref={anchor} onMouseEnter={show} onMouseLeave={leave} onFocus={show} onBlur={() => { keep();setOpen(false); }}>
    {trigger}
    {guide&&(routed?<Link className="benchmark-metric-help-link" to="/docs?section=metrics&article=benchmark-metrics" aria-label={guide==="zh"?"查看计算说明":"View calculation guide"} title={guide==="zh"?"查看计算说明":"View calculation guide"}>?</Link>:<a className="benchmark-metric-help-link" href="#/docs?section=metrics&article=benchmark-metrics" aria-label={guide==="zh"?"查看计算说明":"View calculation guide"}>?</a>)}
    {open && createPortal(<span id={id} role="tooltip" className="bench-tip-bubble" ref={bubble} style={position} onMouseEnter={keep} onMouseLeave={leave}>{text}</span>,document.body)}
  </span>;
}
