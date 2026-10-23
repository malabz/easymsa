import { Link } from "react-router-dom";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { layoutText } from "./layoutText";
export function Footer() {
  const { locale } = useLanguage();
  const t = layoutText[locale];
  const icpNumber = import.meta.env.VITE_ICP_NUMBER;
  return (
    <footer className="app-footer border-t border-slate-200 bg-white/60">
      <div className="app-footer-inner">
        <nav
          aria-label={t.siteInformation}
          className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 text-teal-800 underline"
        >
          {icpNumber && (
            <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
              {icpNumber}
            </a>
          )}
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
