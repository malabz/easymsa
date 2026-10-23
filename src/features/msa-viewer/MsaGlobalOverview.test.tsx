import { createRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../lib/i18n/LanguageProvider';
import { MsaGlobalOverview } from './MsaGlobalOverview';
import { filteredColumnPositionView } from './columnStatsStore';
vi.mock('./useMinimapImages', () => ({ useMinimapImages: () => ({ images: null, failed: false, retry: () => {} }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('overview coordinate validation', () => {
  it('rejects invalid row/column input without silently moving and can reveal a hidden column', () => {
    localStorage.setItem('easymsa.locale', 'en');
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 1; });
    vi.stubGlobal('cancelAnimationFrame', () => {});
    const scrollRef = createRef<HTMLDivElement>(); const reveal = vi.fn();
    const input = { rows: [{ id: 'a', sequence: 'ACGT' }], positions: filteredColumnPositionView([1, 4]), scheme: 'nucleotide' as const, store: null };
    render(<LanguageProvider><div ref={scrollRef}/><MsaGlobalOverview input={input} scrollRef={scrollRef} pitch={14} rowHeight={20} headerHeight={152} labelWidth={192} alignmentLength={4} onRevealColumn={reveal}/></LanguageProvider>);
    fireEvent.change(screen.getByLabelText('Go to row'), { target: { value: '2' } }); fireEvent.click(screen.getByText('Go'));
    expect(screen.getByRole('alert').textContent).toContain('integer row from 1 to 1'); expect(scrollRef.current?.scrollTop).toBe(0);
    fireEvent.change(screen.getByLabelText('Go to row'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Go to column'), { target: { value: '1.5' } }); fireEvent.click(screen.getByText('Go'));
    expect(screen.getByRole('alert').textContent).toContain('integer column from 1 to 4');
    fireEvent.change(screen.getByLabelText('Go to column'), { target: { value: '2' } }); fireEvent.click(screen.getByText('Go'));
    expect(screen.getByRole('alert').textContent).toContain('hidden'); fireEvent.click(screen.getByText('Show and locate')); expect(reveal).toHaveBeenCalledWith(2);
    fireEvent.change(screen.getByLabelText('Go to column'), { target: { value: '4' } }); fireEvent.click(screen.getByText('Go'));
    expect(scrollRef.current?.scrollLeft).toBe(14); expect(screen.queryByRole('alert')).toBeNull();
  });
});
