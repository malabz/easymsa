import { Link } from "react-router-dom";
import type { BenchmarkSnapshot } from "./model";
import { datasetGroup } from "./BenchmarkMatrix";
import { words, type Locale } from "./presentation";
import { methods as existingMethods } from "../../lib/methods";

const roles: Record<string, [string,string]> = {
  clustalo:["General-purpose progressive alignment","通用渐进多序列比对"],
  muscle5:["General-purpose alignment and refinement","通用比对与精化"],
  mafft:["General-purpose progressive and iterative alignment","通用渐进与迭代比对"],
  halign3:["Clustering-based alignment for similar sequences","面向相似序列的聚类比对"],
  halign4:["Large-scale nucleotide alignment","大规模核酸比对"],
  halign5:["Large-scale nucleotide alignment","大规模核酸比对"],
  minipoa:["Partial-order alignment","部分序列图比对"],
  fmalign2:["Anchoring for long nucleotide sequences","面向长核酸序列的锚定比对"],
  wmsa2:["DNA / RNA alignment","DNA / RNA 比对"]
};
const sources:Record<string,string>={clustalo:"https://www.ebi.ac.uk/jdispatcher/docs/faqs/clustal/",mafft:"https://mafft.cbrc.jp/alignment/software/",muscle5:"https://pub.drive5.com/muscle5/",halign4:"https://github.com/pinglu-zhang/HAlign-4",minipoa:existingMethods.find(method=>method.name==="MiniPOA")!.source,fmalign2:existingMethods.find(method=>method.name==="FMAlign2 + MAFFT")!.source};
export function BenchmarkIntroduction({snapshot,locale}:{snapshot:BenchmarkSnapshot;locale:Locale}) {
  const w=(en:string,zh:string)=>words(locale,en,zh);
  const titles=[["16S","16S"],["Mitochondrial","线粒体"],["Simulated DNA","模拟 DNA"],["Simulated RNA","模拟 RNA"]];
  const uses=[["Ribosomal RNA gene scaling","核糖体 RNA 基因的规模扩展"],["Mitochondrial sequence scaling","线粒体序列的规模扩展"],["Similarity series with known reference","有参考比对的相似度系列"],["RNA scaling with known reference","有参考比对的 RNA 规模扩展"]];
  return <details className="benchmark-first-use">
    <summary>{w("First time? Datasets, methods and scores","第一次使用？了解数据、方法和成绩")}</summary>
    <div><h2>{w("What is evaluated?","测什么数据？")}</h2><p>{w("26 specific test sets across four scenarios. Choose the scenario and scale that match your intended use.","当前为 26 个具体测试集，分属四类场景。请先选择与你的研究用途相近的场景与规模。")}</p>
      <div className="benchmark-table-scroll" tabIndex={0} role="region" aria-label={w("Dataset scenarios","数据集场景")}><table className="benchmark-table"><thead><tr><th>{w("Scenario","场景")}</th><th>{w("Use","用途")}</th><th>{w("Test sets / sequences","测试集 / 序列规模")}</th><th>{w("Reference","参考比对")}</th></tr></thead><tbody>{titles.map((title,index)=>{
        const cases=snapshot.catalog.datasets.filter(dataset=>datasetGroup(dataset)===index),counts=cases.map(dataset=>dataset.sequence_count),refs=cases.filter(dataset=>dataset.reference).length;
        return <tr key={index}><th>{w(...title as [string,string])}</th><td>{w(...uses[index] as [string,string])}</td><td>{cases.length} / {Math.min(...counts).toLocaleString()}–{Math.max(...counts).toLocaleString()}</td><td>{refs}/{cases.length}</td></tr>;
      })}</tbody></table></div>
      <h2>{w("Who are the comparators?","与谁比较？")}</h2><p>{w("These are the platform's selected methods and test sets. Outperforming them does not by itself establish publication readiness.","这些数据集与基线是平台选取的评测范围。超过它们本身不等于满足论文发表条件，仍需结合研究问题和更广泛的证据。")}</p>
      <ul className="benchmark-method-guide">{snapshot.methods.map(method=>{
        const versions=[...new Set(snapshot.batches.flatMap(batch=>batch.methods.filter(spec=>spec.method_id===method.id).map(spec=>spec.version)))];
        const role=Object.entries(roles).find(([prefix])=>method.id.replace(/[-_]/g,"").toLowerCase().startsWith(prefix))?.[1];
        return <li key={method.id}><strong>{method.name}</strong> · {versions.join(" / ")||w("Version in experiment details","版本见实验详情")}{role&&<> · {w(...role)}</>} {sources[method.id]&&<a href={sources[method.id]} target="_blank" rel="noreferrer">{w("Source","来源")}</a>}</li>;
      })}</ul>
      <h2>{w("How should I read the scores?","怎么看成绩？")}</h2><p>{w("Time and peak memory: lower is better. Normalized SP, Q and TC: higher is better. Q and TC require a reference; unavailable values and failures are not zeros.","时间和峰值内存越低越好；归一化 SP、Q、TC 越高越好。Q 与 TC 需要参考比对，缺失和失败均不等于零。")}</p><Link to="/docs?section=metrics&article=benchmark-metrics">{w("Read the calculation guide (SP / Q / TC)","查看计算说明（SP / Q / TC）")}</Link>
    </div>
  </details>;
}
