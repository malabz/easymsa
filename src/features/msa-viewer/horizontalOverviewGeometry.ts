function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

/** Uses visible column indices; original alignment coordinates are display labels. */
export function horizontalOverviewGeometry({
  columnCount, pitch, viewportWidth, labelOffset, scrollLeft, trackWidth
}: {
  columnCount: number; pitch: number; viewportWidth: number;
  labelOffset: number; scrollLeft: number; trackWidth: number;
}) {
  const contentWidth = Math.max(1, columnCount * pitch);
  const visibleWidth = Math.max(0, viewportWidth - labelOffset);
  const maxScroll = Math.max(0, contentWidth - visibleWidth);
  const offset = clamp(scrollLeft, 0, maxScroll);
  const width = Math.max(0, trackWidth);
  const thumbWidth = Math.min(width, Math.max(24, visibleWidth / contentWidth * width));
  const travel = Math.max(0, width - thumbWidth);
  return {
    maxScroll,
    offset,
    thumbWidth,
    thumbLeft: maxScroll > 0 ? offset / maxScroll * travel : 0,
    travel,
    firstIndex: clamp(Math.floor(offset / pitch), 0, Math.max(0, columnCount - 1)),
    lastIndex: clamp(Math.ceil((offset + visibleWidth) / pitch) - 1, 0, Math.max(0, columnCount - 1))
  };
}

export function overviewDragScroll(startScroll: number, deltaX: number, travel: number, maxScroll: number) {
  return travel > 0 ? clamp(startScroll + deltaX / travel * maxScroll, 0, maxScroll) : 0;
}

export function overviewClickScroll(x: number, thumbWidth: number, travel: number, maxScroll: number) {
  return travel > 0 ? clamp((x - thumbWidth / 2) / travel * maxScroll, 0, maxScroll) : 0;
}
