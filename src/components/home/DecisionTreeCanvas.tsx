import { useEffect, useRef } from "react";
import { HOME_TREE_FEATURES, HOME_TREE_NODES, HOME_TREE_PATHS, type HomeTreeNode } from "./homeDecisionTreeData";

type Props = { method: string; progress: number; locale: "zh" | "en"; label: string };

export function DecisionTreeCanvas({ method, progress, locale, label }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ method, progress, locale });
  const redraw = useRef<() => void>(() => {});
  state.current = { method, progress, locale };
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const draw = () => {
      const { method: selected, progress: phase, locale: language } = state.current;
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
      if (element.width !== pixelWidth || element.height !== pixelHeight) {
        element.width = pixelWidth; element.height = pixelHeight;
      }
      const ctx = element.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const vertical = width < 500;
      const path = HOME_TREE_PATHS[selected];
      const journey = Math.min(4, Math.max(0, (phase - .12) / .55) * 4);
      const selectedNodes = new Set(path.slice(0, Math.floor(journey) + 1));
      const positions = new Map<number, { x: number; y: number }>();
      const position = (node: HomeTreeNode): { x: number; y: number } => {
        const along = 30 + node.depth * ((vertical ? height : width) - 60) / 4;
        const crossSize = (vertical ? width : height) - 32;
        let cross: number;
        if (node.leaf !== undefined) cross = 16 + ((node.leaf + .5) / 16) * crossSize;
        else {
          const left = position(HOME_TREE_NODES[node.left!]);
          const right = position(HOME_TREE_NODES[node.right!]);
          cross = vertical ? (left.x + right.x) / 2 : (left.y + right.y) / 2;
        }
        const point = vertical ? { x: cross, y: along } : { x: along, y: cross };
        positions.set(node.id, point);
        return point;
      };
      position(HOME_TREE_NODES[0]);
      const edge = (from: {x: number; y: number}, to: {x: number; y: number}) => {
        ctx.beginPath(); ctx.moveTo(from.x, from.y);
        if (vertical) ctx.bezierCurveTo(from.x, (from.y + to.y) / 2, to.x, (from.y + to.y) / 2, to.x, to.y);
        else ctx.bezierCurveTo((from.x + to.x) / 2, from.y, (from.x + to.x) / 2, to.y, to.x, to.y);
        ctx.stroke();
      };
      for (const node of HOME_TREE_NODES) {
        if (node.left === undefined) continue;
        const from = positions.get(node.id)!;
        for (const child of [node.left, node.right!]) {
          const selectedEdge = selectedNodes.has(node.id) && selectedNodes.has(child);
          ctx.strokeStyle = selectedEdge ? "#0f766e" : "#d3e1da";
          ctx.lineWidth = selectedEdge ? 2.5 : 1;
          edge(from, positions.get(child)!);
        }
      }
      // The moving marker follows the model's real parent-child relationships.
      if (journey > 0 && journey < 4) {
        const index = Math.floor(journey), t = journey - index;
        const from = positions.get(path[index])!, to = positions.get(path[index + 1])!;
        const middle = vertical ? (from.y + to.y) / 2 : (from.x + to.x) / 2;
        const curve = (a: number, b: number, c: number, d: number) => (1-t)**3*a + 3*(1-t)**2*t*b + 3*(1-t)*t*t*c + t**3*d;
        const x = vertical ? curve(from.x, from.x, to.x, to.x) : curve(from.x, middle, middle, to.x);
        const y = vertical ? curve(from.y, middle, middle, to.y) : curve(from.y, from.y, to.y, to.y);
        ctx.fillStyle = "#0f766e"; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      }
      for (const node of HOME_TREE_NODES) {
        const point = positions.get(node.id)!;
        const active = selectedNodes.has(node.id);
        ctx.fillStyle = active ? "#0f766e" : node.method ? "#b3cbc2" : "#cadbd4";
        ctx.beginPath(); ctx.arc(point.x, point.y, active ? 5 : node.method ? 3 : 3.5, 0, Math.PI * 2); ctx.fill();
        if (!node.feature || (vertical && !active)) continue;
        const name = HOME_TREE_FEATURES[node.feature][language];
        ctx.font = `${active ? 600 : 400} ${vertical ? 12 : language === "en" ? 11 : 12}px system-ui, sans-serif`;
        ctx.textBaseline = "middle"; ctx.textAlign = "center";
        const textWidth = ctx.measureText(name).width + 16;
        const tx = vertical ? Math.min(width - textWidth / 2, Math.max(textWidth / 2, point.x)) : point.x;
        const ty = point.y - (vertical ? 17 : 16);
        ctx.fillStyle = active ? "#e3f3ee" : "#fff";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(tx - textWidth / 2, ty - 10, textWidth, 20, 10);
        else ctx.rect(tx - textWidth / 2, ty - 10, textWidth, 20);
        ctx.fill();
        ctx.fillStyle = active ? "#0f766e" : "#5f7068"; ctx.fillText(name, tx, ty);
      }
    };
    redraw.current = draw; draw();
    const observer = new ResizeObserver(draw); observer.observe(element);
    return () => { observer.disconnect(); redraw.current = () => {}; };
  }, []);
  useEffect(() => redraw.current(), [method, progress, locale]);
  return <canvas ref={canvas} className="home-decision-canvas" role="img" aria-label={label}
    data-method={method} data-step={Math.min(4, Math.floor(Math.max(0, (progress - .12) / .55) * 4))} />;
}
