import { ArrowLeft, Compass, Home, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, ButtonLink } from "../components/common/Button";
import { PageContainer } from "../components/layout/PageContainer";
import { useLanguage } from "../lib/i18n/useLanguage";
import { layoutText } from "../components/layout/layoutText";

export function NotFoundPage() {
  const { locale } = useLanguage();
  const navigate = useNavigate();
  const t = layoutText[locale];
  return <PageContainer className="workflow-page job-message-page">
    <section className="job-message-card">
      <span className="job-message-icon" aria-hidden="true"><Compass size={20} /></span>
      <div className="job-message-body">
        <h1>{t.notFound}</h1>
        <p>{t.notFoundHint}</p>
        <div className="job-message-actions">
          <ButtonLink to="/"><Home size={16} aria-hidden="true" />{t.home}</ButtonLink>
          <ButtonLink to="/lookup" variant="outline"><History size={16} aria-hidden="true" />{t.restore}</ButtonLink>
          <Button onClick={() => navigate(-1)} variant="ghost"><ArrowLeft size={16} aria-hidden="true" />{t.goBack}</Button>
        </div>
      </div>
    </section>
  </PageContainer>;
}
