import '@testing-library/jest-dom/vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {LanguageProvider} from '../lib/i18n/LanguageProvider';
const mocks=vi.hoisted(()=>({submit:vi.fn(),navigate:vi.fn(),refetch:vi.fn(),health:{} as any}));
vi.mock('../lib/query/useServiceHealth',()=>({useServiceHealth:()=>mocks.health}));
vi.mock('../lib/api/jobs',()=>({createRealignmentJob:mocks.submit}));
vi.mock('react-router-dom',async()=>({...await vi.importActual('react-router-dom'),useNavigate:()=>mocks.navigate}));
import {MemoryRouter} from 'react-router-dom';
import {clearDraft} from '../lib/workspace';
import {RealignPage} from './RealignPage';
import {EasyMsaApiError} from '../lib/api/client';
const aligned=new File(['>a\nAC-G\n>b\nACCG\n'],'aligned.fa');
beforeEach(()=>{
 clearDraft("realign"); vi.clearAllMocks();localStorage.setItem('easymsa.locale','en');
 mocks.health={isPending:false,isError:false,refetch:mocks.refetch,data:{coreReady:true,realignment:{enabled:true,available:true,maxSequences:2000,maxColumns:30000,maxCells:1000000},queueLength:99,realignmentQueueLength:2}};
});
afterEach(cleanup);
const show=()=>render(<MemoryRouter><LanguageProvider><RealignPage/></LanguageProvider></MemoryRouter>);
async function validForm(){const user=userEvent.setup();await user.type(screen.getByLabelText('Job name'),'valid-task');await user.upload(screen.getByLabelText('Aligned FASTA file'),aligned);return user;}
it('shows dedicated queue, default order, and waits for a valid file',()=>{
 show();expect(screen.getByRole('button',{name:'Submit Realignment'})).toBeDisabled();expect(screen.queryByText(/99/)).not.toBeInTheDocument();
 expect(screen.getByText(/2 jobs/)).toBeVisible();
 expect(document.querySelector('#realignPattern')).toHaveValue('1');expect(document.querySelector('details')).not.toHaveAttribute('open');
});
it('validates task name and email before posting',async()=>{
 show();const user=userEvent.setup();await user.upload(screen.getByLabelText('Aligned FASTA file'),aligned);
 await user.type(screen.getByLabelText(/Notification email|Email/i),'bad-email');await user.click(screen.getByRole('button',{name:'Submit Realignment'}));
 expect(await screen.findAllByRole('alert')).toHaveLength(2);expect(mocks.submit).not.toHaveBeenCalled();
});
it('keeps values after failure and clears the old error on replacement',async()=>{
 mocks.submit.mockRejectedValueOnce(new EasyMsaApiError({code:'REALIGN_UNALIGNED_INPUT',message:'Unequal alignment rows.'}));
 show();const user=await validForm();await user.click(screen.getByRole('button',{name:'Submit Realignment'}));
 expect(await screen.findByRole('alert')).toHaveTextContent('Unequal alignment rows.');expect(screen.getByLabelText('Job name')).toHaveValue('valid-task');expect(screen.getAllByText('aligned.fa')[0]).toBeVisible();
 await user.upload(screen.getByLabelText('Aligned FASTA file'),new File(['>a\nAC\n>b\nAC\n'],'another.fa'));expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('posts once while busy and navigates after success',async()=>{
 let complete!:(value:unknown)=>void;mocks.submit.mockImplementationOnce(()=>new Promise(resolve=>{complete=resolve;}));
 const {container}=show();const user=await validForm();fireEvent.submit(container.querySelector('form')!);fireEvent.submit(container.querySelector('form')!);
 await waitFor(()=>expect(mocks.submit).toHaveBeenCalledTimes(1));expect(screen.getByLabelText('Job name')).toBeDisabled();
 expect(mocks.submit).toHaveBeenCalledWith(aligned,'valid-task',1,'en','');
 complete({jobId:'valid-task',token:'test-token'});await waitFor(()=>expect(mocks.navigate).toHaveBeenCalledTimes(1));
});
it.each(['pending','offline','disabled','unavailable'])('blocks submission when %s',state=>{
 if(state==='pending')mocks.health.isPending=true;
 if(state==='offline')mocks.health.isError=true;
 if(state==='disabled')mocks.health.data.realignment.enabled=false;
 if(state==='unavailable')mocks.health.data.realignment.available=false;
 show();const submit=screen.queryByRole('button',{name:'Submit Realignment'});if(submit)expect(submit).toBeDisabled();expect(mocks.submit).not.toHaveBeenCalled();
});
