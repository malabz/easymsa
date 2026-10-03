import { Link } from "react-router-dom";
import { useLanguage } from "../../lib/i18n/useLanguage";
export function Footer() {
  const { locale } = useLanguage();
  const zh = locale === "zh";
  return (
    <footer className="border-t border-slate-200 bg-white/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between">
        <p>
          {zh
            ? "所有用途免费 · 无需注册 · EasyMSA 自有代码采用 MIT"
            : "Free for all uses · No registration · Original EasyMSA code: MIT"}
        </p>
        <nav
          aria-label={zh ? "网站说明" : "Site information"}
          className="flex flex-wrap gap-4 text-teal-800 underline"
        >
          <Link to="/license">{zh ? "许可与第三方声明" : "Licenses"}</Link>
          <Link to="/privacy">
            {zh ? "隐私与本地存储" : "Privacy and storage"}
          </Link>
          <Link to="/examples">
            {zh ? "交互式示例" : "Interactive examples"}
          </Link>
          <Link to="/docs">{zh ? "帮助" : "Help"}</Link>
        </nav>
      </div>
    </footer>
  );
}
