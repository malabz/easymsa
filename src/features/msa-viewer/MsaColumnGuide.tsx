import { useEffect, useRef, type RefObject } from "react";
import { visibleIndexOfPosition } from "./columnStatsStore";
import type { ColumnPositionView } from "./types";

/** Pointer feedback has its own paint layer: moving the mouse never renders cells. */
export function MsaColumnGuide({ viewportRef, scrollRef, positions, position, labelWidth, pitch, cellWidth }: {
  viewportRef: RefObject<HTMLDivElement>; scrollRef: RefObject<HTMLDivElement>;
  positions: ColumnPositionView; position?: number; labelWidth: number; pitch: number; cellWidth: number;
}) {
  const guide = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = viewportRef.current;
    const scroller = scrollRef.current;
    if (!viewport || !scroller) return;
    let pointerX: number | null = null;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const x = pointerX === null ? null : pointerX - scroller.getBoundingClientRect().left - labelWidth - 12;
      const index = x !== null && x >= 0
        ? Math.floor((x + scroller.scrollLeft) / pitch)
        : position === undefined ? -1 : visibleIndexOfPosition(positions, position);
      const element = guide.current;
      if (!element) return;
      element.hidden = index < 0 || index >= positions.length;
      element.style.transform = `translateX(${labelWidth + 12 + index * pitch - scroller.scrollLeft}px)`;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const move = (event: PointerEvent) => { pointerX = event.clientX; schedule(); };
    const leave = () => { pointerX = null; schedule(); };
    viewport.addEventListener("pointermove", move, { passive: true });
    viewport.addEventListener("pointerleave", leave);
    scroller.addEventListener("scroll", schedule, { passive: true });
    paint();
    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener("pointermove", move);
      viewport.removeEventListener("pointerleave", leave);
      scroller.removeEventListener("scroll", schedule);
    };
  }, [viewportRef, scrollRef, positions, position, labelWidth, pitch]);
  return <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 31, pointerEvents: "none", clipPath: `inset(0 0 0 ${labelWidth + 12}px)` }}>
    <div ref={guide} data-msa-column-guide="true" className="msa-column-guide" hidden={position === undefined} style={{ left: 0, width: cellWidth }}/>
  </div>;
}
