export type ResourceLimit={cpu:number;memory:number;seconds:number};
export function ResourceLimits({limits,locale}:{limits:ResourceLimit[];locale:"en"|"zh"}){
  if(!limits.length)return null;
  const max=(key:keyof ResourceLimit)=>Math.max(...limits.map(item=>item[key]));
  return <p className="benchmark-resource-limits" data-testid="resource-ceiling">{locale==="zh"?"评测资源上限：":"Benchmark resource ceiling: "}{max("cpu")} CPU · {max("memory")} GiB · {max("seconds")/60} {locale==="zh"?"分钟 / 数据集":"min per dataset"}</p>;
}
