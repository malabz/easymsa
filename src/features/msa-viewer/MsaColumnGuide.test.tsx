import { Profiler, useRef } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MsaColumnGuide } from './MsaColumnGuide';
import { identityColumnPositionView } from './columnStatsStore';
const positions = identityColumnPositionView(1_000);
function Fixture() {
  const viewport = useRef<HTMLDivElement>(null); const scroller = useRef<HTMLDivElement>(null);
  return <div ref={viewport} data-testid="viewport"><div ref={scroller} data-testid="scroller"/><MsaColumnGuide viewportRef={viewport} scrollRef={scroller} positions={positions} labelWidth={192} pitch={14} cellWidth={14}/></div>;
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('independent pointer guide', () => {
  it('coalesces 100 pointer events into one paint and no React commits', () => {
    let callback: FrameRequestCallback | null = null;
    const request = vi.fn((next: FrameRequestCallback) => { callback = next; return 1; });
    vi.stubGlobal('requestAnimationFrame', request); vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const commits = vi.fn(); const { getByTestId, container } = render(<Profiler id="matrix" onRender={commits}><Fixture/></Profiler>);
    const before = commits.mock.calls.length;
    for (let i = 0; i < 100; i++) fireEvent(getByTestId('viewport'), new MouseEvent('pointermove', { clientX: 250 + i, bubbles: true }));
    expect(request).toHaveBeenCalledOnce();
    act(() => { (callback as unknown as FrameRequestCallback)(0); });
    expect(commits).toHaveBeenCalledTimes(before);
    const guide = container.querySelector<HTMLElement>('[data-msa-column-guide]')!;
    expect(guide.hidden).toBe(false); expect(guide.style.transform).toBe('translateX(344px)');
    fireEvent(getByTestId('viewport'), new MouseEvent('pointerleave', { bubbles: true }));
    act(() => { (callback as unknown as FrameRequestCallback)(1); });
    expect(guide.hidden).toBe(true); expect(commits).toHaveBeenCalledTimes(before);
  });
});
