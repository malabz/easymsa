import { ArrowDown, ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { homeContent } from "../../lib/homeContent";
import { AlignmentAnimation } from "./AlignmentAnimation";
import { ButtonLink } from "../common/Button";
import { useLayoutEffect, useRef } from "react";

export function HeroSection() {
  const { locale } = useLanguage();
  const copy = homeContent[locale];
  const coverRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const cover = coverRef.current;
    const content = contentRef.current;
    const stage = stageRef.current;
    const header = document.querySelector("header");
    if (!cover || !content || !stage || !header) return;
    const fit = () => {
      cover.style.setProperty("--cover-header-height", `${header.getBoundingClientRect().height}px`);
      // Fit the presentation into the available first-screen space without moving its boundary.
      const scale = Math.min(1, content.clientHeight / Math.max(1, stage.offsetHeight));
      stage.style.setProperty("--cover-scale", String(scale));
    };
    const observer = new ResizeObserver(fit);
    [header, content, stage].forEach(element => observer.observe(element));
    window.addEventListener("resize", fit);
    fit();
    return () => { observer.disconnect(); window.removeEventListener("resize", fit); };
  }, []);
  return (
    <section ref={coverRef} className="home-cover" lang={locale} aria-labelledby="home-title">
      <div ref={contentRef} className="home-cover-content">
        <div ref={stageRef} className="home-cover-stage">
        <div className="home-cover-heading">
          <p className="home-eyebrow">{copy.eyebrow}</p>
          <h1 id="home-title">{copy.title}</h1>
          <p className="home-intro">{copy.intro}</p>
          <div className="home-actions">
            <ButtonLink to="/submit" size="lg">{copy.start}<ArrowRight size={18} aria-hidden="true" /></ButtonLink>
            <ButtonLink to="/examples/alignment-small" variant="outline" size="lg">{copy.example}<ArrowUpRight size={18} aria-hidden="true" /></ButtonLink>
          </div>
        </div>
        <AlignmentAnimation locale={locale} />
        </div>
      </div>
      <div className="home-cover-bottom">
        <p>{copy.free}<Link to="/license">{copy.license}</Link><Link to="/privacy">{copy.privacy}</Link></p>
        <button className="home-scroll" type="button" aria-label={copy.scroll} onClick={() => {
          const section = document.getElementById("home-workflow");
          section?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
          section?.focus({ preventScroll: true });
        }}><span>{copy.scroll}</span><ArrowDown size={18} aria-hidden="true" /></button>
      </div>
    </section>
  );
}
