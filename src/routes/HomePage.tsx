import { useEffect, useRef } from "react";
import { HeroSection } from "../components/home/HeroSection";
import { MethodsSection } from "../components/home/MethodsSection";
import { WorkflowSection } from "../components/home/WorkflowSection";
import { HomeDemoProvider } from "../components/home/HomeDemoProvider";
import "../components/home/home.css";

export function HomePage() {
  const root = useRef<HTMLDivElement>(null);

  // Sections rise into view once; content stays visible without observer support or with reduced motion.
  useEffect(() => {
    if (!root.current || !("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const sections = Array.from(root.current.querySelectorAll<HTMLElement>(".home-section"));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.reveal = "shown";
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    sections.forEach(section => {
      if (section.getBoundingClientRect().top < window.innerHeight) return;
      section.dataset.reveal = "pending";
      observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="home-page" ref={root}>
      <HeroSection />
      <HomeDemoProvider><WorkflowSection /><MethodsSection /></HomeDemoProvider>
    </div>
  );
}
