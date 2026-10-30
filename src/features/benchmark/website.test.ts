import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSnapshot, metricKeys } from "./model";
import { websiteSnapshot } from "./website";
import { selectRecords, selectViewSnapshot } from "./selection";
import { displaySelection } from "./view";
import { snapshotCsv } from "./presentation";

const archive = () => parseSnapshot(JSON.parse(readFileSync("public/benchmark/snapshot.json", "utf8")));
const ids = ["clustalo", "mafft", "muscle5", "halign4", "fmalign2", "minipoa"];
const latest = { mode: "latest" } as const;

describe("website method catalog", () => {
  it("renames HAlign and removes retired methods from every public catalog and batch", () => {
    const snapshot = websiteSnapshot(archive());
    expect(snapshot.methods.map(method => method.id)).toEqual(ids);
    expect(snapshot.methods.find(method => method.id === "halign4")?.name).toBe("HAlign");
    expect(snapshot.batches.map(batch => batch.results.length)).toEqual([17, 11, 156]);
    for (const batch of snapshot.batches) {
      expect(batch.methods.every(method => ids.includes(method.method_id))).toBe(true);
      expect(batch.results.every(result => ids.includes(result.method_id))).toBe(true);
    }
    expect(parseSnapshot(snapshot)).toEqual(snapshot);
  });

  it("preserves all scientific fields and the untouched archive", () => {
    const source = archive();
    const before = JSON.stringify(source);
    const snapshot = websiteSnapshot(source);
    for (const batch of snapshot.batches) {
      const original = source.batches.find(item => item.id === batch.id)!;
      expect({ ...batch, methods: [], results: [] }).toEqual({ ...original, methods: [], results: [] });
      for (const result of batch.results) expect(result).toBe(original.results.find(item =>
        item.method_id === result.method_id && item.dataset_id === result.dataset_id));
      for (const method of batch.methods) expect(method).toBe(original.methods.find(item => item.method_id === method.method_id));
    }
    expect(JSON.stringify(source)).toBe(before);
    expect(source.methods).toHaveLength(9);
    expect(websiteSnapshot(snapshot)).toEqual(snapshot);
  });

  it("uses the same six methods for counts, filters, historic views and both downloads", () => {
    const snapshot = websiteSnapshot(archive());
    const records = selectRecords(snapshot, latest);
    expect(records).toHaveLength(156);
    expect(records.filter(row => row.result.status === "complete")).toHaveLength(127);
    expect(records.filter(row => row.result.status === "timeout")).toHaveLength(14);
    expect(records.filter(row => row.result.reason_code === "oom")).toHaveLength(15);
    const rna = displaySelection(snapshot, latest, new URLSearchParams("type=rna"));
    expect(rna.visibleRecords).toHaveLength(36);
    expect(rna.visibleRecords.filter(row => row.result.status === "complete")).toHaveLength(30);
    const exported = selectViewSnapshot(snapshot, latest);
    expect(parseSnapshot(exported)).toEqual(exported);
    expect(exported.batches.flatMap(batch => batch.results)).toHaveLength(156);
    const csv = snapshotCsv(exported);
    expect(csv.trim().split("\r\n")).toHaveLength(156 * metricKeys.length + 1);
    expect(csv).toContain('"HAlign"');
    expect(csv).not.toMatch(/HAlign 3|HAlign 4|Kalign 3|T-Coffee/);
    for (const batch of snapshot.batches) {
      const selected = selectViewSnapshot(snapshot, { mode: "batch", batchId: batch.id });
      expect(selected.batches).toEqual([batch]);
      expect(parseSnapshot(selected)).toEqual(selected);
    }
  });

  it("does not resurrect removed methods through old URLs or the full-catalog switch", () => {
    const snapshot = websiteSnapshot(archive());
    for (const scope of [latest, { mode: "batch", batchId: "memory32-single-20261029" } as const]) {
      const selection = displaySelection(snapshot, scope, new URLSearchParams("all=1&methods=tcoffee,halign3,kalign3,mafft"));
      expect(selection.methods.map(method => method.id)).toEqual(["mafft"]);
      expect(selection.visibleRecords.every(row => row.result.method_id === "mafft")).toBe(true);
      const empty = displaySelection(snapshot, scope, new URLSearchParams("methods=tcoffee,halign3,kalign3"));
      expect(empty.methods).toEqual([]);
      expect(empty.visibleRecords).toEqual([]);
    }
  });

  it("omits a batch with no remaining methods without inventing a replacement batch", () => {
    const snapshot = archive();
    snapshot.batches = [{ ...snapshot.batches[0], methods: snapshot.batches[0].methods.filter(method => method.method_id === "halign3"),
      results: snapshot.batches[0].results.filter(result => result.method_id === "halign3") }];
    const visible = websiteSnapshot(snapshot);
    expect(visible.batches).toEqual([]);
    expect(parseSnapshot(visible)).toEqual(visible);
  });
});
