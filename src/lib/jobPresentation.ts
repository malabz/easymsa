type Locale = "zh" | "en";

const statuses: Record<string, [string, string]> = {
  queued: ["排队中", "Queued"], running: ["运行中", "Running"],
  preprocessing: ["正在预处理", "Preprocessing"], aligning: ["正在比对", "Aligning"],
  realigning: ["正在重比对", "Realigning"], packaging: ["正在准备结果", "Preparing results"],
  completed: ["已完成", "Completed"], failed: ["失败", "Failed"],
  skipped: ["已跳过", "Skipped"], pending: ["等待中", "Pending"],
  not_applicable: ["无需预处理", "No preprocessing needed"],
  audit: ["检查模式", "Check mode"], filter: ["过滤模式", "Filter mode"]
};

export function jobValue(value: string, locale: Locale): string {
  return statuses[value]?.[locale === "zh" ? 0 : 1] ?? value;
}

const messages: Record<string, [string, string]> = {
  "Job completed.": ["任务已完成。", "Job completed."],
  "Preprocessing completed.": ["预处理已完成。", "Preprocessing completed."],
  "ReAlign-N is optimizing the alignment.": ["正在重比对。", "Realigning the alignment."],
  "Initial alignment completed; ReAlign-N did not complete. Initial result retained.":
    ["优化未完成，初始比对已保留。", "Refinement did not complete. The initial alignment is available."],
  "Finishing saved results after an interrupted task.":
    ["正在恢复已保存的结果。", "Restoring saved results."],
  "Task interrupted. Submit a new task to run it again.":
    ["任务已中断，请重新提交。", "Task interrupted. Please submit a new job."]
};

export function jobMessage(value: string, locale: Locale): string | null {
  return messages[value]?.[locale === "zh" ? 0 : 1] ?? null;
}
