import { SubmitJobForm } from "../components/submit/SubmitJobForm";
import { PageContainer } from "../components/layout/PageContainer";
import { useLanguage } from "../lib/i18n/useLanguage";

export function SubmitPage() {
  const { dictionary: d } = useLanguage();

  return (
    <PageContainer className="space-y-8">
      <div className="max-w-3xl space-y-3">
        <h1 className="text-4xl font-semibold text-slate-950">{d.submit.title}</h1>
        <p className="text-lg leading-8 text-slate-600">{d.submit.subtitle}</p>
      </div>
      <SubmitJobForm />
    </PageContainer>
  );
}
