import { HeroSection } from "../components/home/HeroSection";
import { MethodsSection } from "../components/home/MethodsSection";
import { WorkflowSection } from "../components/home/WorkflowSection";
import { HomeDemoProvider } from "../components/home/HomeDemoProvider";
import "../components/home/home.css";

export function HomePage() {
  return (
    <div className="home-page">
      <HeroSection />
      <HomeDemoProvider><WorkflowSection /><MethodsSection /></HomeDemoProvider>
    </div>
  );
}
