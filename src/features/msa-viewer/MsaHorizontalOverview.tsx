import { ChevronsLeftRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { useLanguage } from "../../lib/i18n/useLanguage";
import { positionAt } from "./columnStatsStore";
import {
  horizontalOverviewGeometry, overviewClickScroll, overviewDragScroll
} from "./horizontalOverviewGeometry";
import { calculateMinimap, type MinimapImage, type MinimapInput } from "./minimapData";

const imageCache = new WeakMap<MinimapInput, MinimapImage>();

export function MsaHorizontalOverview({input, scrollRef, pitch, labelWidth}: {
  input: MinimapInput; scrollRef: RefObject<HTMLDivElement>; pitch: number; labelWidth: number;
}) {
  const {locale} = useLanguage();
  const zh = locale === "zh";
  const label = zh ? "横向概览" : "Horizontal overview";
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const generation = useRef(0);
  const drag = useRef<{pointerId: number; x: number; scroll: number; travel: number; max: number} | null>(null);
  const [image, setImage] = useState<MinimapImage | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [viewport, setViewport] = useState({scrollLeft: 0, clientWidth: 0, trackWidth: 0});
  const imageInput = useMemo<MinimapInput>(() => ({
    ...input, layout: "horizontal", width: 2048, height: 18
  }), [input]);

  useEffect(() => {
    const current = ++generation.current;
    const cached = imageCache.get(input);
    setFailed(false);
    if (cached) { setImage(cached); return; }
    setImage(null);
    let worker: Worker | undefined;
    try {
      if (typeof Worker === "undefined") {
        if (import.meta.env.MODE === "test") setImage(calculateMinimap(imageInput));
        else setFailed(true);
      } else {
        worker = new Worker(new URL("../../workers/minimap.worker.ts", import.meta.url), {type: "module"});
        worker.onmessage = event => {
          if (current !== generation.current || event.data.generation !== current) return;
          if (event.data.error) setFailed(true);
          else { imageCache.set(input, event.data.image); setImage(event.data.image); }
        };
        worker.onerror = () => { if (current === generation.current) setFailed(true); };
        worker.postMessage({generation: current, input: imageInput});
      }
    } catch { setFailed(true); }
    return () => { generation.current++; worker?.terminate(); };
  }, [imageInput, input, retry]);

  // The image is painted once per data/colour change. Scrolling only moves the thumb.
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const context = canvasRef.current.getContext("2d");
    if (!context) return;
    const pixels = context.createImageData(image.width, image.height);
    pixels.data.set(image.pixels);
    context.putImageData(pixels, 0, 0);
  }, [image]);

  useEffect(() => {
    const element = scrollRef.current;
    const track = trackRef.current;
    if (!element || !track) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setViewport({
        scrollLeft: element.scrollLeft, clientWidth: element.clientWidth, trackWidth: track.clientWidth
      }));
    };
    // Wheel input on this strip scrolls the matrix horizontally, including ordinary mouse wheels.
    const wheel = (event: WheelEvent) => {
      const max = element.scrollWidth - element.clientWidth;
      if (max <= 0 || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? pitch : event.deltaMode === 2 ? element.clientWidth : 1;
      element.scrollLeft += (event.deltaX || event.deltaY) * unit;
    };
    update();
    element.addEventListener("scroll", update, {passive: true});
    track.addEventListener("wheel", wheel, {passive: false});
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(element);
    observer?.observe(track);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      element.removeEventListener("scroll", update);
      track.removeEventListener("wheel", wheel);
    };
  }, [scrollRef, pitch, labelWidth, input.positions]);

  const geometry = horizontalOverviewGeometry({
    columnCount: input.positions.length, pitch, labelOffset: labelWidth + 24,
    viewportWidth: viewport.clientWidth, scrollLeft: viewport.scrollLeft, trackWidth: viewport.trackWidth
  });
  const first = positionAt(input.positions, geometry.firstIndex) ?? 1;
  const last = positionAt(input.positions, geometry.lastIndex) ?? first;
  const interval = `${first.toLocaleString()}–${last.toLocaleString()}`;
  const endIndex = Math.max(0, Math.ceil(geometry.maxScroll / pitch));
  const maximum = positionAt(input.positions, Math.min(endIndex, input.positions.length - 1)) ?? first;
  const hint = zh ? "拖动绿色框左右浏览，点击概览跳转" : "Drag the green frame to pan; click the overview to jump";
  const setScroll = (value: number) => {
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, Math.min(geometry.maxScroll, value));
  };

  return <div className="msa-horizontal-overview" data-msa-horizontal-overview="true"
    style={{"--msa-overview-label-width": `${labelWidth + 12}px`} as CSSProperties}>
    <div className="msa-horizontal-caption" title={hint}>
      <ChevronsLeftRight aria-hidden="true" size={16}/>
      <span>{label}</span>
      <span className="msa-horizontal-range">{interval}</span>
    </div>
    <div className="msa-horizontal-track" ref={trackRef} tabIndex={0} role="slider"
      aria-label={label} aria-description={hint} aria-orientation="horizontal"
      aria-valuemin={positionAt(input.positions, 0) ?? 1} aria-valuemax={maximum}
      aria-valuenow={first} aria-valuetext={zh ? `当前列 ${interval}` : `Visible columns ${interval}`}
      aria-disabled={geometry.maxScroll === 0} title={hint}
      onKeyDown={event => {
        const element = scrollRef.current;
        if (!element) return;
        let target: number;
        if (event.key === "Home") target = 0;
        else if (event.key === "End") target = geometry.maxScroll;
        else if (event.key === "ArrowLeft") target = element.scrollLeft - pitch * 10;
        else if (event.key === "ArrowRight") target = element.scrollLeft + pitch * 10;
        else if (event.key === "PageUp") target = element.scrollLeft - Math.max(pitch, viewport.clientWidth - labelWidth - 24);
        else if (event.key === "PageDown") target = element.scrollLeft + Math.max(pitch, viewport.clientWidth - labelWidth - 24);
        else return;
        event.preventDefault(); setScroll(target);
      }}
      onPointerDown={event => {
        if (event.button !== 0 || geometry.maxScroll === 0) return;
        event.preventDefault();
        event.currentTarget.focus({preventScroll: true});
        const x = event.clientX - event.currentTarget.getBoundingClientRect().left;
        const inThumb = x >= geometry.thumbLeft && x <= geometry.thumbLeft + geometry.thumbWidth;
        const next = inThumb ? geometry.offset : overviewClickScroll(x, geometry.thumbWidth, geometry.travel, geometry.maxScroll);
        setScroll(next);
        drag.current = {pointerId: event.pointerId, x: event.clientX, scroll: next, travel: geometry.travel, max: geometry.maxScroll};
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        const active = drag.current;
        if (active?.pointerId === event.pointerId) {
          setScroll(overviewDragScroll(active.scroll, event.clientX - active.x, active.travel, active.max));
        }
      }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
      onLostPointerCapture={() => { drag.current = null; }}>
      {image && <canvas ref={canvasRef} width={image.width} height={image.height} aria-hidden="true"/>}
      <div className="msa-horizontal-thumb" data-msa-horizontal-thumb="true"
        style={{left: geometry.thumbLeft, width: geometry.thumbWidth}}>
        <span aria-hidden="true"/>
      </div>
    </div>
    {failed && <button type="button" className="msa-horizontal-retry" onClick={() => setRetry(value => value + 1)}>
      {zh ? "重试概览" : "Retry overview"}
    </button>}
  </div>;
}
