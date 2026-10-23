export const refinementText = {
  zh: {
    clearSearch: "清除片段搜索", taskInfo: "任务信息", parameters: "运行参数",
    licenseTitle: "使用与许可", privacyTitle: "隐私与本地存储",
    touchHint: "轻点碱基查看详情；开启范围选择后拖动选区。",
    selectRegion: "开启范围选择", browseMatrix: "切换为拖动浏览",
    inputRules: "至少两条等长序列，名称唯一。使用 DNA（ACGT）或 RNA（ACGU），不能混用 T/U；缺口用“-”。",
    cellFormula: "总字符数 = 序列数 × 比对列数。",
    fasta: "下载比对文件", archive: "下载完整结果", extraFormats: "其他压缩格式",
    fastaHint: "FASTA 序列文件，使用 gzip 压缩。", archiveHint: "比对、摘要及相关文件，打包为 ZIP。",
    downloading: "正在准备下载…", downloadFailed: "下载失败，请重试。", cancel: "取消",
    copyCitation: "复制引用", copied: "已复制", copyFailed: "复制未成功，请选中文字复制。",
    currentPaper: "当前使用方法", relatedPaper: "相关方法论文",
    recoveryPreview: "导入任务备份", recoveryHint: "支持单个 JSON 或本站导出的 ZIP 备份。",
    pendingVerification: "待验证", verifyImport: "验证并导入", verifying: "正在验证…", imported: "已导入", invalidRecord: "文件内容无效",
    unavailable: "任务不可访问或已过期", storageFailed: "本机存储不可用", duplicate: "已在当前列表",
    completeImport: "完成", totalCells: "总字符数", columns: "列", sequences: "条序列"
  },
  en: {
    clearSearch: "Clear motif search", taskInfo: "Task information", parameters: "Run settings",
    licenseTitle: "Use and licensing", privacyTitle: "Privacy and browser storage",
    touchHint: "Tap a base for details. Turn on region selection, then drag to select.",
    selectRegion: "Turn on region selection", browseMatrix: "Switch to drag navigation",
    inputRules: "At least two equal-length sequences with unique names. Use DNA (ACGT) or RNA (ACGU), without mixing T/U; use - for gaps.",
    cellFormula: "Total characters = sequences × alignment columns.",
    fasta: "Download alignment", archive: "Download full results", extraFormats: "Other compressed formats",
    fastaHint: "FASTA sequences compressed with gzip.", archiveHint: "Alignment, summary and related files in a ZIP archive.",
    downloading: "Preparing download…", downloadFailed: "Download failed. Please retry.", cancel: "Cancel",
    copyCitation: "Copy citation", copied: "Copied", copyFailed: "Copy failed. Select the text to copy it.",
    currentPaper: "Method used here", relatedPaper: "Related method paper",
    recoveryPreview: "Import task backup", recoveryHint: "Accepts a single JSON or a ZIP backup exported by EasyMSA.",
    pendingVerification: "Awaiting verification", verifyImport: "Verify and import", verifying: "Verifying…", imported: "Imported", invalidRecord: "Invalid file contents",
    unavailable: "Task inaccessible or expired", storageFailed: "Browser storage unavailable", duplicate: "Already in this list",
    completeImport: "Done", totalCells: "Total characters", columns: "columns", sequences: "sequences"
  }
} as const;
