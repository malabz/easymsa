import { EasyMsaApiError } from "../api/client";

type Locale = "zh" | "en";

const messages: Record<string, [string, string]> = {
  MISSING_TOKEN: ["请提供任务访问密钥或导入恢复文件。", "Enter the task access key or import its recovery file."],
  INVALID_TOKEN: ["访问密钥无效，请检查恢复链接或重新输入。", "The access key is invalid. Check the recovery link or enter it again."],
  JOB_NOT_FOUND: ["未找到该任务，请检查任务 ID。", "This task was not found. Check the task ID."],
  JOB_EXPIRED: ["任务结果已到期或被删除。", "These task results have expired or were deleted."],
  JOB_NOT_COMPLETED: ["任务尚未完成，请返回任务进度。", "This task is not complete yet. Return to task progress."],
  INPUT_REQUIRED: ["请粘贴 FASTA 序列或上传文件。", "Paste FASTA sequences or upload a file."],
  INPUT_EMPTY: ["输入为空，请添加序列。", "The input is empty. Add your sequences."],
  UNSUPPORTED_FILE_TYPE: ["不支持此文件格式，请检查上传文件。", "This file format is not supported. Check the uploaded file."],
  UPLOAD_TOO_LARGE: ["上传文件或解压后的内容超过大小限制。", "The uploaded or decompressed file exceeds the size limit."],
  QUEUE_FULL: ["任务队列已满，请稍后重试。", "The task queue is full. Please try again later."],
  SUBMISSIONS_PAUSED: ["服务正在维护，请稍后提交。", "Submissions are paused for maintenance. Please try again later."],
  ALGORITHM_NOT_SUPPORTED: ["此方法已停用，请选择可用的比对方法。", "This method is no longer supported. Select an available alignment method."],
  ALGORITHM_UNAVAILABLE: ["所选比对方法暂不可用，请选择其他方法或稍后重试。", "The selected method is unavailable. Choose another method or try again later."],
  DEV_BACKEND_OFFLINE: ["无法连接分析服务，请恢复连接后重试。", "Unable to reach the analysis service. Reconnect and try again."],
  REALIGN_TOO_FEW_SEQUENCES: ["至少需要两条序列。", "Provide at least two sequences."],
  REALIGN_DUPLICATE_ID: ["序列名称重复，请检查对应记录。", "Sequence names must be unique. Check the indicated record."],
  REALIGN_EMPTY_SEQUENCE: ["存在空序列或仅含缺口的序列。", "A sequence is empty or contains only gaps."],
  REALIGN_INVALID_BASE: ["仅支持 A、C、G、T/U 和缺口（-）。", "Use only A, C, G, T/U and gaps (-)."],
  REALIGN_MIXED_ALPHABET: ["同一文件不能混用 DNA 的 T 和 RNA 的 U。", "Do not mix DNA T and RNA U in the same file."],
  REALIGN_UNALIGNED_INPUT: ["已比对序列必须具有相同长度。", "Aligned sequences must have equal lengths."],
  REALIGN_SIZE_LIMIT: ["输入超过重比对的序列数、列数或总字符数限制。", "The input exceeds the realignment sequence, column or total-character limit."],
  REALIGN_INVALID_FASTA: ["无法解析 FASTA，请检查序列标题和内容。", "Unable to read this FASTA. Check sequence headers and content."],
  REALIGN_INVALID_ID: ["序列名称为空或包含不支持的字符。", "A sequence name is empty or contains unsupported characters."],
  REALIGN_DISABLED: ["重比对服务暂未开放。", "Realignment is not enabled."],
  REALIGN_UNAVAILABLE: ["重比对服务暂不可用，请稍后重试。", "The realignment service is unavailable. Please try again later."],
  REALIGN_TIMEOUT: ["重比对超时，初始结果已保留。", "Realignment timed out. The initial alignment is retained."],
  REALIGN_EXECUTION_FAILED: ["重比对未完成，初始结果已保留。", "Realignment did not complete. The initial alignment is retained."],
  REALIGN_OUTPUT_INVALID: ["重比对输出未通过完整性检查，初始结果已保留。", "The refined output failed integrity checks. The initial alignment is retained."],
  REALIGN_INTERNAL_ERROR: ["重比对未完成，初始结果已保留。", "Realignment did not complete. The initial alignment is retained."],
  REALIGN_NOT_COMPLETED: ["重比对尚未完成。", "Realignment is not complete yet."],
  REALIGN_INPUT_MISMATCH: ["初始比对与输入序列内容不一致。", "The initial alignment does not match the input sequences."],
  ALIGNMENT_OUTPUT_INVALID: ["比对输出未通过完整性检查，请重新提交或联系维护人员。", "Alignment output failed integrity checks. Resubmit or contact support."],
  INVALID_SERVER_ALIGNMENT_PAYLOAD: ["结果数据无法读取，请重试或下载完整结果。", "The alignment could not be read. Retry or download the complete result."],
  WORKER_INTERRUPTED: ["计算任务已中断，请重新提交。", "The computation was interrupted. Please submit a new task."],
  WORKER_LOST: ["计算服务中断，任务已停止。请重新提交。", "The computation stopped after a service interruption. Please submit a new task."]
};

/** User-facing wording is generated at render time so a language switch also updates errors. */
export function apiErrorMessage(error: unknown, locale: Locale, fallback?: string): string {
  const value = error && typeof error === "object" ? error as { code?: string; status?: number; message?: string } : undefined;
  const translated = value?.code && messages[value.code]?.[locale === "zh" ? 0 : 1];
  if (translated) {
    const record = value.message?.match(/(?:at record|at line)\s+(\d+)/i)?.[1];
    return translated + (record ? (locale === "zh" ? `（记录 ${record}）` : ` (record ${record})`) : "");
  }
  if (value?.status === 401 || value?.status === 403) return messages.INVALID_TOKEN[locale === "zh" ? 0 : 1];
  if (value?.status === 404) return messages.JOB_NOT_FOUND[locale === "zh" ? 0 : 1];
  if (value?.status === 410) return messages.JOB_EXPIRED[locale === "zh" ? 0 : 1];
  if (value?.status === 413) return messages.UPLOAD_TOO_LARGE[locale === "zh" ? 0 : 1];
  if (value?.status === 429) return locale === "zh" ? "请求较多，请稍后重试。" : "Too many requests. Please try again shortly.";
  if (error instanceof TypeError || value?.message && /failed to fetch|networkerror|network request failed|load failed/i.test(value.message)) {
    return locale === "zh" ? "无法连接分析服务，请检查网络后重试。" : "Unable to reach the analysis service. Check your connection and retry.";
  }
  return fallback || (locale === "zh" ? "请求未能完成，请重试。" : "The request could not be completed. Please try again.");
}

/** Permanent failures need user input, not another background request. */
export function isPermanentApiError(error: unknown): boolean {
  if (!(error instanceof EasyMsaApiError)) return false;
  if (["MISSING_TOKEN", "INVALID_TOKEN", "JOB_NOT_FOUND", "JOB_EXPIRED"].includes(error.code)) return true;
  return Boolean(error.status && error.status >= 400 && error.status < 500 && ![408, 425, 429].includes(error.status));
}
