import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadExamples, verifiedExampleBytes } from "../../lib/examples";
import { prepareHomeDemo, type HomeDemoData } from "./homeDemoData";

const HomeDemoContext = createContext<{
  data?: HomeDemoData; loading: boolean; failed: boolean; retry: () => void;
} | null>(null);

export function HomeDemoProvider({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: "120px" });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const query = useQuery({
    queryKey: ["home-public-demo", "alignment-small", "v1"],
    enabled: visible,
    staleTime: Infinity,
    retry: 1,
    queryFn: async ({ signal }) => {
      const example = (await loadExamples(signal)).find(item => item.id === "alignment-small");
      if (!example) throw new Error("EXAMPLE_UNAVAILABLE");
      const [input, aligned] = await Promise.all([
        verifiedExampleBytes(example, "clean.fasta", signal),
        verifiedExampleBytes(example, "final.alignment.json", signal),
      ]);
      return prepareHomeDemo(new TextDecoder().decode(input), JSON.parse(new TextDecoder().decode(aligned)));
    },
  });
  return <HomeDemoContext.Provider value={{ data: query.data, loading: query.isPending, failed: query.isError,
    retry: () => { void query.refetch(); } }}>
    <div className="home-details home-benefits" ref={root}>{children}</div>
  </HomeDemoContext.Provider>;
}

export function useHomeDemo() {
  const value = useContext(HomeDemoContext);
  if (!value) throw new Error("Home demonstration requires its provider");
  return value;
}

// Animations stop outside the viewport or while the browser is in the background.
export function useHomeAnimation(root: React.RefObject<HTMLElement>, duration = 9000) {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(false);
  const [foreground, setForeground] = useState(!document.hidden);
  const [reduced, setReduced] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  useEffect(() => {
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    if (root.current) observer?.observe(root.current);
    if (!observer) setInView(true);
    const update = () => setForeground(!document.hidden);
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media?.matches ?? false);
    document.addEventListener("visibilitychange", update);
    media?.addEventListener("change", motion);
    return () => { observer?.disconnect(); document.removeEventListener("visibilitychange", update); media?.removeEventListener("change", motion); };
  }, [root]);
  useEffect(() => {
    if (!playing || !inView || !foreground) return;
    let previous = performance.now();
    const interval = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(now - previous, 250) / (reduced ? duration * 1.7 : duration);
      previous = now;
      setProgress(current => (current + delta) % 1);
    }, 40);
    return () => window.clearInterval(interval);
  }, [playing, inView, foreground, reduced, duration]);
  return { progress, setProgress, playing, setPlaying, reduced };
}
