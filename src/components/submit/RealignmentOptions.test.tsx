import '@testing-library/jest-dom/vitest';
import {cleanup,render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,expect,it,vi} from 'vitest';
import {LanguageProvider} from '../../lib/i18n/LanguageProvider';
import {RealignmentOptions} from './RealignmentOptions';
afterEach(cleanup);
it('starts unchecked and sends an opt-in',async()=>{const change=vi.fn();render(<LanguageProvider><RealignmentOptions enabled={false} onEnabled={change} pattern={1} onPattern={()=>{}}/></LanguageProvider>);expect(screen.getByRole('checkbox')).not.toBeChecked();await userEvent.click(screen.getByRole('checkbox'));expect(change).toHaveBeenCalledWith(true);});
it('disables unavailable tools',()=>{render(<LanguageProvider><RealignmentOptions enabled={false} unavailable onEnabled={()=>{}} pattern={1} onPattern={()=>{}}/></LanguageProvider>);expect(screen.getByRole('checkbox')).toBeDisabled();});

it('marks failed refinement separately from a completed job',async()=>{
 const {JobTimeline}=await import('../job/JobTimeline');
 localStorage.setItem('easymsa.locale','en');
 render(<LanguageProvider><JobTimeline status="completed" realign refinementStatus="failed"/></LanguageProvider>);
 expect(screen.getByText('Realignment failed')).toBeVisible();
});

it('shows the server-configured trial limits',()=>{
 localStorage.setItem('easymsa.locale','en');
 render(<LanguageProvider><RealignmentOptions pattern={1} onPattern={()=>{}} limits={{maxSequences:1000,maxColumns:5000,maxCells:1000000}}/></LanguageProvider>);
 expect(screen.getByText(/1,000,000 alignment characters/)).toBeVisible();
});
