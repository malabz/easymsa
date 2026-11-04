import {expect,test,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import type {BenchmarkSnapshot,MetricKey,BenchmarkMetric} from '../src/features/benchmark/model';
import {expectedRecords,expectedWebsiteSnapshot} from './helpers/benchmark-consistency';
import {assertDownloads,assertScatter,assertTable,realExample} from './helpers/comparison-expectations';

const publicScores=expectedWebsiteSnapshot(JSON.parse(readFileSync('public/benchmark/snapshot.json','utf8')) as BenchmarkSnapshot);
const metrics:MetricKey[]=['wall_seconds','max_rss_kib','scaled_sp','q','tc'];
const raw=(metric:BenchmarkMetric|undefined)=>metric&&['complete','partial'].includes(metric.status)?String(metric.value??metric.mean):'';

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('easymsa.locale','en'));
  // No production submission, cancellation, email or worker request can escape.
  await page.route('**/api/**',route=>route.abort());
});
async function settle(page:Page){await page.evaluate(async()=>{
  await document.fonts.ready;
  // The global navigation highlight can be paused outside its active surface.
  // Its completion is not a prerequisite for a stable report screenshot.
  await Promise.race([new Promise(resolve=>setTimeout(resolve,1000)),Promise.all(document.getAnimations().filter(a=>a.playState==='running'&&a.effect?.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))]);
});}
async function fits(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
async function publicTableMatches(page:Page,datasetId:string){
  const table=page.getByTestId('precise-results');await expect(table).toBeVisible();
  const cells=await table.locator('td[data-metric]').evaluateAll(nodes=>nodes.map(node=>({method:node.getAttribute('data-method'),metric:node.getAttribute('data-metric'),raw:node.getAttribute('data-raw-value')})));
  expect(cells).toHaveLength(publicScores.methods.length*5);
  const records=expectedRecords(publicScores,'latest');
  for(const method of publicScores.methods)for(const metric of metrics){
    const expected=records.find(row=>row.result.dataset_id===datasetId&&row.result.method_id===method.id);
    expect(cells.find(cell=>cell.method===method.id&&cell.metric===metric)?.raw,`${datasetId}/${method.id}/${metric}`).toBe(raw(expected?.result.metrics[metric]));
  }
}

test('the overview opens a report with time, memory and every quality metric together',async({page},info)=>{
  await page.goto('/#/benchmark');
  await expect(page.getByTestId('method-summary')).toBeVisible();
  await expect(page.getByTestId('benchmark-matrix')).toBeVisible();
  await page.locator('.benchmark-matrix tr[data-dataset-id="rna_255"] .benchmark-matrix-dataset a').click();
  await expect(page.getByTestId('dataset-title')).toHaveAttribute('data-dataset-id','rna_255');
  await expect(page.getByTestId('tradeoff-chart')).toHaveCount(2);await publicTableMatches(page,'rna_255');
  for(const datasetId of ['rna_255','dna_mt_10k']){
    await page.goto('/#/benchmark/datasets/'+datasetId);
    await expect(page.getByTestId('dataset-title')).toHaveAttribute('data-dataset-id',datasetId);
    const plots=page.getByTestId('tradeoff-chart');await expect(plots).toHaveCount(2);
    expect(await plots.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-x-key')))).toEqual(['wall_seconds','max_rss_kib']);
    for(const plot of await plots.all()){
      await expect(plot).toBeVisible();
      await expect(plot).toHaveAttribute('data-y-key',datasetId==='rna_255'?'q':'scaled_sp');
    }
    await publicTableMatches(page,datasetId);
    if((page.viewportSize()?.width??1440)<700){
      const wrapper=page.getByTestId('precise-results').locator('.benchmark-table-scroll'),time=page.getByTestId('precise-results').locator('td[data-metric="wall_seconds"]').first();
      const bounds=await wrapper.boundingBox(),cell=await time.locator('div > span').boundingBox();
      expect(cell!.x).toBeGreaterThanOrEqual(bounds!.x-1);
      expect(cell!.x+cell!.width,'the first resource value should be visible before horizontal panning').toBeLessThanOrEqual(bounds!.x+bounds!.width+1);
    }
    for(const name of ['Trade-off','Metric plots','Values'])await expect(page.getByRole('button',{name,exact:true})).toHaveCount(0);
    await fits(page);
  }
  await settle(page);await page.screenshot({path:info.outputPath('all-metrics-report-en.png'),fullPage:true});
  await page.getByRole('button',{name:'Switch language',exact:true}).click();
  await expect(page.locator('html')).toHaveAttribute('lang','zh-CN');await publicTableMatches(page,'dna_mt_10k');await fits(page);
  await settle(page);await page.screenshot({path:info.outputPath('all-metrics-report-zh.png'),fullPage:true});
});

test('tables use the document for vertical scrolling and only local horizontal overflow',async({page},info)=>{
  for(const [url,selector] of [
    ['/#/benchmark?view=matrix','.benchmark-matrix-scroll'],
    ['/#/benchmark/datasets/rna_255','.benchmark-table-scroll'],
    ['/#/benchmark/examples/msa-kit','.comparison-table-scroll'],
    ['/#/benchmark/examples/msa-kit?view=matrix','.comparison-table-scroll'],
  ]){
    await page.goto(url);const wrapper=page.locator(selector).first();await expect(wrapper).toBeVisible();
    const dimensions=await wrapper.evaluate(element=>({scroll:element.scrollHeight,client:element.clientHeight,top:element.scrollTop}));
    expect(dimensions.scroll,`${url}: the table must not have an inner vertical range`).toBeLessThanOrEqual(dimensions.client+1);
    expect(dimensions.top).toBe(0);await fits(page);
  }
  await page.goto('/#/benchmark?view=matrix');const matrix=page.locator('.benchmark-matrix-scroll');await expect(matrix).toBeVisible();
  await matrix.locator('tbody tr').nth(1).hover();const before=await page.evaluate(()=>scrollY);
  await page.mouse.wheel(0,420);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(before+100);
  expect(await matrix.evaluate(node=>node.scrollTop)).toBe(0);
  await settle(page);await page.screenshot({path:info.outputPath('single-page-scroll-matrix.png'),fullPage:false});
});

test('switching datasets keeps the report mounted and never blanks or refetches it',async({page},info)=>{
  let snapshots=0;
  await page.route('**/benchmark/snapshot.json',async route=>{snapshots++;await new Promise(resolve=>setTimeout(resolve,200));await route.continue();});
  await page.goto('/#/benchmark/datasets/rna_255');await expect(page.getByTestId('dataset-title')).toHaveAttribute('data-dataset-id','rna_255');
  await settle(page);expect(snapshots).toBe(1);
  await page.evaluate(()=>{
    const root=document.querySelector('.benchmark-studio')!,sidebar=root.querySelector('[data-testid="dataset-sidebar"]');
    (window as any).__readingProbe={root,sidebar,samples:[]};
    (window as any).__readingProbeDone=new Promise<void>(resolve=>{
      let count=0;const frame=()=>{
        const probe=(window as any).__readingProbe,now=document.querySelector('.benchmark-studio');
        probe.samples.push({same:now===probe.root,sidebarSame:now?.querySelector('[data-testid="dataset-sidebar"]')===probe.sidebar,
          title:!!now?.querySelector('[data-testid="dataset-title"]'),loading:!!document.querySelector('[data-route-loading],.benchmark-state'),opacity:now?Number(getComputedStyle(now).opacity):0});
        if(++count<40)requestAnimationFrame(frame);else resolve();
      };requestAnimationFrame(frame);
    });
  });
  await page.locator('.benchmark-neighbours').getByRole('link',{name:'Next',exact:true}).click();
  await expect(page.getByTestId('dataset-title')).toHaveAttribute('data-dataset-id','rna_511');
  await page.evaluate(()=>(window as any).__readingProbeDone);
  const samples=await page.evaluate(()=>(window as any).__readingProbe.samples);
  expect(samples).toHaveLength(40);
  expect(samples.every((sample:any)=>sample.same&&sample.sidebarSame&&sample.title&&!sample.loading&&sample.opacity>=.99)).toBe(true);
  expect(snapshots).toBe(1);await publicTableMatches(page,'rna_511');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('.benchmark-neighbours').getByRole('link',{name:'Previous',exact:true}).click();
  await expect(page.getByTestId('dataset-title')).toHaveAttribute('data-dataset-id','rna_255');
  await publicTableMatches(page,'rna_255');expect(snapshots).toBe(1);
  await info.attach('dataset-continuity.json',{contentType:'application/json',body:JSON.stringify({snapshotRequests:snapshots,samples})});
});

test('the example table, both plots and real downloads use the same observations',async({page},info)=>{
  const report=realExample();
  for(const datasetId of ['rna_255','dna_mt_10k','rna_8191']){
    await page.goto('/#/benchmark/examples/msa-kit?dataset='+datasetId);
    await expect(page.getByTestId('comparison-root')).toHaveAttribute('data-dataset-id',datasetId);
    await assertScatter(page,report,datasetId);await assertTable(page,report,datasetId);
    expect(await page.getByRole('button',{name:'Values',exact:true}).count()).toBe(0);
    await assertDownloads(page,report,datasetId);await fits(page);
  }
  await assertDownloads(page,report);
  await page.getByTestId('comparison-downloads').locator('summary').click();
  await settle(page);await page.screenshot({path:info.outputPath('single-page-example.png'),fullPage:true});
});
