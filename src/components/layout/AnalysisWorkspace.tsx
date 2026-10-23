import { useLayoutEffect, useRef, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useWorkEntries } from "../../lib/workspace";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { workspaceText } from "../../lib/i18n/workspace";
import { layoutText } from "./layoutText";
import { workspaceReturn } from "./workReturn";
import "./analysis-workspace.css";

/** Fit the workspace between the actual navigation and footer, including zoom. */
export function AnalysisWorkspace({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const footer = document.querySelector(".app-footer");
      const top = element.getBoundingClientRect().top + window.scrollY;
      const available = Math.floor(window.innerHeight - top - (footer?.getBoundingClientRect().height ?? 44));
      element.style.setProperty("--analysis-height", `${Math.max(160, available)}px`);
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    [document.querySelector(".app-header"), document.querySelector(".app-footer"), element.parentElement].forEach(node => {
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
  const { pathname, search } = useLocation();
  const { locale } = useLanguage();
  const target = workspaceReturn(pathname, search, useWorkEntries());
  const label = target.label === "job" ? workspaceText[locale].job : layoutText[locale][target.label];
  return <Link className="workspace-back" to={target.path}>
    <ArrowLeft size={15} aria-hidden="true" />
    {label}
  </Link>;
}
