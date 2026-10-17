import { Link } from "react-router-dom";
import { useLanguage } from "../../lib/i18n/useLanguage";
export function Footer() {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  const icpNumber = import.meta.env.VITE_ICP_NUMBER;
  return (
    <footer className="border-t border-slate-200 bg-white/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-end">
        <nav
          aria-label={zh ? "网站说明" : "Site information"}
          className="flex flex-wrap gap-4 text-teal-800 underline"
        >
          {icpNumber && (
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
              {icpNumber}
            </a>
          )}
          <Link to="/license">{zh ? "使用许可" : "Licenses"}</Link>
          <Link to="/privacy">
            {zh ? "隐私" : "Privacy"}
          </Link>
          <Link to="/examples">
            {zh ? "示例" : "Examples"}
          </Link>
          <Link to="/docs">{zh ? "帮助" : "Help"}</Link>
        </nav>
      </div>
    </footer>
  );
}
