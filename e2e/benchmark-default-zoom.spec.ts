import {expect,test} from '@playwright/test';
for(const example of [false,true])test(`quality zoom defaults on and preserves explicit off: ${example?'example':'public'}`,async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('easymsa.locale','en'));
 await page.route('**/api/**',route=>route.abort());
 await page.goto(example?'/#/benchmark/examples/msa-kit':'/#/benchmark/datasets/rna_255');
 const chart=page.getByTestId(example?'comparison-scatter':'tradeoff-chart');
 const zoom=page.getByRole('checkbox',{name:'Zoom Q / TC differences',exact:true});
 await expect(zoom).toBeChecked();
 for(const plot of await chart.all())expect(Number(await plot.getAttribute('data-y-min'))).toBeGreaterThan(0);
 await page.getByRole('combobox',{name:'Vertical axis',exact:true}).selectOption('tc');
 await expect(zoom).toBeChecked();
 for(const plot of await chart.all())await expect(plot).toHaveAttribute('data-y-key','tc');
 const table=page.getByTestId(example?'comparison-table':'precise-results');
 const original=await table.locator('[data-raw-value]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-raw-value')));
 await zoom.click();await expect(zoom).not.toBeChecked();await expect(page).toHaveURL(/zoom=0/);
 await page.reload();await expect(zoom).not.toBeChecked();
 for(const plot of await chart.all()){await expect(plot).toHaveAttribute('data-y-min','0');await expect(plot).toHaveAttribute('data-y-max','1');}
 expect(await table.locator('[data-raw-value]').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('data-raw-value')))).toEqual(original);
 await zoom.click();await expect(zoom).toBeChecked();for(const plot of await chart.all())expect(Number(await plot.getAttribute('data-y-min'))).toBeGreaterThan(0);
 await page.reload();await expect(zoom).toBeChecked();
 for(const plot of await chart.all())expect(Number(await plot.getAttribute('data-y-min'))).toBeGreaterThan(0);
});
