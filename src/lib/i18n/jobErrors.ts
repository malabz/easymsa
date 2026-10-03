type Locale = "zh" | "en";

const messages: Record<string, [string, string]> = {
  ALIGNMENT_OUTPUT_INVALID: ["比对输出未通过完整性检查，请重新提交或联系维护人员。", "Alignment output failed integrity checks. Resubmit or contact support."],
  WORKER_INTERRUPTED: ["计算任务已中断，请重新提交。", "The computation was interrupted. Please submit a new job."],
  WORKER_LOST: ["计算服务中断，任务已停止。请重新提交。", "The computation stopped after a service interruption. Please submit a new job."],
  ALGORITHM_NOT_SUPPORTED: ["此方法已停用，请选择当前支持的比对方法。", "This method is no longer supported. Select an available alignment method."]
};
export function jobError(locale: Locale, code: string | undefined, fallback: string) {
  return (code && messages[code]?.[locale === "zh" ? 0 : 1]) || fallback;
}
