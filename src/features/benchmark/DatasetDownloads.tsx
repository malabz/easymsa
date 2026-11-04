import {useEffect,useRef,useState} from "react";
import {Download} from "lucide-react";
import {datasetName} from "./names";
import type {BenchmarkDataset} from "./model";
import {useDismissDetails} from "./useDismissDetails";

export const downloadableVersion="frozen-colon-n-20261027";
export function fastaDownloadUrl(version:string,id?:string){
  if(version!==downloadableVersion || (id!==undefined&&!/^(dna_(16s|mt)_(100|1k|10k)|dna_mt_sim_(70|75|80|85|90|91|92|93|94|95|96|97|98|99)|rna_(255|511|1023|2047|4095|8191))$/.test(id)))return null;
  return `${import.meta.env.BASE_URL}benchmark/datasets/${version}/${id?`${id}.fasta`:"all-inputs.zip"}`;
}
export function DatasetDownloads({version,datasets,datasetId,locale}:{version:string;datasets:BenchmarkDataset[];datasetId?:string;locale:"en"|"zh"}){
  const [choice,setChoice]=useState("");
  const menu=useRef<HTMLDetailsElement>(null);
  useDismissDetails(menu);
  useEffect(()=>{if(menu.current)menu.current.open=false;},[datasetId]);
  const w=(en:string,zh:string)=>locale==="zh"?zh:en;
  const available=datasets.filter(item=>fastaDownloadUrl(version,item.id));
  const selected=available.find(item=>item.id===(datasetId??choice))??(!datasetId?available[0]:undefined);
  const url=selected?fastaDownloadUrl(version,selected.id):null;
  if(!url)return <span className="benchmark-caption">{w("Dataset download unavailable","数据集暂不可下载")}</span>;
  return <details className="benchmark-download-menu" data-testid="dataset-download-controls" ref={menu}>
    <summary><Download size={14} aria-hidden="true"/>{w("Download data","下载数据")}</summary>
    <div className="benchmark-download-panel">
      {!datasetId&&<label>{w("Dataset","数据集")}<select aria-label={w("Dataset","数据集")} value={selected!.id} onChange={event=>setChoice(event.target.value)}>{available.map(item=><option key={item.id} value={item.id}>{datasetName(item,locale)}</option>)}</select></label>}
      <p>{datasetName(selected!,locale)}</p>
      <div className="benchmark-downloads"><a href={url} download={`${selected!.id}.fasta`}>{w("Download FASTA","下载 FASTA")}</a>
      {!datasetId&&<a href={fastaDownloadUrl(version)!} download="easymsa-benchmark-fasta.zip">{w("All datasets (ZIP)","全部数据集（ZIP）")}</a>}</div>
    </div>
  </details>;
}
