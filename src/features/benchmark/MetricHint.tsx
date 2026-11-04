import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
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
export function Hint({text, align = "center", children}: {text: string; align?: "start" | "center" | "end"; children: ReactNode}) {
  const id = useId();
  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<{"aria-describedby"?: string}>, {"aria-describedby": id})
    : <span className="bench-tip-label" tabIndex={0} aria-describedby={id}>{children}</span>;
  return <span className="bench-tip" data-align={align}>{trigger}<span id={id} className="bench-tip-bubble">{text}</span></span>;
}
