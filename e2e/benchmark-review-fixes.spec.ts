import {expect,test} from '@playwright/test';

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('easymsa.locale','en'));
  await page.route('**/api/**',route=>route.abort());
});

test('real all-tied Q scores count every successful method without changing neutral matrix colours',async({page})=>{
  await page.goto('/#/benchmark?search=dna_mt_sim_99&metric=q');
  const summary=page.getByTestId('method-summary');await expect(summary).toBeVisible();
  for(const id of ['clustalo','mafft','halign4','fmalign2','minipoa']){
    await expect(summary.locator(`tr[data-method="${id}"] td[data-metric="q"]`)).toContainText('1 / 1');
    const cell=page.locator(`[data-testid="matrix-cell"][data-method-id="${id}"]`);
    await expect(cell).toHaveAttribute('data-raw-value','1');
    await expect(cell).toHaveAttribute('data-tone','neutral');
  }
  await expect(summary.locator('tr[data-method="muscle5"] td[data-metric="q"]')).toContainText('0 / 1');
});

test('metric explanations stay outside table scrolling, follow focus and dismiss with Escape',async({page})=>{
  await page.goto('/#/benchmark?methods=mafft');
  const summary=page.getByTestId('method-summary'),region=summary.locator('.benchmark-summary-scroll');
  await expect(summary).toBeVisible();
  const before=await region.evaluate(node=>({height:node.clientHeight,scroll:node.scrollHeight}));
  await summary.getByRole('button',{name:'Top normalized SP',exact:true}).focus();
  const tip=page.getByRole('tooltip').filter({hasText:'Datasets where it ranks first'});await expect(tip).toBeVisible();
  expect(await tip.evaluate(node=>Boolean(node.closest('.benchmark-summary-scroll')))).toBe(false);
  const after=await region.evaluate(node=>({height:node.clientHeight,scroll:node.scrollHeight}));
  expect(after).toEqual(before);expect(after.scroll).toBeLessThanOrEqual(after.height+1);
  const box=await tip.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.keyboard.press('Escape');await expect(tip).toHaveCount(0);
  await expect(summary.getByRole('button',{name:'Top normalized SP',exact:true})).toBeFocused();
});

test('mobile report keeps the first time number fully visible before horizontal panning',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  for(const language of ['en','zh']){
    await page.goto('/#/benchmark/datasets/rna_255');await expect(page.getByTestId('precise-results')).toBeVisible();
    if(language==='zh')await page.getByRole('button',{name:'Switch language',exact:true}).click();
    const region=page.getByTestId('precise-results').locator('.benchmark-table-scroll');
    const text=page.getByTestId('precise-results').locator('td[data-method="clustalo"][data-metric="wall_seconds"] div > span');
    await expect(text).toHaveText('39.24');
    const bounds=await region.boundingBox(),cell=await text.boundingBox();
    expect(cell!.x).toBeGreaterThanOrEqual(bounds!.x);expect(cell!.x+cell!.width).toBeLessThanOrEqual(bounds!.x+bounds!.width);
    expect(await region.evaluate(node=>node.scrollLeft)).toBe(0);
  }
});

test('enlarged overview text keeps horizontal overflow local and has no inner vertical scroll',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/#/benchmark');const matrix=page.getByTestId('benchmark-matrix');await expect(matrix).toBeVisible();
  await page.addStyleTag({content:'html{font-size:200%!important}'});
  const region=page.locator('.benchmark-matrix-scroll');
  await expect(region).toHaveAttribute('data-fits','false');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const dimensions=await region.evaluate(node=>({height:node.clientHeight,scrollHeight:node.scrollHeight,width:node.clientWidth,scrollWidth:node.scrollWidth}));
  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.width);
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.height+1);
  await region.evaluate(node=>node.scrollLeft=node.scrollWidth);
  expect(await region.evaluate(node=>node.scrollLeft)).toBeGreaterThan(0);
  const last=matrix.locator('tbody tr[data-dataset-id="rna_8191"] a[data-method-id="minipoa"]');
  await last.focus();await expect(last).toBeFocused();
});
