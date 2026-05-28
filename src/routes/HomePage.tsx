import { FeatureCards } from "../components/home/FeatureCards";
import { HeroSection } from "../components/home/HeroSection";
import { WorkflowSection } from "../components/home/WorkflowSection";
import { PageContainer } from "../components/layout/PageContainer";

export function HomePage() {
  return (
    <PageContainer>
      <HeroSection />
      <WorkflowSection />
      <FeatureCards />
    </PageContainer>
  );
}
