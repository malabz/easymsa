import { useLocation } from "react-router-dom";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { LoadingState } from "../common/LoadingState";
import { PageContainer } from "./PageContainer";

export function RouteLoadingState() {
  const { pathname } = useLocation();
  const { dictionary: d } = useLanguage();
  const section = pathname.split("/")[1];
  const title = section === "job" ? d.job.title
    : section === "results" ? d.results.title
    : section === "submit" ? d.submit.title
    : section === "realign" ? d.nav.realign
    : section === "viewer" ? d.nav.viewer
    : section === "lookup" ? d.lookup.title
    : section === "docs" ? d.nav.docs
    : section === "about" ? d.nav.about
    : section === "examples" ? d.nav.examples : d.common.appName;
  const form = section === "submit" || section === "realign";
  return <PageContainer className={form ? "workflow-page submission-page" : undefined}>
    <div data-route-loading="true">
      <div className="work-heading"><h1>{title}</h1></div>
      <LoadingState label={d.common.loadingPage} />
    </div>
  </PageContainer>;
}
