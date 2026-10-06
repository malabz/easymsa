import { SubmitJobForm } from "../components/submit/SubmitJobForm";
import { PageContainer } from "../components/layout/PageContainer";
import { useLanguage } from "../lib/i18n/useLanguage";
import { ServiceStatus } from "../components/common/ServiceStatus";
import { workspaceText } from "../lib/i18n/workspace";

export function SubmitPage() {
  const { dictionary: d, locale } = useLanguage();

  return (
    <PageContainer className="workflow-page submission-page">
      <div className="work-heading">
        <div><h1>{d.submit.title}</h1><p>{workspaceText[locale].compactIntro}</p></div>
        <ServiceStatus inline />
      </div>
      <SubmitJobForm />
    </PageContainer>
  );
}
