import { expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { parseRecoveryBackup } from './recoveryBackup';

const record = { app:'easymsa',version:1,jobId:'Test-one',token:'test-only-key',statusUrl:'/unused',createdAt:'2026-10-23T00:00:00Z' };
it('round trips exported JSON entries, preserves duplicate feedback and rejects invalid entries', () => {
  const bytes=zipSync({'one.json':strToU8(JSON.stringify(record)),'two.json':strToU8(JSON.stringify(record)),'bad.json':strToU8('{}'),'readme.txt':strToU8('ignore')});
  const parsed=parseRecoveryBackup(bytes); expect(parsed).toHaveLength(3);
  expect(parsed[0].access?.jobId).toBe('Test-one'); expect(parsed[1].duplicate).toBe(true); expect(parsed[2].access).toBeUndefined();
});
it('bounds compressed and expanded archives before using credentials', () => {
  expect(()=>parseRecoveryBackup(new Uint8Array(8*1024*1024+1))).toThrow('RECOVERY_TOO_LARGE');
  expect(()=>parseRecoveryBackup(zipSync({'large.json':new Uint8Array(128*1024+1)}))).toThrow('RECOVERY_TOO_LARGE');
  expect(()=>parseRecoveryBackup(zipSync({'readme.txt':strToU8('empty')}))).toThrow('RECOVERY_EMPTY');
});
it('does not treat archive paths or record status URLs as navigation instructions', () => {
  const parsed=parseRecoveryBackup(zipSync({'../../sample.json':strToU8(JSON.stringify({...record,statusUrl:'https://invalid.example/'})), 'bad.json':strToU8(JSON.stringify({...record,jobId:'../invalid'}))}));
  expect(parsed[0].name).toBe('Test-one'); expect(parsed[1].access).toBeUndefined();
});
