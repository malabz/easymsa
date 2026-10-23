import {expect,test} from '@playwright/test';
import {zipSync,strToU8} from 'fflate';
import {prepareViewerPage,loadViewerFasta,expectNoHorizontalOverflow} from './helpers/viewer-fixtures';

test.beforeEach(async({page})=>prepareViewerPage(page));
test('narrow motif controls and export actions remain in the viewport in both languages',async({page})=>{
  for(const locale of ['en','zh']) for(const width of [360,390]) {
    await page.setViewportSize({width,height:800});
    await page.goto('./');await page.evaluate(locale=>localStorage.setItem('easymsa.locale',locale),locale);
    await page.goto('./#/examples/alignment-small?tab=alignment');await page.reload();
    await expect(page.locator('[data-msa-status]')).toHaveAttribute('data-msa-analysis-status','ready');
    const mode=page.locator('.msa-search > select');await mode.selectOption('motif');
    await page.getByRole('searchbox').fill('ATG');
    const nav=page.locator('.msa-motif-nav'), compare=page.locator('.msa-command > button').first();
    await expect(nav).toBeVisible();
    const a=await nav.boundingBox(),b=await compare.boundingBox();
    expect(a&&b&&Math.max(a.y,b.y)>=Math.min(a.y+a.height,b.y+b.height)).toBeTruthy();
    await page.locator('.msa-export-menu > summary').click();
    const box=await page.locator('.msa-export-menu .msa-popup').boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width);expect(box!.y+box!.height).toBeLessThanOrEqual(800);
    await page.keyboard.press('Escape');await expect(page.locator('.msa-export-menu')).not.toHaveAttribute('open','');
    await expect(page.locator('.msa-export-menu > summary')).toBeFocused();
    await expectNoHorizontalOverflow(page);
    await mode.selectOption('name');await expect(page.locator('.msa-search-feedback')).toContainText('ATG');
    await page.reload();await expect(page.locator('.msa-search > select')).toHaveValue('motif');
    await expect(page.getByRole('searchbox')).toHaveValue('ATG');
  }
});
test('mobile restoration hides desktop overview, has contextual help and touch instructions',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await page.goto('./#/examples/alignment-small?tab=alignment');
  await expect(page.locator('.msa-global-overview')).toBeVisible();
  await page.setViewportSize({width:390,height:844});await page.reload();
  await expect(page.locator('[data-msa-status]')).toHaveAttribute('data-msa-analysis-status','ready');
  await expect(page.locator('.msa-global-overview')).toHaveCount(0);
  await expect(page.locator('.msa-source-actions a')).toHaveAttribute('href',/#\/docs\?section=msa-viewer/);
  await page.getByRole('button',{name:'Check',exact:true}).click();
  await expect(page.getByRole('dialog')).toContainText('Turn on region selection');
  await expect(page.getByRole('dialog')).not.toContainText('Shift');
});
test('sequence check tools and pagination stay visible while only the list scrolls',async({page})=>{
  await page.setViewportSize({width:360,height:800});
  const fasta=Array.from({length:255},(_,i)=>`>sample-${i} full description\nACGT-ACG`).join('\n');
  await loadViewerFasta(page,fasta);
  await page.getByRole('button',{name:'Check',exact:true}).click();await page.getByRole('tab',{name:'Sequence checks'}).click();
  const panel=page.locator('[data-msa-qc-panel]');
  for(const name of ['Check rules','Filter this list','Distributions','Expand full table','Next page']) {
    const control=panel.getByRole('button',{name,exact:true}),box=await control.boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(800);
  }
  const list=panel.locator('.msa-check-list');expect(await list.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
  for(let i=0;i<5;i++)await panel.getByRole('button',{name:'Next page'}).click();await expect(list).toContainText('sample-254');
  await panel.getByRole('button',{name:'Distributions',exact:true}).click();await expect(page.getByRole('dialog',{name:'Distributions'}).getByRole('figure').first()).toBeVisible();
  await page.keyboard.press('Escape');await expect(panel.getByRole('button',{name:'Distributions',exact:true})).toBeFocused();
});
test('mobile results put result actions first and hide empty preprocessing metadata',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('./#/examples/alignment-small');
  const alignment=page.getByRole('tab',{name:'Alignment',exact:true});await expect(alignment).toBeVisible();
  expect((await alignment.boundingBox())!.y).toBeLessThan(350);
  await expect(page.locator('.result-information')).not.toHaveAttribute('open','');
  await expect(page.locator('.result-information')).not.toContainText('Original sequences');
  await page.getByRole('tab',{name:'Downloads',exact:true}).click();
  const download=page.getByRole('button',{name:/Download alignment-small-final-.*zip/});await expect(download).toBeVisible();
  const pending=page.waitForEvent('download');await download.click();expect((await pending).suggestedFilename()).toContain('alignment-small-final-');
});
test('task ZIP backup imports directly and reports invalid entries without exposing keys',async({page})=>{
  await page.route('**/api/jobs/Test-recovery*',route=>route.fulfill({json:{job_id:'Test-recovery',status:'completed',created_at:'2026-10-23T00:00:00Z'}}));
  await page.goto('./#/lookup');
  const record={app:'easymsa',version:1,jobId:'Test-recovery',token:'test-only-hidden-key',statusUrl:'/ignored',createdAt:'2026-10-23T00:00:00Z'};
  const buffer=Buffer.from(zipSync({'test.json':strToU8(JSON.stringify(record)),'invalid.json':strToU8('{}')}));
  await page.locator('input[type=file]').setInputFiles({name:'easymsa-job-recovery.zip',mimeType:'application/zip',buffer});
  const dialog=page.getByRole('dialog',{name:'Import task backup'});await expect(dialog).toContainText('Test-recovery');await expect(dialog).not.toContainText(record.token);
  await dialog.getByRole('button',{name:'Verify and import'}).click();await expect(dialog).toContainText('Imported');await expect(dialog).toContainText('Invalid file contents');
  await dialog.getByRole('button',{name:'Done'}).click();await expect(page.locator('.lookup-rows')).toContainText('Test-recovery');
});
test('shared navigation stays fixed and restored labels, help and ICP are present',async({page})=>{
  await page.setViewportSize({width:1280,height:720});let initial:number|undefined;
  for(const route of ['submit','realign','lookup','viewer','docs','about','license','privacy']) {
    await page.goto(`./#/${route}`);await expect(page.locator('[data-route-loading]')).toHaveCount(0);
    const box=await page.locator('.app-header-inner').boundingBox();if(initial===undefined)initial=box!.x;expect(box!.x).toBe(initial);
    await expect(page.locator('.app-footer').getByRole('link',{name:'冀ICP备2026045022号'})).toHaveAttribute('href','https://beian.miit.gov.cn/');
    await expectNoHorizontalOverflow(page);
  }
});

