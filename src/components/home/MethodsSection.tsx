import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { useServiceHealth } from "../../lib/query/useServiceHealth";
import { homeContent } from "../../lib/homeContent";
import { ServiceStatus } from "../common/ServiceStatus";

export function MethodsSection() {
  const { locale } = useLanguage();
  const health = useServiceHealth();
  const copy = homeContent[locale];
  return (
    <section className="home-section home-methods" aria-labelledby="home-methods-title">
      <div><p className="home-eyebrow">02 / METHODS</p><h2 id="home-methods-title">{copy.methodsTitle}</h2><p className="home-methods-intro">{copy.methodsIntro}</p></div>
      <div className="home-method-list">{copy.methods.map(method => <div key={method.name}><h3>{method.name}</h3><p>{method.text}</p></div>)}</div>
      <div className="home-methods-links"><Link className="home-text-link" to="/about">{copy.methodLink}<ArrowUpRight size={16} aria-hidden="true" /></Link>{health.data?.realignment?.enabled && <Link className="home-text-link" to="/realign">{copy.refineLink}<ArrowUpRight size={16} aria-hidden="true" /></Link>}</div>
      <div className="home-service"><ServiceStatus compact /></div>
    </section>
  );
}
