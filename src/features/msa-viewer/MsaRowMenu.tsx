import { MoreHorizontal } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils/cn";

type RowMenuAnchor = {
  left: number;
  top: number;
  bottom: number;
  host: HTMLElement;
};

export function MsaRowMenu({ label, actions, triggerClassName }: {
  label: string;
  actions: { label: string; run: () => void; disabled?: boolean; active?: boolean }[];
  triggerClassName?: string;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const popupId = useId();
  const [anchor, setAnchor] = useState<RowMenuAnchor | null>(null);

  function close(focus = true) {
    setAnchor(null);
    if (focus) trigger.current?.focus({ preventScroll: true });
  }

  useLayoutEffect(() => {
    const menu = popup.current;
    if (!anchor || !menu) return;

    const viewport = window.visualViewport;
    const leftEdge = (viewport?.offsetLeft ?? 0) + 8;
    const topEdge = (viewport?.offsetTop ?? 0) + 8;
    const rightEdge = leftEdge + (viewport?.width ?? window.innerWidth) - 16;
    const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight) - 16;
    menu.style.maxWidth = `${Math.max(0, rightEdge - leftEdge)}px`;
    menu.style.maxHeight = `${Math.max(0, bottomEdge - topEdge)}px`;

    const bounds = menu.getBoundingClientRect();
    const top = anchor.bottom + bounds.height <= bottomEdge
      ? anchor.bottom
      : anchor.top - bounds.height;
    menu.style.left = `${Math.max(leftEdge, Math.min(anchor.left, rightEdge - bounds.width))}px`;
    menu.style.top = `${Math.max(topEdge, Math.min(top, bottomEdge - bounds.height))}px`;
    menu.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true });

    const closePopup = () => close();
    menu.addEventListener("msa-close-popup", closePopup);
    return () => menu.removeEventListener("msa-close-popup", closePopup);
  }, [anchor]);

  useEffect(() => {
    if (!anchor) return;
    const outside = (event: PointerEvent) => {
      if (!popup.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close(false);
    };
    const scroll = (event: Event) => {
      if (!(event.target instanceof Node) || !popup.current?.contains(event.target)) close(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", scroll);
    window.visualViewport?.addEventListener("resize", scroll);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", scroll);
      window.visualViewport?.removeEventListener("resize", scroll);
    };
  }, [anchor]);
  return <>
    <button type="button" ref={trigger} className={cn("msa-row-menu-trigger", triggerClassName)} aria-label={label} aria-haspopup="menu" aria-expanded={Boolean(anchor)}
      aria-controls={anchor ? popupId : undefined}
      onClick={() => {
        if (anchor) { close(); return; }
        const rect = trigger.current!.getBoundingClientRect();
        const host = trigger.current!.closest<HTMLElement>("[data-msa-workspace-shell]") ?? document.body;
        setAnchor({ left: rect.left, top: rect.top, bottom: rect.bottom, host });
      }}><MoreHorizontal aria-hidden="true" size={16}/></button>
    {anchor && createPortal(<div ref={popup} id={popupId} className="msa-row-menu" role="menu" aria-label={label}
      data-msa-popup="true" data-msa-row-menu="true"
      style={{ left: anchor.left, top: anchor.bottom }}
      onKeyDown={event => {
        if (event.key === "Escape") { event.stopPropagation(); event.preventDefault(); close(); }
        if (event.key === "Tab") { event.stopPropagation(); close(); }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.stopPropagation();
          event.preventDefault();
          const buttons = [...popup.current!.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
          if (!buttons.length) return;
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
