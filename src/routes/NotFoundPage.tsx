import { ArrowLeft, Home, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button, ButtonLink } from "../components/common/Button";
import { PageContainer } from "../components/layout/PageContainer";
import { useLanguage } from "../lib/i18n/useLanguage";
import { layoutText } from "../components/layout/layoutText";

export function NotFoundPage() {
  const { locale } = useLanguage();
  const navigate = useNavigate();
  const t = layoutText[locale];
  return <PageContainer>
    <div className="work-heading"><div>
      <h1>{t.notFound}</h1>
      <p>{t.notFoundHint}</p>
    </div></div>
    <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
      <Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft size={16} aria-hidden="true" />{t.goBack}</Button>
      <ButtonLink to="/"><Home size={16} aria-hidden="true" />{t.home}</ButtonLink>
      <ButtonLink to="/lookup" variant="outline"><History size={16} aria-hidden="true" />{t.restore}</ButtonLink>
    </div>
  </PageContainer>;
}
