import { z } from "zod";
import {
  adaptServerAlignment,
  adaptServerSummary,
  type ServerResultSummary,
} from "./api/results";
import type { ResultStage } from "./types/job";
import type { ResultFile } from "./types/result";
import type { MsaViewerContext } from "../features/msa-viewer/viewerContext";
import { sha256Hex } from "../features/msa-viewer/alignmentModel";
const dimensions = z.object({
  sequenceCount: z.number().int().positive(),
  alignmentLength: z.number().int().positive(),
  algorithm: z
    .object({ name: z.string().nullish(), resolvedName: z.string().nullish() })
    .nullable(),
});
const exampleSchema = z.object({
  id: z.enum(["alignment-small", "realignment-small"]),
  version: z.literal("v1"),
  kind: z.enum(["alignment", "realignment"]),
  stages: z.object({
    final: dimensions,
    initial: dimensions.optional(),
    refined: dimensions.optional(),
  }),
  files: z.record(
    z.object({
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      bytes: z.number().int().nonnegative(),
    }),
  ),
  sameInitialAndRefined: z.boolean().nullable(),
});
export type PublicExample = z.infer<typeof exampleSchema>;
export const EXAMPLE_IDS = ["alignment-small", "realignment-small"] as const;
export function exampleTitle(example: PublicExample, locale: string) {
  return example.kind === "alignment"
    ? locale === "zh"
      ? "合成 DNA · MiniPOA 比对"
      : "Synthetic DNA · MiniPOA alignment"
    : locale === "zh"
      ? "合成 DNA · ReAlign-N 重比对"
      : "Synthetic DNA · ReAlign-N refinement";
}
export function exampleUrl(
  example: Pick<PublicExample, "version" | "id">,
  name: string,
) {
  if (
    !EXAMPLE_IDS.includes(example.id) ||
    example.version !== "v1" ||
    !/^[\w.-]+$/.test(name)
  )
    throw new Error("Invalid example resource");
  return `${import.meta.env.BASE_URL}examples/${example.version}/${example.id}/${name}`;
}
export async function loadExamples(
  signal?: AbortSignal,
): Promise<PublicExample[]> {
  const r = await fetch(
    `${import.meta.env.BASE_URL}examples/v1/manifest.json`,
    { signal },
  );
  if (!r.ok) throw new Error("EXAMPLE_UNAVAILABLE");
  return z.array(exampleSchema).parse(await r.json());
}
export async function verifiedExampleBytes(
  example: PublicExample,
  name: string,
  signal?: AbortSignal,
) {
  const file = example.files[name];
  if (!file) throw new Error("EXAMPLE_UNAVAILABLE");
  const r = await fetch(exampleUrl(example, name), { signal });
  if (!r.ok) throw new Error("EXAMPLE_UNAVAILABLE");
  const bytes = await r.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  if (bytes.byteLength !== file.bytes || hash !== file.sha256)
    throw new Error("EXAMPLE_INTEGRITY_FAILED");
  return bytes;
}
export async function loadExampleInput(id: string) {
  const example = (await loadExamples()).find((e) => e.id === id);
  if (!example) throw new Error("EXAMPLE_UNAVAILABLE");
  const bytes = await verifiedExampleBytes(example, "input.fasta");
  return {
    example,
    file: new File([bytes], `${id}.fasta`, { type: "text/plain" }),
  };
}
export function exampleDownloads(
  example: PublicExample,
  stage: ResultStage,
): ResultFile[] {
  return [
    [`${stage}.zip`, "all_results.zip"],
    [`${stage}.fasta.gz.bin`, "alignment.fasta.gz"],
    [`${stage}.fasta.gz.xz`, "alignment.fasta.gz.xz"],
  ].map(([path, name]) => ({
    name,
    description: "",
    size: `${example.files[path].bytes.toLocaleString()} B`,
    href: exampleUrl(example, path),
  }));
}
export async function loadExampleResult(
  example: PublicExample,
  stage: ResultStage,
  signal?: AbortSignal,
) {
  if (!example.stages[stage]) throw new Error("EXAMPLE_UNAVAILABLE");
  const [sb, ab] = await Promise.all([
    verifiedExampleBytes(example, `${stage}.summary.json`, signal),
    verifiedExampleBytes(example, `${stage}.alignment.json`, signal),
  ]);
  const summary = adaptServerSummary(
    JSON.parse(new TextDecoder().decode(sb)) as ServerResultSummary,
  );
  const alignment = await adaptServerAlignment(
    JSON.parse(new TextDecoder().decode(ab)),
  );
  if (alignment.descriptor) {
    alignment.descriptor.sourceKind = "example";
    alignment.descriptor.sourceName = `${example.id}:${example.version}:${stage}`;
    alignment.descriptor.sourceKey = `sha256:${await sha256Hex(`${example.id}:${example.version}:${stage}:${alignment.descriptor.alignmentSha256}`)}`;
  }
  const files = exampleDownloads(example, stage);
  const context: MsaViewerContext = {
    source: {
      type: "public-example",
      name: `${example.id}:${example.version}:${stage}`,
    },
    algorithm: {
      requested: summary.algorithm?.name ?? null,
      resolved: summary.algorithm?.resolvedName ?? null,
    },
    preprocess: {
      mode: summary.preprocess.mode,
      strictness: summary.preprocess.strictness,
    },
    downloads: { fullResultHref: files[0].href },
  };
  return { summary, alignment, files, context };
}
