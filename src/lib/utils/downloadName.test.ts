import {expect,it} from 'vitest';
import {downloadStem,resultFilename} from './downloadName';
it('names stages distinctly and keeps Unicode descriptions safe',()=>{
  expect(resultFilename('示例: DNA/one.fasta','initial','all_results.zip')).toBe('示例--DNA-one-initial-all_results.zip');
  expect(resultFilename('demo','initial','alignment.fasta')).not.toBe(resultFilename('demo','refined','alignment.fasta'));
  expect(downloadStem('../')).toBe('easymsa'); expect(downloadStem('A'.repeat(300))).toHaveLength(80);
});
