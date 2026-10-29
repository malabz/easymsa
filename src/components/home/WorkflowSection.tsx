import { ArrowRight, ChevronsRight } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { homeAdvantagesContent } from "../../lib/homeContent";
import { HomeDemoFallback } from "./HomeDemoFallback";
import { HomeModeBadge } from "./HomeModeBadge";
import { useHomeAnimation, useHomeDemo } from "./HomeDemoProvider";
import { LargeScaleAlignmentCanvas } from "./LargeScaleAlignmentCanvas";

export function WorkflowSection() {
  const { locale } = useLanguage();
  const copy = homeAdvantagesContent[locale];
  const { data } = useHomeDemo();
  const root = useRef<HTMLElement>(null);
  const animation = useHomeAnimation(root, 10000);
  return <section ref={root} className="home-section home-scale-showcase" id="home-workflow" tabIndex={-1} aria-labelledby="home-workflow-title">
    <div className="home-scale-heading">
      <div className="home-benefit-heading">
        <HomeModeBadge mode="demo" label={copy.demoBadge} />
        <h2 id="home-workflow-title">{copy.scaleTitle}</h2>
        <p>{copy.scaleIntro}</p>
      </div>
      <Link to="/submit" className="home-text-link">{copy.start}<ArrowRight size={18} aria-hidden="true" /></Link>
    </div>
    <figure className="home-scale-visual" data-phase={animation.progress < .3 ? "input" : animation.progress < .72 ? "aligning" : "complete"}>
      <figcaption className="home-scale-labels"><span>{copy.batchInput}</span><span>{copy.alignmentComplete}</span></figcaption>
      <ChevronsRight className="home-scale-direction" size={24} aria-hidden="true" />
      {data ? <LargeScaleAlignmentCanvas data={data} progress={animation.progress} reduced={animation.reduced} label={copy.scaleAnimationLabel} /> : <HomeDemoFallback />}
    </figure>
  </section>;
}
