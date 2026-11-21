import { Link } from "react-router-dom";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { layoutText } from "./layoutText";
export function Footer() {
  const { locale } = useLanguage();
  const t = layoutText[locale];
  return (
    <footer className="app-footer border-t border-slate-200 bg-white/60">
      <div className="app-footer-inner">
        <nav
          aria-label={t.siteInformation}
          className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 text-teal-800 underline"
        >
          <Link to="/license">{t.license}</Link>
          <Link to="/privacy">
            {t.privacy}
          </Link>
          <Link to="/examples">
            {t.examples}
          </Link>
          <Link to="/docs">{t.help}</Link>
        </nav>
      </div>
    </footer>
  );
}
