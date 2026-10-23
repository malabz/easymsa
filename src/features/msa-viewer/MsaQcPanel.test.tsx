import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import { MsaQcPanel, type MsaQcPanelProps } from "./MsaQcPanel";
import { DEFAULT_ROW_QC_FILTERS } from "./qcModel";
import { DEFAULT_QC_THRESHOLDS } from "./workspaceSnapshot";
import { calculateQcDistributions } from "./qcDistributions";
import type { RowQcStats } from "./types";

class DistributionWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror = null;
  postMessage(rows: RowQcStats[]) { queueMicrotask(() => this.onmessage?.({data:{result:calculateQcDistributions(rows)}} as MessageEvent)); }
  terminate() {}
}

const rows = Array.from({length:255},(_,index)=>({rowKey:`row-${index}`, sequenceId:`sample-${String(index).padStart(3,'0')} long description 中文`, originalIndex:index, sequenceLength:10,alignmentLength:10, canonicalCount:4,ambiguityCount:0,unknownCount:0,gapCount:6,gapFraction:0.6,coverage:0.4,informativeCoverage:0.4,ambiguityFraction:0,unknownFraction:0,gcFraction:0.5}));
function fixture(overrides:Partial<MsaQcPanelProps>={}) {
  const props:MsaQcPanelProps={analysisScope:'all',scopeRowCount:255,totalRowCount:255,totalColumnCount:10,filteredColumnCount:10,rows,filters:DEFAULT_ROW_QC_FILTERS,sortKey:'original',sortDirection:'asc',thresholds:{...DEFAULT_QC_THRESHOLDS,row:{...DEFAULT_QC_THRESHOLDS.row,maxGapFraction:0.5}},onFiltersChange:vi.fn(),onSortChange:vi.fn(),onThresholdsChange:vi.fn(),onReviewRow:vi.fn(),onSelectRows:vi.fn(),onShowRows:vi.fn(),...overrides};
  return {...render(<LanguageProvider><MsaQcPanel {...props}/></LanguageProvider>),props};
}
beforeEach(()=>{ localStorage.setItem('easymsa.locale','en'); vi.stubGlobal('Worker', DistributionWorker); });
afterEach(()=>{cleanup(); vi.unstubAllGlobals();});
describe('sequence checks',()=>{
  it('keeps all results reachable in pages and locates the 255th sequence',()=>{
    const {container,props}=fixture();expect(container.querySelectorAll('.msa-check-list li')).toHaveLength(50);
    for(let page=1;page<6;page++) fireEvent.click(screen.getByRole('button',{name:'Next page'}));
    expect(screen.getByText('Page 6 / 6')).toBeTruthy();expect(container.querySelectorAll('.msa-check-list li')).toHaveLength(5);
    fireEvent.click(within(container.querySelectorAll('.msa-check-list li')[4] as HTMLElement).getByRole('button',{name:'Locate'}));
    expect(props.onReviewRow).toHaveBeenCalledWith('row-254');
    fireEvent.click(screen.getByRole('button',{name:'Expand full table'}));expect(screen.getByRole('dialog').textContent).toContain('sample-254');
  });
  it('separates percentage rule changes, list filters and matrix display',()=>{
    const {props}=fixture();fireEvent.click(screen.getByRole('button',{name:'Check rules'}));
    const rules=screen.getByRole('dialog',{name:'Check rules'});
    fireEvent.change(within(rules).getByLabelText('Flag gap fraction above (%)'),{target:{value:'20'}});
    expect(props.onThresholdsChange).not.toHaveBeenCalled();expect(props.onShowRows).not.toHaveBeenCalled();
    fireEvent.click(within(rules).getByRole('button',{name:'Apply'}));expect(props.onThresholdsChange).toHaveBeenCalledWith(expect.objectContaining({row:expect.objectContaining({maxGapFraction:0.2})}));
    fireEvent.click(within(rules).getByRole('button',{name:'Close'}));
    fireEvent.click(screen.getByRole('button',{name:'Select matching sequences'}));expect(props.onSelectRows).toHaveBeenCalledWith(rows.map(row=>row.rowKey));expect(props.onShowRows).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Show only matching sequences'}));expect(props.onShowRows).toHaveBeenCalledWith(rows.map(row=>row.rowKey));
  });
  it('filters all results including records after 200 and disables empty display',()=>{
    const {container}=fixture({filters:{...DEFAULT_ROW_QC_FILTERS,name:'254'}});
    expect(container.querySelectorAll('.msa-check-list li')).toHaveLength(1);expect(screen.getByText(/sample-254/)).toBeTruthy();
    cleanup();fixture({filters:{...DEFAULT_ROW_QC_FILTERS,name:'missing'}});
    expect((screen.getByRole('button',{name:'Show only matching sequences'}) as HTMLButtonElement).disabled).toBe(true);
  });
  it('reports rules without changing the alignment and has accessible labels',async()=>{
    const {container,props}=fixture({rows:rows.slice(0,1)});
    expect(screen.getByText('Gap fraction > 50.0%')).toBeTruthy();fireEvent.click(screen.getByText('Check rules'));
    expect(screen.getByText(/sequences are not hidden automatically/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Close'}));
    fireEvent.click(screen.getByRole('button',{name:'Distributions'}));expect(await screen.findByText('Gap fraction: 1 observations; minimum 60.0%, median 60.0%, maximum 60.0%.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Close'}));
    expect(props.onShowRows).not.toHaveBeenCalled();
    const result=await axe.run(container,{rules:{'color-contrast':{enabled:false}}});expect(result.violations.map(v=>v.id)).toEqual([]);
  });
  it('offers retry after a statistics failure without reporting an empty search',()=>{const {props}=fixture({rows:[],status:'error',onRetry:vi.fn()});fireEvent.click(screen.getByRole('button',{name:'Retry'}));expect(props.onRetry).toHaveBeenCalledOnce();expect(screen.queryByText('No matching sequences')).toBeNull();});
  it('distinguishes loading from an empty result',()=>{fixture({rows:[],status:'calculating'});expect(screen.getByText('Calculating statistics…')).toBeTruthy();expect(screen.queryByText('No matching sequences')).toBeNull();expect(screen.queryByText('0 results')).toBeNull();});
});
