import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "../../lib/i18n/LanguageProvider";
import { ThresholdForm } from "./ThresholdForm";
afterEach(cleanup);
beforeEach(()=>localStorage.setItem('easymsa.locale','en'));
describe('threshold drafts',()=>{
  it('shows legacy 0.2 as 20 and applies only after confirmation',()=>{
    const apply=vi.fn();
    render(<LanguageProvider><ThresholdForm value={{gap:0.2}} fields={[{key:'gap',label:'Gap (%)',percent:true}]} onApply={apply}/></LanguageProvider>);
    const input=screen.getByLabelText('Gap (%)') as HTMLInputElement;
    expect(input.value).toBe('20');fireEvent.change(input,{target:{value:'0'}});expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Apply'}));expect(apply).toHaveBeenLastCalledWith({gap:0});
    fireEvent.change(input,{target:{value:''}});fireEvent.click(screen.getByRole('button',{name:'Apply'}));expect(apply).toHaveBeenLastCalledWith({gap:null});
    fireEvent.change(input,{target:{value:'101'}});expect((screen.getByRole('button',{name:'Apply'}) as HTMLButtonElement).disabled).toBe(true);expect(screen.getByRole('alert')).toBeTruthy();
  });
  it('rejects reversed ranges without overwriting applied values',()=>{
    const apply=vi.fn();render(<LanguageProvider><ThresholdForm value={{minGcFraction:0.1,maxGcFraction:0.8}} fields={[{key:'minGcFraction',label:'Min (%)',percent:true},{key:'maxGcFraction',label:'Max (%)',percent:true}]} onApply={apply}/></LanguageProvider>);
    fireEvent.change(screen.getByLabelText('Min (%)'),{target:{value:'90'}});
    expect(screen.getByRole('alert').textContent).toMatch(/Minimum/);expect((screen.getByRole('button',{name:'Apply'}) as HTMLButtonElement).disabled).toBe(true);expect(apply).not.toHaveBeenCalled();
  });
});
