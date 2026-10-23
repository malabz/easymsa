import {describe,expect,it} from 'vitest';
import {measureAlignmentText} from './alignmentSize';
describe('alignment size preview',()=>{
 it('counts gaps and wrapped columns for the combined limit',()=>{
  expect(measureAlignmentText('>a description\r\nAC-G\r\nTT\r\n>b\r\nACGGTT\r\n')).toEqual({rows:2,cells:12,minColumns:6,maxColumns:6});
 });
 it('exposes unequal and empty records without claiming validation',()=>{
  expect(measureAlignmentText('>a\nACGT\n>b\n')).toEqual({rows:2,cells:4,minColumns:0,maxColumns:4});
 });
 it('does not label text without headers as an alignment',()=>expect(measureAlignmentText('ACGT')).toBeNull());
});
