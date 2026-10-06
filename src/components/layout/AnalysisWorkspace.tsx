import { useLayoutEffect, useRef, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useWorkEntries } from "../../lib/workspace";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { workspaceText } from "../../lib/i18n/workspace";
import "./analysis-workspace.css";

/** Fit the workspace between the actual navigation and footer, including zoom. */
export function AnalysisWorkspace({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const footer = document.querySelector("#root > div > footer");
      const top = element.getBoundingClientRect().top + window.scrollY;
      const available = Math.floor(window.innerHeight - top - (footer?.getBoundingClientRect().height ?? 69));
      element.style.setProperty("--analysis-height", `${Math.max(400, available)}px`);
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    [document.querySelector("header"), document.querySelector("footer"), element.parentElement].forEach(node => {
      if (node) observer?.observe(node);
    });
    measure();
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  return <div className="analysis-workspace" ref={ref}>
    <aside className="analysis-sidebar">{sidebar}</aside>
    <div className="analysis-main">{children}</div>
  </div>;
}

export function WorkspaceBackLink() {
  const { pathname } = useLocation();
  const { locale } = useLanguage();
  const entry = useWorkEntries().find(item => item.path.split("?")[0] !== pathname);
  return <Link className="workspace-back" to={entry?.path ?? "/lookup"}>
    <ArrowLeft size={15} aria-hidden="true" />
    {entry ? workspaceText[locale][entry.kind] : locale === "zh" ? "返回任务列表" : "Back to jobs"}
  </Link>;
}
