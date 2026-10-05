import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useWorkEntries } from "../../lib/workspace";
import { workspaceText } from "../../lib/i18n/workspace";
import { useLanguage } from "../../lib/i18n/useLanguage";

export function WorkReturnBar() {
  const { pathname } = useLocation();
  const { locale } = useLanguage();
  const entries = useWorkEntries();
  const copy = workspaceText[locale];
  // Keep the homepage cover aligned to the viewport; continuation links belong
  // to task and reference pages, not the cover itself.
  if (pathname === "/") return null;
  const available = entries.filter(entry => entry.path.split("?")[0] !== pathname).slice(0, 2);
  if (!available.length) return null;
  return <nav className="work-return" aria-label={copy.returnTo}>
    {available.map(entry => <Link key={entry.kind} to={entry.path}><ArrowLeft size={14} aria-hidden="true" />{copy[entry.kind]}</Link>)}
  </nav>;
}
