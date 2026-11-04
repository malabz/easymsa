import "@testing-library/jest-dom/vitest";
import {cleanup,fireEvent,render,screen,within} from "@testing-library/react";
import {afterEach,describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {DatasetDownloads,fastaDownloadUrl} from "./DatasetDownloads";
import {ExperimentDetails} from "./ExperimentDetails";
import {parseSnapshot} from "./model";
import {websiteSnapshot} from "./website";
const snapshot=websiteSnapshot(parseSnapshot(JSON.parse(readFileSync('public/benchmark/snapshot.json','utf8'))));
afterEach(cleanup);
describe('dataset and result downloads',()=>{
 it.each(['en','zh'] as const)('offers FASTA rather than report formats in %s',locale=>{
  const dataset=snapshot.catalog.datasets.find(item=>item.id==='rna_255')!;
  render(<DatasetDownloads version={snapshot.catalog.version} datasets={[dataset]} datasetId={dataset.id} locale={locale}/>);
  fireEvent.click(screen.getByText(locale==='zh'?'下载数据':'Download data'));
  const link=screen.getByRole('link',{name:locale==='zh'?'下载 FASTA':'Download FASTA'});
  expect(link).toHaveAttribute('href',expect.stringContaining('/rna_255.fasta'));expect(link).toHaveAttribute('download','rna_255.fasta');
  expect(screen.queryByText(/JSON|CSV/)).not.toBeInTheDocument();
 });
 it('selects only the filtered datasets and offers the full FASTA archive separately',()=>{
  const datasets=snapshot.catalog.datasets.filter(item=>item.sequence_type==='rna');
  render(<DatasetDownloads version={snapshot.catalog.version} datasets={datasets} locale="en"/>);
  fireEvent.click(screen.getByText('Download data'));expect(screen.getAllByRole('option')).toHaveLength(6);
  fireEvent.change(screen.getByLabelText('Dataset'),{target:{value:'rna_8191'}});
  expect(screen.getByRole('link',{name:'Download FASTA'})).toHaveAttribute('href',expect.stringContaining('/rna_8191.fasta'));
  expect(screen.getByRole('link',{name:'All datasets (ZIP)'})).toHaveAttribute('href',expect.stringContaining('/all-inputs.zip'));
 });
 it('does not invent downloads for other data versions or unrecognized IDs',()=>{
  expect(fastaDownloadUrl('other','rna_255')).toBeNull();expect(fastaDownloadUrl(snapshot.catalog.version,'../config')).toBeNull();
  expect(fastaDownloadUrl(snapshot.catalog.version,'rna_256')).toBeNull();
 });
 it.each(['en','zh'] as const)('shows one 32 GiB ceiling without old source headings and keeps raw observations in %s',locale=>{
  const original=JSON.stringify(snapshot);
  render(<ExperimentDetails snapshot={snapshot} batches={snapshot.batches} locale={locale}/>);
  fireEvent.click(screen.getByText(locale==='zh'?'实验详情':'Experiment details'));
  const details=screen.getByTestId('experiment-details');expect(within(details).getByTestId('resource-ceiling')).toHaveTextContent('32 GiB');
  expect(details.textContent).not.toMatch(/16\s*(GiB|GB)|内存重测|适配修复|Memory retry|Adapter repair/);
  expect(within(details).getByText(locale==='zh'?'导出成绩':'Export results')).toBeVisible();
  expect(JSON.stringify(snapshot)).toBe(original);
 });
});
