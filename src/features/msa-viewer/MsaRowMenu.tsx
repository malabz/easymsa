import { MoreHorizontal } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function MsaRowMenu({ label, actions }: {
  label: string;
  actions: { label: string; run: () => void; disabled?: boolean; active?: boolean }[];
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ left: number; top: number; host: HTMLElement } | null>(null);
  const close = (focus = true) => { setAnchor(null); if (focus) trigger.current?.focus(); };
  useLayoutEffect(() => { if (anchor) popup.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus(); }, [anchor]);
  useEffect(() => {
    if (!anchor) return;
    const outside = (event: PointerEvent) => {
      if (!popup.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close(false);
    };
    const scroll = (event: Event) => { if (!popup.current?.contains(event.target as Node)) close(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", scroll);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("scroll", scroll, true); window.removeEventListener("resize", scroll); };
  }, [anchor]);
  return <>
    <button type="button" ref={trigger} className="msa-row-menu-trigger" aria-label={label} aria-haspopup="menu" aria-expanded={Boolean(anchor)}
      onClick={() => {
        if (anchor) { close(); return; }
        const rect = trigger.current!.getBoundingClientRect();
        const host = trigger.current!.closest<HTMLElement>("[data-msa-workspace-shell]") ?? document.body;
        setAnchor({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 220)), top: Math.max(8, Math.min(rect.bottom, window.innerHeight - actions.length * 44 - 12)), host });
      }}><MoreHorizontal size={16}/></button>
    {anchor && createPortal(<div ref={popup} className="msa-row-menu" role="menu" aria-label={label}
      style={{ left: anchor.left, top: anchor.top }}
      onKeyDown={event => {
        if (event.key === "Escape") { event.stopPropagation(); event.preventDefault(); close(); }
        if (event.key === "Tab") { event.stopPropagation(); close(); }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          const buttons = [...popup.current!.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
          buttons[next]?.focus();
        }
      }}>
      {actions.map(action => <button role="menuitemcheckbox" aria-checked={Boolean(action.active)} type="button" key={action.label}
        disabled={action.disabled} onClick={() => { close(); action.run(); }}>{action.label}</button>)}
    </div>, anchor.host)}
  </>;
}
