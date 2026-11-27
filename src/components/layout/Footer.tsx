import { Link } from "react-router-dom";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { preloadRoute } from "../../lib/routePreload";
import { layoutText } from "./layoutText";
export function Footer() {
  const { locale } = useLanguage();
  const t = layoutText[locale];
  const links = [
    { to: "/license", label: t.license },
    { to: "/privacy", label: t.privacy },
    { to: "/examples", label: t.examples },
    { to: "/docs", label: t.help }
  ] as const;
  return (
    <footer className="app-footer border-t border-slate-200 bg-white/60">
      <div className="app-footer-inner">
        <nav
          aria-label={t.siteInformation}
          className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 text-teal-800 underline"
        >
          {links.map((item) => (
            <Link
              key={item.to}
              onFocus={() => preloadRoute(item.to)}
              onPointerEnter={() => preloadRoute(item.to)}
              onTouchStart={() => preloadRoute(item.to)}
              to={item.to}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
