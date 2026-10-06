export const realignText = {
  zh: {
    uploadTitle: "选择或拖拽已比对文件", uploadDescription: "上传 FASTA 或 FASTA.gz，各序列应等长。文件大小不超过 100 MiB。",
    fileSelected: "文件已选择，序列内容将在提交后校验。", replaceFile: "替换文件",
    ready: "重比对服务可用", readyDescription: "上传已有比对，保留初始结果并使用 ReAlign-N 优化。",
    offline: "无法连接重比对服务，请检查连接后重试。", inputRequirements: "输入要求与规模限制",
    preprocessNotApplicable: "已比对文件：普通序列预处理不适用。",
    title: "重比对", description: "上传已有比对，使用 ReAlign-N 进行优化。",
    enable: "优化比对质量", optionalCaution: "开启后运行时间会增加，比对质量可能提高。", optionalSettings: "优化设置与适用范围",
    caution: "执行局部与全局重比对，保留初始结果。开启后会增加处理时间。",
    advanced: "重比对高级设置", pattern: "执行顺序", localFirst: "先局部，后全局（默认）", globalFirst: "先全局，后局部",
    limits: "最多 2,000 条序列、30,000 列、100 万比对字符。支持 ACGT 或 ACGU 和 gap（-），不支持简并碱基。",
    file: "已比对 FASTA 文件", submit: "提交重比对", disabled: "重比对服务暂未开放。", unavailable: "重比对工具暂不可用，请稍后重试。",
    checking: "正在检查重比对服务…", selectFile: "请选择已比对的 FASTA 或 FASTA.gz 文件。", jobName: "任务名称", email: "通知邮箱（可选）",
    pending: "正在提交…", initial: "初始比对", refined: "重比对结果", final: "最终可用结果", resultVersion: "结果版本",
    fallback: "重比对未完成，初始结果可下载。", success: "ReAlign-N 重比对已完成。", downloadInitial: "下载初始比对", status: "重比对状态",
    queued: "等待重比对", running: "正在重比对", failed: "重比对失败", skipped: "已跳过重比对", completed: "重比对完成",
    citation: "使用重比对结果发表研究时，请引用 ReAlign-N（2024）及初始比对方法。",
  },
  en: {
    uploadTitle: "Choose or drop an aligned file", uploadDescription: "Upload an aligned nucleotide FASTA with equal-length sequences. FASTA or FASTA.gz, up to 100 MiB.",
    fileSelected: "File selected. Sequence content will be validated after submission.", replaceFile: "Replace file",
    ready: "Realignment service is ready", readyDescription: "Upload an existing alignment to refine with ReAlign-N while retaining the initial result.",
    offline: "Unable to connect to the realignment service. Check your connection and retry.", inputRequirements: "Input requirements and limits",
    preprocessNotApplicable: "Aligned input: ordinary sequence preprocessing is not applicable.",
    title: "Realignment", description: "Upload an existing alignment to refine with ReAlign-N.",
    enable: "Refine alignment quality", optionalCaution: "Increases running time and may improve alignment quality.", optionalSettings: "Refinement settings and limits",
    caution: "Runs local and global refinement and retains the initial result. Adds processing time.",
    advanced: "Realignment advanced settings", pattern: "Execution order", localFirst: "Local then global (default)", globalFirst: "Global then local",
    limits: "Up to 2,000 sequences, 30,000 columns, and 1 million alignment characters. ACGT or ACGU with gaps (-); ambiguous bases are unsupported.",
    file: "Aligned FASTA file", submit: "Submit Realignment", disabled: "Realignment is not enabled.", unavailable: "Realignment tools are unavailable. Please try again later.",
    checking: "Checking realignment service…", selectFile: "Choose an aligned FASTA or FASTA.gz file.", jobName: "Job name", email: "Notification email (optional)",
    pending: "Submitting…", initial: "Initial alignment", refined: "Refined alignment", final: "Final available result", resultVersion: "Result version",
    fallback: "Realignment did not complete. Download the initial alignment.", success: "ReAlign-N refinement completed.", downloadInitial: "Download initial alignment", status: "Realignment status",
    queued: "Waiting for realignment", running: "Realigning", failed: "Realignment failed", skipped: "Realignment skipped", completed: "Realignment completed",
    citation: "When publishing refined results, cite ReAlign-N (2024) and the initial alignment method.",
  }
};

export function realignmentError(locale: 'zh'|'en', code: string, message: string) {
  if(locale==='en')return message;
  const messages:Record<string,string>={
    REALIGN_NOT_COMPLETED:'任务未能完成，重比对尚未成功执行。',REALIGN_TOO_FEW_SEQUENCES:'至少需要两条序列。',REALIGN_DUPLICATE_ID:'序列标识重复，请检查对应记录。',
    REALIGN_EMPTY_SEQUENCE:'存在空序列或全 gap 序列，请检查对应记录。',REALIGN_INVALID_BASE:'存在不支持的碱基，请仅使用 ACGT 或 ACGU 和 gap（-）。',
    REALIGN_MIXED_ALPHABET:'同一文件不能混用 DNA 的 T 和 RNA 的 U。',REALIGN_UNALIGNED_INPUT:'已比对文件中的序列长度必须一致。',
    REALIGN_SIZE_LIMIT:'输入超过重比对试运行的序列数、列数或总字符数限制。',REALIGN_INVALID_FASTA:'无法解析 FASTA，请检查文件格式。',
    REALIGN_INVALID_ID:'FASTA 标识为空或含有不支持的控制字符。',REALIGN_INPUT_MISMATCH:'初始比对与清洗后的序列内容不一致。',
    REALIGN_DISABLED:'重比对服务暂未开放。',REALIGN_UNAVAILABLE:'重比对工具暂不可用。',REALIGN_TIMEOUT:'重比对超时，初始比对已保留。',
    REALIGN_EXECUTION_FAILED:'重比对工具未成功完成，初始比对已保留。',REALIGN_OUTPUT_INVALID:'重比对输出未通过序列完整性检查，初始比对已保留。',
    REALIGN_INTERNAL_ERROR:'重比对未能完成，初始比对已保留。',UPLOAD_TOO_LARGE:'上传文件或解压后的 FASTA 超过大小限制。',
    UNSUPPORTED_FILE_TYPE:'请上传 FASTA 或 gzip 压缩的 FASTA 文件。',QUEUE_FULL:'任务队列已满，请稍后重试。'
  };
  const position=message.match(/(?:at record|at line) (\d+)(?:: (.*))?/);
  return (messages[code]??message)+(position?`（位置 ${position[1]}${position[2]?`：${position[2]}`:''}）`:'');
}
