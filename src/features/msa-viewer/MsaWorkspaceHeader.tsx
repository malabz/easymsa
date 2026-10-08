import { ArrowLeft, Expand, Minimize2, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";

export function MsaWorkspaceHeader({ title, sequences, columns, immersive, onToggle, onReturn, onReplace, extra, example }: {
  title: string; sequences?: number; columns?: number; immersive: boolean;
  onToggle?: () => void; onReturn?: () => void; onReplace?: () => void; extra?: ReactNode; example?: boolean;
}) {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  return <div className="msa-source-bar">
    <span className="msa-brand"><img src={`${import.meta.env.BASE_URL}brand/easymsa-mark.svg`} alt="" width={26} height={26}/><strong>easymsa</strong></span>
    {onReturn && <button type="button" className="msa-return" onClick={onReturn}><ArrowLeft size={16}/>{zh ? "返回结果" : "Back to results"}</button>}
    <div className="msa-source-name"><strong title={title}>{title}</strong><span>
      {sequences !== undefined && `${sequences.toLocaleString()} ${zh ? "条序列" : "sequences"}`}
      {columns !== undefined && ` · ${columns.toLocaleString()} ${zh ? "列" : "columns"}`}
      {example && <span className="msa-example-label"> · {zh ? "示例已载入" : "Example loaded"}</span>}
    </span></div>
    <div className="msa-source-actions">{extra}
      <a className="msa-viewer-help" href={`${import.meta.env.BASE_URL}#/docs`} target="_blank" rel="noreferrer" aria-label={zh?'使用帮助（新标签页）':'Help (new tab)'}>?</a>
      {onReplace && !immersive && <button className="msa-replace" type="button" aria-label={zh ? "更换文件" : "Change file"} onClick={onReplace}><Upload size={15}/><span>{zh ? "更换文件" : "Change file"}</span></button>}
      {!onReturn && onToggle && <button className="msa-expand" type="button" onClick={onToggle}>
        {immersive ? <Minimize2 size={16}/> : <Expand size={16}/>}{immersive ? (zh ? "退出全屏" : "Exit full screen") : (zh ? "全屏查看" : "Full screen")}
      </button>}
    </div>
  </div>;
}
