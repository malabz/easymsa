import {expect,test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(readFileSync('public/benchmark/datasets-manifest.json','utf8'));
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('easymsa.locale','en'));await page.route('**/api/**',route=>route.abort());});

test('real DNA and RNA FASTA downloads match the evaluated inputs',async({page})=>{
 for(const id of ['dna_16s_100','rna_255','dna_mt_100']){
  await page.goto('/#/benchmark/datasets/'+id);
  const menu=page.getByTestId('dataset-download-controls');await menu.locator(':scope > summary').click();
  await expect(menu.getByText(/CSV|JSON/)).toHaveCount(0);
  const event=page.waitForEvent('download');await menu.getByRole('link',{name:'Download FASTA',exact:true}).click();
  const download=await event;expect(download.suggestedFilename()).toBe(id+'.fasta');
  const bytes=readFileSync((await download.path())!),entry=manifest.files.find((item:any)=>item.id===id);
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(entry.sha256);
  expect(bytes.toString('utf8').split(/\r?\n/).filter(line=>line.startsWith('>'))).toHaveLength(entry.sequence_count);
 }
});

test('overview downloads the full FASTA ZIP and keeps the selector within the current filter',async({page})=>{
 await page.goto('/#/benchmark?type=rna');const menu=page.getByTestId('dataset-download-controls');
 await menu.locator(':scope > summary').click();await expect(menu.getByRole('option')).toHaveCount(6);
 await menu.getByLabel('Dataset',{exact:true}).selectOption('rna_8191');
 await expect(menu.getByRole('link',{name:'Download FASTA',exact:true})).toHaveAttribute('href',/rna_8191.fasta$/);
 const event=page.waitForEvent('download');await menu.getByRole('link',{name:/All.*ZIP/}).click();
 const bytes=readFileSync((await(await event).path())!);
 expect(createHash('sha256').update(bytes).digest('hex')).toBe(manifest.archive.sha256);
 await page.keyboard.press('Escape');await expect(menu).not.toHaveAttribute('open','');
 await expect(menu.locator(':scope > summary')).toBeFocused();
 await menu.locator(':scope > summary').click();await page.locator('h1').click();
 await expect(menu).not.toHaveAttribute('open','');
});

test('public and example details show one resource ceiling and separate dataset and result downloads',async({page})=>{
 for(const example of [false,true]){
  await page.goto(example?'/#/benchmark/examples/msa-kit':'/#/benchmark/datasets/rna_255');
  const details=example?page.locator('.comparison-experiment'):page.getByTestId('experiment-details');
  await details.locator(':scope > summary').click();
  await expect(details.getByTestId('resource-ceiling')).toHaveText('Benchmark resource ceiling: 4 CPU · 32 GiB · 30 min per dataset');
  await expect(details).not.toContainText(/16\s*(GiB|GB)|Memory retry|Adapter repair/);
  await expect(page.getByTestId('dataset-download-controls').locator(':scope > summary')).toHaveText('Download data');
  const results=page.getByTestId(example?'comparison-downloads':'download-controls');
  await expect(results.locator(':scope > summary')).toContainText(example?'Export results':'Download dataset results');
 }
});
