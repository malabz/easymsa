import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useWorkEntries } from "../../lib/workspace";
import { workspaceText } from "../../lib/i18n/workspace";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { continuationEntry } from "./workReturn";

export function WorkReturnBar() {
  const { pathname } = useLocation();
  const { locale } = useLanguage();
  const entries = useWorkEntries();
  const copy = workspaceText[locale];
  // Keep the homepage cover aligned to the viewport; continuation links belong
  // to task and reference pages, not the cover itself.
  if (pathname === "/") return null;
  const entry = continuationEntry(pathname, entries);
  const reading = !/^\/(submit|realign|viewer|examples|lookup)(\/|$)/.test(pathname);
  if (!entry) return <div className={`work-return${reading ? " work-return--reading" : ""}`} aria-hidden="true" />;
  return <nav className={`work-return${reading ? " work-return--reading" : ""}`} aria-label={copy.returnTo}>
    <Link to={entry.path}><ArrowLeft size={14} aria-hidden="true" />{copy[entry.kind]}</Link>
  </nav>;
}
