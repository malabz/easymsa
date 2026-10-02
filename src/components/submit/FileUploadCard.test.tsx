import '@testing-library/jest-dom/vitest';
import {useState} from 'react';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {LanguageProvider} from '../../lib/i18n/LanguageProvider';
import {FileUploadCard} from './FileUploadCard';
import {MAX_INPUT_FILE_SIZE_BYTES,validateInputFile} from '../../lib/utils/fileValidation';

beforeEach(()=>localStorage.setItem('easymsa.locale','en'));
afterEach(cleanup);
function Harness({variant='realignment',disabled=false}:{variant?:'alignment'|'realignment';disabled?:boolean}) {
 const [file,setFile]=useState<File|null>(null);
 return <LanguageProvider><FileUploadCard file={file} onChange={setFile} variant={variant} disabled={disabled}/></LanguageProvider>;
}
const file=(name='aligned.fa')=>new File(['>a\nAC-G\n>b\nACCG\n'],name);
describe('upload validation',()=>{
 it.each(['.fa','.fas','.fasta','.fna','.aln','.fa.gz','.fas.gz','.fasta.gz','.fna.gz','.aln.gz'])('accepts %s',ext=>expect(validateInputFile(file('a'+ext),'realignment').valid).toBe(true));
 it.each(['.zip','.txt','.fasta.xz','.gz','.faa'])('rejects %s for realignment',ext=>expect(validateInputFile(file('a'+ext),'realignment').valid).toBe(false));
 it('preserves ordinary archive support',()=>expect(validateInputFile(file('a.zip')).valid).toBe(true));
 it('rejects empty and oversized files with localized errors',()=>{
  expect(validateInputFile(new File([],'a.fa'),'realignment','zh').errors).toEqual(['文件为空，请重新选择。']);
  const large=file();Object.defineProperty(large,'size',{value:MAX_INPUT_FILE_SIZE_BYTES+1});
  expect(validateInputFile(large,'realignment').valid).toBe(false);
  const boundary=file();Object.defineProperty(boundary,'size',{value:MAX_INPUT_FILE_SIZE_BYTES});expect(validateInputFile(boundary,'realignment').valid).toBe(true);
 });
});
it('selects, replaces, removes, and reselects the same file',async()=>{
 render(<Harness/>);const user=userEvent.setup();const input=screen.getByLabelText('Aligned FASTA file') as HTMLInputElement;
 const selected=file();await user.upload(input,selected);
 expect(screen.getByText(selected.name)).toBeVisible();expect(screen.getByText(/Sequence content will be validated/)).toBeVisible();
 expect(input.value).toBe('');await user.upload(input,file('replaced.fa'));expect(screen.queryByText('aligned.fa')).not.toBeInTheDocument();
 await user.click(screen.getByRole('button',{name:'Remove'}));expect(screen.getByText('No file selected.')).toBeVisible();
 await user.upload(input,selected);expect(screen.getByText(selected.name)).toBeVisible();
});
it('checks dropped files and clears errors when replaced',()=>{
 render(<Harness/>);const drop=screen.getByText('Choose or drop an aligned file').parentElement!;
 fireEvent.dragEnter(drop);expect(screen.getByText('Drop the file here')).toBeVisible();
 fireEvent.drop(drop,{dataTransfer:{files:[file('invalid.zip')]}});expect(screen.getByRole('alert')).toHaveTextContent('Unsupported file type.');
 fireEvent.drop(drop,{dataTransfer:{files:[file()]}});expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
it('ignores file drops when disabled',()=>{
 render(<Harness disabled/>);const drop=screen.getByText('Choose or drop an aligned file').parentElement!;
 fireEvent.drop(drop,{dataTransfer:{files:[file()]}});expect(screen.getByText('No file selected.')).toBeVisible();expect(screen.getByRole('button',{name:'Choose file'})).toBeDisabled();
});
it('preserves the ordinary file input id',()=>{
 const {container}=render(<Harness variant="alignment"/>);expect(container.querySelector('#inputFile')).toBeInTheDocument();expect(container.querySelector('#alignedFile')).not.toBeInTheDocument();
});
