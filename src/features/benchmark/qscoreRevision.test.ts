import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { metricKeys, parseSnapshot } from "./model";
import { selectRecords, selectViewSnapshot } from "./selection";
import { websiteSnapshot } from "./website";
import { snapshotCsv } from "./presentation";

const rawSnapshot = JSON.parse(readFileSync("public/benchmark/snapshot.json", "utf8"));
const snapshot = parseSnapshot(rawSnapshot);
const provenance = JSON.parse(readFileSync("public/benchmark/qscore64-correction.json", "utf8")) as {
  id: string; source_snapshot_normalized_sha256: string;
  batches: {batch_id:string;source_batch_id:string;records:number}[];
  records: {batch_id:string;method_id:string;dataset_id:string;q:number;previous_q:number;
    alignment_sha256:string;reference_sha256:string}[];
};
const latest = {mode:"latest"} as const;

function csvRows(input:string) {
  const rows:string[][]=[]; let row:string[]=[],cell="",quoted=false;
  for(let index=input.charCodeAt(0)===0xfeff?1:0;index<input.length;index++) {
    const c=input[index];
    if(c==='"') {if(quoted&&input[index+1]==='"'){cell+='"';index++;}else quoted=!quoted;}
    else if(c===","&&!quoted){row.push(cell);cell="";}
    else if(c==="\n"&&!quoted){row.push(cell.replace(/\r$/,""));rows.push(row);row=[];cell="";}
    else cell+=c;
  }
  if(cell||row.length){row.push(cell);rows.push(row);}
  return rows;
}

describe("real Qscore 64-bit corrections",()=>{
  it("keeps the original snapshot and appends 13 Q-only records with input identities",()=>{
    expect(provenance.records).toHaveLength(13);
    expect(provenance.batches.map(batch=>batch.records)).toEqual([2,11]);
    const revisions=new Set(provenance.batches.map(batch=>batch.batch_id));
    const original={...rawSnapshot,batches:rawSnapshot.batches.filter((batch:{id:string})=>!revisions.has(batch.id))};
    expect(createHash("sha256").update(JSON.stringify(original)).digest("hex")).toBe(provenance.source_snapshot_normalized_sha256);
    expect(original.batches.map((batch:{id:string})=>batch.id)).toEqual(["memory32-single-20261029","repair15-single-20261028","baseline-single-20261027"]);
    for(const correction of provenance.records) {
      expect(correction.alignment_sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(correction.reference_sha256).toMatch(/^[a-f0-9]{64}$/);
      const parent=snapshot.batches.find(batch=>batch.id===correction.batch_id)!;
      const revised=snapshot.batches.find(batch=>batch.id===`${correction.batch_id}-${provenance.id}`)!;
      const sameRow=(row:{method_id:string;dataset_id:string})=>row.method_id===correction.method_id&&row.dataset_id===correction.dataset_id;
      const source=parent.results.find(sameRow)!, result=revised.results.find(sameRow)!;
      expect(source.metrics.q.value??source.metrics.q.mean).toBe(correction.previous_q);
      expect(result.metrics.q).toEqual({status:"complete",valid_count:1,planned_count:1,value:correction.q,mean:correction.q,
        sd:null,min:correction.q,max:correction.q,display:"single",reason_codes:[]});
      for(const key of metricKeys.filter(key=>key!=="q")) expect(result.metrics[key]).toEqual(source.metrics[key]);
      expect({...result,metrics:null}).toEqual({...source,metrics:null});
      expect({...revised,id:null,created_at:null,scoring:null,methods:null,results:null})
        .toEqual({...parent,id:null,created_at:null,scoring:null,methods:null,results:null});
      expect(revised.scoring.id).toBe("sp1-mismatch-1-gap-2-0-qscore21-u64-v1");
      expect(revised.scoring.label).toContain(parent.scoring.label);
      expect(selectRecords(snapshot,latest).find(row=>sameRow(row.result))?.result).toBe(result);
      expect(selectViewSnapshot(snapshot,{mode:"batch",batchId:parent.id}).batches[0].results.find(sameRow)).toEqual(source);
    }
    expect(JSON.stringify(provenance)).not.toMatch(/\/opt\/|\/var\/|\/mnt\/|[A-Z]:\\|access_token|password/);
  });

  it("selects nine visible corrected Qs without changing the 156 current combinations",()=>{
    const visible=websiteSnapshot(snapshot), selected=selectRecords(visible,latest);
    expect(selected).toHaveLength(156);
    expect(selected.filter(row=>row.batch.id.endsWith(provenance.id))).toHaveLength(9);
    expect(selected.filter(row=>row.result.status==="complete")).toHaveLength(127);
    expect(selected.filter(row=>row.result.status==="timeout")).toHaveLength(14);
    expect(selected.filter(row=>row.result.reason_code==="oom")).toHaveLength(15);
    for(const id of ["rna_4095","rna_8191"]) {
      const records=selected.filter(row=>row.result.dataset_id===id);
      expect(records.filter(row=>row.result.metrics.q.status==="complete").every(row=>row.batch.id.endsWith(provenance.id))).toBe(true);
    }
  });

  it("exports all 1092 current raw metric positions identically in JSON and CSV",()=>{
    const current=selectViewSnapshot(websiteSnapshot(snapshot),latest);
    expect(parseSnapshot(current)).toEqual(current);
    const [header,...rows]=csvRows(snapshotCsv(current)), column=(name:string)=>header.indexOf(name);
    expect(rows).toHaveLength(1092);
    let count=0;
    for(const batch of current.batches)for(const result of batch.results)for(const key of metricKeys) {
      const method=current.methods.find(method=>method.id===result.method_id)!.name;
      const row=rows.find(row=>row[column("batch")]===batch.id&&row[column("dataset")]===result.dataset_id&&row[column("method")]===method&&row[column("metric")]===key)!;
      expect(row).toBeDefined();
      const metric=result.metrics[key];
      for(const field of ["value","mean","sd","min","max"] as const)expect(row[column(field)]).toBe(metric[field]===null?"":String(metric[field]));
      expect(row[column("metric_status")]).toBe(metric.status);
      expect(row[column("reason_codes")]).toBe(metric.reason_codes.join(";"));
      expect(row[column("unit")]).toBe(key==="wall_seconds"?"s":key==="max_rss_kib"?"KiB":"");
      count++;
    }
    expect(count).toBe(1092);
  });
});
