import { MousePointerClick } from "lucide-react";

// Tells visitors whether a section only plays a demonstration or accepts input.
export function HomeModeBadge({ mode, label }: { mode: "demo" | "interactive"; label: string }) {
  return <span className="home-mode-badge" data-mode={mode}>
    {mode === "interactive" ? <MousePointerClick size={13} aria-hidden="true" /> : <i aria-hidden="true" />}
    {label}
  </span>;
}
