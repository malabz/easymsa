import { apiErrorMessage } from "./apiErrors";

export const realignText = {
  zh: {
    uploadTitle: "选择或拖拽已比对文件", uploadDescription: "上传 FASTA 或 FASTA.gz，各序列应等长。文件大小不超过 100 MiB。",
    fileSelected: "文件已选择", replaceFile: "替换文件",
    ready: "重比对服务可用", readyDescription: "上传已有比对，保留初始结果并使用 ReAlign-N 优化。",
    offline: "无法连接重比对服务，请检查连接后重试。", inputRequirements: "输入要求与规模限制",
    preprocessNotApplicable: "无需预处理",
    title: "重比对", description: "上传已有比对，使用 ReAlign-N 进行优化。",
    enable: "优化比对质量", optionalCaution: "开启后运行时间会增加，比对质量可能提高。", optionalSettings: "优化设置与适用范围",
    caution: "执行局部与全局重比对，保留初始结果。开启后会增加处理时间。",
    advanced: "重比对高级设置", pattern: "执行顺序", localFirst: "先局部后全局", globalFirst: "先全局，后局部",
    limits: "最多 2,000 条序列、30,000 列、100 万比对字符。支持 ACGT 或 ACGU 和 gap（-），不支持简并碱基。",
    file: "已比对 FASTA 文件", submit: "提交重比对", disabled: "重比对服务暂未开放。", unavailable: "重比对服务暂不可用，请稍后重试。",
    checking: "正在检查重比对服务…", selectFile: "请选择已比对的 FASTA 或 FASTA.gz 文件。", jobName: "任务名称", email: "通知邮箱（可选）",
    pending: "正在提交…", initial: "初始比对", refined: "重比对结果", final: "最终结果", resultVersion: "结果版本",
    fallback: "重比对未完成，初始结果可下载。", success: "重比对已完成。", downloadInitial: "下载初始比对", status: "重比对状态",
    queued: "等待重比对", running: "正在重比对", failed: "重比对失败", skipped: "已跳过重比对", completed: "重比对完成",
    citation: "使用重比对结果发表研究时，请引用 ReAlign-N（2024）及初始比对方法。",
  },
  en: {
    uploadTitle: "Choose or drop an aligned file", uploadDescription: "Upload an aligned nucleotide FASTA with equal-length sequences. FASTA or FASTA.gz, up to 100 MiB.",
    fileSelected: "File selected", replaceFile: "Replace file",
    ready: "Realignment service is ready", readyDescription: "Upload an existing alignment to refine with ReAlign-N while retaining the initial result.",
    offline: "Unable to connect to the realignment service. Check your connection and retry.", inputRequirements: "Input requirements and limits",
    preprocessNotApplicable: "No preprocessing needed",
    title: "Realignment", description: "Upload an existing alignment to refine with ReAlign-N.",
    enable: "Refine alignment quality", optionalCaution: "Increases running time and may improve alignment quality.", optionalSettings: "Refinement settings and limits",
    caution: "Runs local and global refinement and retains the initial result. Adds processing time.",
    advanced: "Realignment advanced settings", pattern: "Execution order", localFirst: "Local then global", globalFirst: "Global then local",
    limits: "Up to 2,000 sequences, 30,000 columns, and 1 million alignment characters. ACGT or ACGU with gaps (-); ambiguous bases are unsupported.",
    file: "Aligned FASTA file", submit: "Submit Realignment", disabled: "Realignment is not enabled.", unavailable: "The realignment service is unavailable. Please try again later.",
    checking: "Checking realignment service…", selectFile: "Choose an aligned FASTA or FASTA.gz file.", jobName: "Job name", email: "Notification email (optional)",
    pending: "Submitting…", initial: "Initial alignment", refined: "Refined alignment", final: "Final result", resultVersion: "Result version",
    fallback: "Realignment did not complete. Download the initial alignment.", success: "Realignment completed.", downloadInitial: "Download initial alignment", status: "Realignment status",
    queued: "Waiting for realignment", running: "Realigning", failed: "Realignment failed", skipped: "Realignment skipped", completed: "Realignment completed",
    citation: "When publishing refined results, cite ReAlign-N (2024) and the initial alignment method.",
  }
};

export function realignmentError(locale: "zh" | "en", code: string, message: string) {
  return apiErrorMessage({ code, message }, locale);
}
