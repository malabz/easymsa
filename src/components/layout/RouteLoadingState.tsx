import { useEffect, useState } from "react";
import { refinementText } from "../../lib/i18n/refinements";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { LoadingState } from "../common/LoadingState";
import { PageContainer } from "./PageContainer";

export function RouteLoadingState() {
  const { pathname } = useLocation();
  const { dictionary: d, locale } = useLanguage();
  const [visible, setVisible] = useState(false);

  // Delay showing the fallback on cold deep-link loads so fast chunks never flash "Loading page".
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 150);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const section = pathname.split("/")[1];
  const title = section === "job" ? d.job.title
    : section === "results" ? d.results.title
    : section === "submit" ? d.submit.title
    : section === "realign" ? d.nav.realign
    : section === "viewer" ? d.nav.viewer
    : section === "lookup" ? d.lookup.title
    : section === "docs" ? d.nav.docs
    : section === "about" ? d.nav.about
    : section === "license" ? refinementText[locale].licenseTitle
    : section === "privacy" ? refinementText[locale].privacyTitle
    : section === "examples" ? d.nav.examples
    : section === "benchmark" ? d.nav.benchmark : d.common.appName;
  const form = section === "submit" || section === "realign";
  if (!visible) {
    return <PageContainer className={form ? "workflow-page submission-page" : undefined}><div className="min-h-[40vh]" /></PageContainer>;
  }
  return <PageContainer className={form ? "workflow-page submission-page" : undefined}>
    <div data-route-loading="true">
      <div className="work-heading"><h1>{title}</h1></div>
      <LoadingState label={d.common.loadingPage} />
      <div aria-hidden="true" className={`route-skeleton ${form ? "route-skeleton--form" : ""}`}><div/><div/><div/></div>
    </div>
  </PageContainer>;
}
