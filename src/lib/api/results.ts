import { apiUrl, isMockMode } from "./client";
import { demoAlignment, demoSummary } from "../mock/demoAlignment";
import type { MSAResult } from "../types/msa";
import type { ResultFile, ResultSummary } from "../types/result";
import { assetUrl } from "../utils/format";

export async function getResultSummary(jobId: string): Promise<ResultSummary> {
  if (isMockMode()) {
    try {
      const response = await fetch(assetUrl("demo/summary.json"));
      if (response.ok) {
        return response.json();
      }
    } catch {
      return { ...demoSummary, jobId };
    }

    return { ...demoSummary, jobId };
  }

  const response = await fetch(apiUrl(`/jobs/${jobId}/results/summary`));

  if (!response.ok) {
    throw new Error("Failed to load result summary");
  }

  return response.json();
}

export async function getAlignmentResult(jobId: string): Promise<MSAResult> {
  if (isMockMode()) {
    try {
      const response = await fetch(assetUrl("demo/alignment.json"));
      if (response.ok) {
        return response.json();
      }
    } catch {
      return { ...demoAlignment, jobId };
    }

    return { ...demoAlignment, jobId };
  }

  const response = await fetch(apiUrl(`/jobs/${jobId}/results`));

  if (!response.ok) {
    throw new Error("Failed to load alignment result");
  }

  return response.json();
}

export function getDownloadFiles(jobId: string): ResultFile[] {
  if (!isMockMode()) {
    return [
      {
        name: "alignment.fasta",
        description: "Aligned sequences in FASTA format",
        size: "remote",
        href: apiUrl(`/jobs/${jobId}/results/alignment.fasta`)
      },
      {
        name: "summary.json",
        description: "Summary metrics in JSON format",
        size: "remote",
        href: apiUrl(`/jobs/${jobId}/results/summary.json`)
      },
      {
        name: "all_results.zip",
        description: "Compressed result archive",
        size: "remote",
        href: apiUrl(`/jobs/${jobId}/results/all_results.zip`)
      }
    ];
  }

  return [
    {
      name: "alignment.fasta",
      description: "Aligned sequences in FASTA format",
      size: "6 KB",
      href: assetUrl("demo/alignment.fasta")
    },
    {
      name: "summary.json",
      description: "Summary metrics in JSON format",
      size: "1 KB",
      href: assetUrl("demo/summary.json")
    },
    {
      name: "all_results.zip",
      description: "Compressed demo result archive",
      size: "8 KB",
      href: assetUrl("demo/all_results.zip")
    }
  ];
}
