import { ArrowRight, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { homeContent } from "../../lib/homeContent";
import { exampleUrl } from "../../lib/examples";

export function WorkflowSection() {
  const { locale } = useLanguage();
  const copy = homeContent[locale];
  return (
    <section className="home-section" id="home-workflow" tabIndex={-1} aria-labelledby="home-workflow-title">
      <p className="home-eyebrow">01 / WORKFLOW</p>
      <h2 id="home-workflow-title">{copy.workflowTitle}</h2>
      <div className="home-workflow">
        {copy.steps.map((step, index) => <article key={step.title}>
          <span className="home-step-number" aria-hidden="true">0{index + 1}</span>
          <h3>{step.title}</h3><p>{step.text}</p>
          {index === 0
            ? <a className="home-text-link" download="easymsa-example.fasta" href={exampleUrl({ id: "alignment-small", version: "v1" }, "input.fasta")}>{step.link}<Download size={16} aria-hidden="true" /></a>
            : <Link className="home-text-link" to={index === 1 ? "/submit" : "/lookup"}>{step.link}<ArrowRight size={16} aria-hidden="true" /></Link>}
        </article>)}
      </div>
    </section>
  );
}