test('large character matrix paints bases and keeps selection, range and keyboard coordinates',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  const fasta=Array.from({length:1000},(_,i)=>`>canvas-${i} full header\n${'ACGT'.repeat(250)}`).join('\n');
  await loadViewerFasta(page,fasta);
  await page.getByRole('button',{name:'Full screen',exact:true}).click();
  const canvas=page.locator('[data-msa-canvas-characters=true]'),grid=page.locator('[data-msa-scroll-viewport]');
  await expect(canvas).toBeVisible();
  expect(await page.locator('[data-msa-sequence-cell]').count()).toBeLessThan(120);
  const pitch=Number(await canvas.getAttribute('data-msa-cell-pitch'));
  const rowHeight=Number(await canvas.getAttribute('data-msa-row-height'));
  await canvas.click({position:{x:12+3.5*pitch,y:rowHeight/2}});
  let active=await grid.getAttribute('aria-activedescendant');
  await expect(page.locator(`[id="${active}"]`)).toContainText('canvas-0 full header; Position 4; T');
  await grid.press('ArrowRight');active=await grid.getAttribute('aria-activedescendant');
  await expect(page.locator(`[id="${active}"]`)).toContainText('Position 5; A');
  await canvas.click({position:{x:12+8.5*pitch,y:rowHeight/2},modifiers:['Shift']});
  await expect(page.locator('[data-msa-status]')).toContainText('5–9');
  const colors=await canvas.evaluate(el=>{
    const c=el as HTMLCanvasElement,ctx=c.getContext('2d')!,ratio=c.width/c.getBoundingClientRect().width;
    return Array.from({length:4},(_,i)=>Array.from(ctx.getImageData(Math.round((13+i*Number(c.dataset.msaCellPitch))*ratio),Math.round(2*ratio),1,1).data));
  });
  expect(new Set(colors.map(color=>color.join(','))).size).toBe(4);
  await grid.evaluate(el=>{el.scrollTop=1000;el.scrollLeft=280;});
  await expect.poll(()=>grid.evaluate(el=>el.scrollTop)).toBe(1000);
  await canvas.click({position:{x:12+1.5*pitch,y:rowHeight/2}});active=await grid.getAttribute('aria-activedescendant');
  await expect(page.locator(`[id="${active}"]`)).toContainText('canvas-50 full header; Position 22; C');
});
