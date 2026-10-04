import { HeroSection } from "../components/home/HeroSection";
import { MethodsSection } from "../components/home/MethodsSection";
import { WorkflowSection } from "../components/home/WorkflowSection";
import "../components/home/home.css";

export function HomePage() {
  return (
    <div className="home-page">
      <HeroSection />
      <div className="home-details"><WorkflowSection /><MethodsSection /></div>
    </div>
  );
}
