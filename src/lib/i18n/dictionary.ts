export type Locale = "zh" | "en";

const zh = {
  nav: {
    home: "首页",
    submit: "提交任务",
    viewer: "查看 MSA",
    lookup: "查询任务",
    docs: "使用文档",
    about: "关于"
  },
  common: {
    appName: "easymsa",
    startAnalysis: "开始分析",
    viewResults: "查看结果",
    download: "下载",
    loading: "正在加载",
    error: "加载失败",
    empty: "暂无内容",
    remove: "移除",
    submit: "提交任务",
    optional: "可选",
    createdAt: "创建时间",
    updatedAt: "更新时间",
    copied: "已复制",
    copyFailed: "复制失败，请手动复制。"
  },
  footer: {
    tagline: "友好的多序列比对 Web Server 前端原型。",
    note: "前端提交任务到 EasyMSA 后端，并使用任务凭证恢复状态和结果。"
  },
  home: {
    title: "easymsa：友好的多序列比对可视化工具",
    subtitle:
      "上传或粘贴 FASTA 序列，提交任务，查看比对结果并下载结果文件。",
    intro:
      "easymsa 面向小规模多序列比对结果浏览，提供清晰的提交流程、任务状态追踪和可读的 MSA 可视化界面。",
    workflowTitle: "三步完成分析",
    workflow: [
      {
        title: "提交",
        text: "粘贴 FASTA 或上传文件，创建真实后端任务。"
      },
      {
        title: "运行",
        text: "查看输入预处理、比对运行和结果准备进度。"
      },
      {
        title: "查看",
        text: "浏览概览指标、彩色比对结果和可下载文件。"
      }
    ],
    featuresTitle: "输入方式",
    features: [
      {
        title: "粘贴 FASTA",
        text: "适合小规模序列数据，实时估计序列数量并提示格式问题。"
      },
      {
        title: "上传文件",
        text: "支持 FASTA 与压缩文件，适合更大的输入数据。"
      }
    ],
    visualTitle: "小规模 MSA 可视化",
    visualCaption: "固定序列名、横向滚动、consensus 行和柔和碱基着色。"
  },
  submit: {
    title: "提交任务",
    subtitle: "选择输入方式，提供任务名称，即可创建一个 MSA 任务。",
    jobName: "任务名称",
    jobNamePlaceholder: "例如：Kinase family alignment",
    email: "通知邮箱",
    emailPlaceholder: "name@example.com",
    inputMethod: "输入方式",
    algorithm: "比对方法",
    algorithmHint: "真实任务默认使用 MAFFT，后端会按资源配置限制线程数。",
    algorithms: {
      mafft: "MAFFT"
    },
    preprocessMode: "预处理模式",
    preprocessModes: {
      audit: "检查模式",
      filter: "过滤模式"
    },
    preprocessModeDescriptions: {
      audit: "只检测和报告可能有问题的序列，不会删除输入序列。",
      filter: "删除预处理判定有问题的序列，再进入后续比对。"
    },
    methods: {
      paste: "粘贴 FASTA",
      upload: "上传文件"
    },
    pasteLabel: "FASTA 序列",
    pastePlaceholder:
      "请在此粘贴 FASTA 格式序列，例如：\n\n>seq1\nATGCTAGCTAGC\n>seq2\nATGCTAGATAGC",
    pasteStats: "字符数：{chars}，估计序列数：{count}",
    pasteValid: "FASTA 看起来可以提交。",
    pasteInvalid: "请提供至少两条包含 header 和序列内容的 FASTA。",
    pasteHint: "建议不超过 200,000 个字符；更大的数据请使用文件上传。",
    uploadTitle: "选择或拖拽文件",
    uploadDescription:
      "支持 FASTA 文件或压缩文件。小规模数据可以直接粘贴，大规模数据建议上传压缩文件。",
    uploadBrowse: "选择文件",
    uploadDrop: "将文件拖到此处",
    uploadValid: "文件可以提交。",
    uploadEmpty: "尚未选择文件。",
    submitting: "正在提交",
    errors: {
      jobName: "请输入任务名称。",
      jobNameLength: "任务名称最多 64 个字符。",
      jobNameUnsafe:
        "任务名称只能包含中文、字母、数字、空格、下划线、连字符、点和括号，且不能包含连续两个点。",
      email: "请输入合法邮箱地址，或留空。",
      paste: "当前粘贴内容不是可提交的 FASTA。",
      upload: "请选择一个受支持的输入文件。",
      submitFailed: "提交失败，请稍后再试。"
    }
  },
  job: {
    title: "任务状态",
    subtitle: "查看后端任务的排队、预处理、比对和打包进度。",
    jobId: "任务 ID",
    jobName: "任务名称",
    currentStep: "当前步骤",
    progress: "进度",
    timeline: "任务时间线",
    logs: "运行日志",
    lookupLink: "前往任务恢复",
    access: {
      title: "任务凭证",
      description:
        "任务 ID 是你提交时填写的任务名称；访问 token 是查看任务状态和下载结果的访问密钥。请同时保存这两项，关闭页面后也可以恢复任务。",
      jobIdLabel: "任务 ID",
      jobIdHelp: "用于识别你提交的任务，允许和其他任务重名。",
      tokenLabel: "访问 token",
      tokenHelp: "用于证明你有权查看和下载这个任务的结果。",
      restoreLinkLabel: "恢复链接",
      restoreLinkHelp: "包含任务 ID 和 token，可直接打开等待页继续轮询。",
      copyJobId: "复制任务 ID",
      copyToken: "复制 token",
      copyRestoreLink: "复制恢复链接",
      copyJson: "复制任务凭证 JSON",
      downloadJson: "下载任务凭证 JSON"
    },
    preprocessSummary: {
      title: "预处理摘要",
      unavailable: "预处理摘要暂不可用，任务状态轮询不受影响。",
      modeAudit:
        "Audit 模式会报告可疑序列，但通常不会删除这些序列。",
      modeFilter:
        "Filter 模式会根据质量规则删除部分不合格序列。",
      rawSequences: "原始序列",
      cleanSequences: "清洗后序列",
      removedSequences: "删除序列",
      collapsedDuplicates: "折叠重复",
      possibleIssues: "可能有问题",
      removalReasons: "已删除原因",
      cleaningActions: "清洗操作",
      noIssues: "未发现明显 QC 警告。",
      noRemovals: "没有序列被删除。",
      noCleaning: "没有记录额外清洗操作。",
      labels: {
        low_complexity: "低复杂度",
        reference_unavailable: "参考序列不可用",
        high_n_ratio: "N 比例偏高",
        high_illegal_char_ratio: "非法字符比例偏高",
        low_similarity_outlier: "低相似度离群",
        too_short: "长度过短",
        too_long: "长度过长",
        all_n: "全 N 序列",
        duplicate_ids: "重复 ID",
        invalid_ids: "无效 ID",
        renamed_ids: "已重命名 ID",
        sequences_with_gaps: "含 gap 的序列",
        sequences_with_illegal_chars: "含非法字符的序列",
        gaps_removed: "已移除 gap",
        illegal_characters_replaced: "非法字符替换为 N",
        whitespace_removed: "已移除空白字符",
        removed: "已删除"
      }
    },
    statusLabels: {
      queued: "排队中",
      preprocessing: "正在预处理",
      aligning: "正在比对",
      packaging: "正在打包结果",
      completed: "已完成",
      failed: "失败"
    }
  },
  lookup: {
    title: "恢复任务",
    subtitle: "输入任务 ID 和访问 token，或上传任务凭证 JSON，继续查看任务状态和结果。",
    manualTitle: "手动恢复",
    manualDescription:
      "提交任务后，等待页会显示任务 ID 和访问 token。如果关闭页面，可以在这里输入两者恢复轮询。",
    jobId: "任务 ID",
    token: "访问 token",
    restore: "恢复任务",
    uploadTitle: "上传任务凭证 JSON",
    uploadDescription:
      "上传之前下载的 easymsa 任务凭证 JSON，可自动恢复对应任务。",
    chooseJson: "选择 JSON",
    missingFields: "请同时提供任务 ID 和访问 token。",
    invalidJson: "这不是有效的 easymsa 任务凭证 JSON。",
    readJsonFailed: "无法读取该 JSON 文件。"
  },
  viewerPage: {
    title: "MSA 查看器",
    subtitle: "上传或粘贴 FASTA，在本地查看序列矩阵。",
    input: "输入",
    uploadFasta: "上传 FASTA",
    pasteFasta: "粘贴 FASTA",
    pastePlaceholder: ">seq1\nATGCTAGC\n>seq2\nATG-TAGC",
    pasteStats: "字符数：{chars}，估计序列数：{count}",
    characterLimit: "上限 {limit} 字符",
    inputHint: "独立查看器只在本地解析 FASTA；长度不一致时按原始序列浏览，不执行比对。",
    viewPasted: "查看粘贴内容",
    matrix: "矩阵",
    source: "来源",
    uploadedSource: "上传的 FASTA",
    pastedSource: "粘贴的 FASTA",
    newFasta: "打开其他 FASTA",
    sequences: "序列数量",
    longestLength: "最长长度",
    lengthStatus: "长度状态",
    equalLength: "等长序列输入",
    rawSequenceView: "原始序列查看，未执行比对。",
    empty: "上传或粘贴 FASTA 后打开矩阵查看器。",
    readError: "无法读取该 FASTA 文件。"
  },
  results: {
    title: "结果",
    subtitle: "查看任务概览、比对矩阵和输出文件。",
    tabs: {
      overview: "概览与比对",
      alignment: "比对结果",
      downloads: "下载结果"
    },
    metrics: {
      sequenceCount: "序列数量",
      alignmentLength: "比对长度",
      averageIdentity: "平均一致性",
      gapPercentage: "缺口比例",
      outputSizeMB: "结果文件大小"
    },
    viewer: {
      search: "搜索序列 ID",
      searchPlaceholder: "输入序列名",
      motifSearch: "搜索 DNA/RNA 片段",
      motifPlaceholder: "搜索片段，如 ACGU",
      motifMatchCount: "片段命中 {count} 处",
      firstMotifMatch: "首个命中",
      sequenceCount: "显示 {shown} / {total} 条序列",
      alignmentLength: "比对长度 {length}",
      consensus: "consensus",
      legend: "颜色图例",
      noMatches: "没有匹配的序列。",
      noColumns: "当前列过滤没有匹配的列。",
      zoomIn: "放大",
      zoomOut: "缩小",
      resetZoom: "重置缩放",
      toggleDensity: "切换密度",
      toolGroups: {
        search: "搜索",
        view: "视图",
        columns: "列",
        sequences: "序列",
        export: "导出"
      },
      sortBy: "排序方式",
      colorScheme: "配色方案",
      columnFilter: "列过滤",
      conservation: "保守性",
      hideSequence: "隐藏序列",
      showAll: "显示全部",
      exportVisible: "导出可见 FASTA",
      exportSelectedRange: "导出选中区间",
      exportConsensusRange: "导出区间 consensus",
      hiddenCount: "已隐藏 {count} 条",
      visibleColumns: "显示 {shown} / {total} 列",
      selectedRange: "区间 {range}",
      jumpTo: "跳转到比对位置",
      jumpPlaceholder: "位置",
      position: "位置",
      detailMode: "细节模式",
      overviewMode: "全局模式",
      selectedCell: "已选中",
      selectedSequence: "序列",
      selectedPosition: "位置",
      selectedRangeLabel: "区间",
      selectedBase: "碱基",
      columnSummary: "该列组成",
      columnConservation: "保守性",
      columnGap: "缺口",
      dominantBase: "主要碱基",
      rangeLength: "区间长度",
      rangeConservation: "区间平均保守性",
      rangeGap: "区间平均缺口",
      rangeVariableColumns: "区间变异列",
      rangeConsensus: "区间 consensus",
      clearSelection: "清除选择",
      matrixNavigation: "MSA 矩阵，可用方向键移动选中位置。",
      noSelection: "点击任意碱基格查看列组成；Shift+点击选择列区间；选中后可用方向键移动。",
      emptyCell: "空",
      sort: {
        original: "原始顺序",
        name: "按名称",
        length: "按长度"
      },
      colorSchemes: {
        nucleotide: "按碱基",
        purinePyrimidine: "嘌呤/嘧啶",
        conservation: "按保守性"
      },
      columnFilters: {
        all: "全部列",
        variable: "变异列",
        conserved: "高保守列",
        lowGap: "低缺口列"
      },
      legendLabels: {
        purine: "嘌呤",
        pyrimidine: "嘧啶",
        dominant: "主要碱基",
        variant: "差异碱基",
        gapEmpty: "缺口/空位"
      },
      density: {
        comfortable: "舒适",
        compact: "紧凑"
      }
    },
    downloads: {
      title: "可下载文件",
      description: "下载后端生成的结果压缩包。"
    }
  },
  docs: {
    title: "使用文档",
    subtitle: "提交 FASTA、恢复任务并查看比对结果。",
    sections: [
      {
        title: "About easymsa",
        body: "easymsa 前端连接后端，提交 MAFFT 任务并展示比对结果。"
      },
      {
        title: "Input format",
        body: "粘贴输入应使用 FASTA 格式，每条序列包含以 > 开头的 header 和至少一行序列内容。"
      },
      {
        title: "Paste FASTA input",
        body: "小规模数据可以直接粘贴，页面会实时估计字符数与序列数量。"
      },
      {
        title: "File upload",
        body: "支持 .fasta、.fa、.fna、.zip、.gz、.tar.gz 和 .tgz 文件，建议上限 100 MB。"
      },
      {
        title: "Submit a job",
        body: "只需要填写任务名称和输入数据；当前版本不暴露复杂 MSA 参数。"
      },
      {
        title: "View job status",
        body: "任务状态页面展示输入检查、预处理、比对运行和结果准备过程。"
      },
      {
        title: "Interpret alignment results",
        body: "结果页面展示序列数量、比对长度、一致性、gap 比例和可滚动 alignment。"
      },
      {
        title: "Download results",
        body: "Downloads 标签提供 alignment FASTA、summary JSON 和结果压缩包下载。"
      }
    ]
  },
  about: {
    title: "关于 easymsa",
    subtitle: "一个面向 DNA/RNA 多序列比对的 Web 工具。",
    project:
      "本项目用于提交真实后端比对任务、恢复任务状态并查看小规模多序列比对结果。",
    version: "当前版本：MAFFT 后端任务 + MSA viewer。",
    citation: "Citation：待补充。",
    contact: "Contact：待补充。",
    repository: "GitHub repository：https://github.com/malabz/easymsa"
  }
};

const en: typeof zh = {
  nav: {
    home: "Home",
    submit: "Submit",
    viewer: "Viewer",
    lookup: "Lookup",
    docs: "Docs",
    about: "About"
  },
  common: {
    appName: "easymsa",
    startAnalysis: "Start Analysis",
    viewResults: "View Results",
    download: "Download",
    loading: "Loading",
    error: "Error",
    empty: "Nothing here yet",
    remove: "Remove",
    submit: "Submit Job",
    optional: "Optional",
    createdAt: "Created",
    updatedAt: "Updated",
    copied: "Copied",
    copyFailed: "Copy failed. Please copy manually."
  },
  footer: {
    tagline: "A friendly frontend prototype for an MSA web server.",
    note: "The frontend submits jobs to the EasyMSA backend and restores status and results with job access credentials."
  },
  home: {
    title: "easymsa: A Friendly MSA Visualization Tool",
    subtitle:
      "Upload or paste FASTA sequences, submit a job, view alignment results, and download output files.",
    intro:
      "easymsa focuses on small-scale multiple sequence alignment browsing, with a clear submission flow, job status tracking, and readable MSA visualization.",
    workflowTitle: "Analyze in three steps",
    workflow: [
      {
        title: "Submit",
        text: "Paste FASTA or upload a file to create a real backend job."
      },
      {
        title: "Run",
        text: "Follow preprocessing, alignment, and result preparation progress."
      },
      {
        title: "View",
        text: "Explore summary metrics, colored alignments, and downloadable files."
      }
    ],
    featuresTitle: "Input options",
    features: [
      {
        title: "Paste FASTA",
        text: "Best for small sequence sets, with live sequence counts and format hints."
      },
      {
        title: "Upload file",
        text: "Supports FASTA and compressed files for larger inputs."
      }
    ],
    visualTitle: "Small-scale MSA visualization",
    visualCaption: "Fixed sequence IDs, horizontal scrolling, consensus row, and soft base colors."
  },
  submit: {
    title: "Submit Job",
    subtitle: "Choose an input method, name the job, and create an MSA task.",
    jobName: "Job name",
    jobNamePlaceholder: "For example: Kinase family alignment",
    email: "Notification email",
    emailPlaceholder: "name@example.com",
    inputMethod: "Input method",
    algorithm: "Alignment method",
    algorithmHint: "Real jobs use MAFFT by default; server resource limits control thread count.",
    algorithms: {
      mafft: "MAFFT"
    },
    preprocessMode: "Preprocess mode",
    preprocessModes: {
      audit: "Audit",
      filter: "Filter"
    },
    preprocessModeDescriptions: {
      audit: "Detect and report potentially problematic sequences without removing them.",
      filter: "Remove sequences flagged during preprocessing before alignment."
    },
    methods: {
      paste: "Paste FASTA",
      upload: "Upload File"
    },
    pasteLabel: "FASTA sequences",
    pastePlaceholder:
      "Paste FASTA-formatted sequences here, for example:\n\n>seq1\nATGCTAGCTAGC\n>seq2\nATGCTAGATAGC",
    pasteStats: "Characters: {chars}, estimated sequences: {count}",
    pasteValid: "The FASTA input looks ready to submit.",
    pasteInvalid: "Provide at least two FASTA records with headers and sequence content.",
    pasteHint: "Suggested maximum is 200,000 characters; use file upload for larger datasets.",
    uploadTitle: "Choose or drop a file",
    uploadDescription:
      "FASTA and compressed files are supported. Paste input is suitable for small datasets; compressed upload is recommended for larger datasets.",
    uploadBrowse: "Choose file",
    uploadDrop: "Drop the file here",
    uploadValid: "The file is ready to submit.",
    uploadEmpty: "No file selected.",
    submitting: "Submitting",
    errors: {
      jobName: "Enter a job name.",
      jobNameLength: "Job name must be at most 64 characters.",
      jobNameUnsafe:
        "Job name may contain letters, numbers, spaces, underscores, hyphens, dots, parentheses, and Chinese characters only; it must not contain two consecutive dots.",
      email: "Enter a valid email address, or leave it blank.",
      paste: "The pasted content is not a valid FASTA input.",
      upload: "Choose a supported input file.",
      submitFailed: "Submission failed. Please try again later."
    }
  },
  job: {
    title: "Job Status",
    subtitle: "Track backend queueing, preprocessing, alignment, and packaging progress.",
    jobId: "Job ID",
    jobName: "Job name",
    currentStep: "Current step",
    progress: "Progress",
    timeline: "Timeline",
    logs: "Run log",
    lookupLink: "Go to task lookup",
    access: {
      title: "Job access",
      description:
        "The job ID is the name you submitted. The access token is the key for viewing status and downloading results. Save both so you can restore this job after closing the page.",
      jobIdLabel: "Job ID",
      jobIdHelp: "Identifies your submitted job. Multiple jobs can share the same ID.",
      tokenLabel: "Access token",
      tokenHelp: "Proves you can view and download this job's results.",
      restoreLinkLabel: "Restore link",
      restoreLinkHelp: "Includes the job ID and token, so it can reopen this waiting page.",
      copyJobId: "Copy Job ID",
      copyToken: "Copy token",
      copyRestoreLink: "Copy restore link",
      copyJson: "Copy job access JSON",
      downloadJson: "Download job access JSON"
    },
    preprocessSummary: {
      title: "Preprocess summary",
      unavailable: "Preprocess summary is unavailable; status polling continues normally.",
      modeAudit:
        "Audit mode reports suspicious sequences, but usually keeps them.",
      modeFilter:
        "Filter mode removes some sequences according to quality rules.",
      rawSequences: "Raw sequences",
      cleanSequences: "Clean sequences",
      removedSequences: "Removed sequences",
      collapsedDuplicates: "Collapsed duplicates",
      possibleIssues: "Possible issues",
      removalReasons: "Removal reasons",
      cleaningActions: "Cleaning actions",
      noIssues: "No obvious QC warnings were detected.",
      noRemovals: "No sequences were removed.",
      noCleaning: "No extra cleaning actions were recorded.",
      labels: {
        low_complexity: "Low complexity",
        reference_unavailable: "Reference unavailable",
        high_n_ratio: "High N ratio",
        high_illegal_char_ratio: "High illegal-character ratio",
        low_similarity_outlier: "Low-similarity outlier",
        too_short: "Too short",
        too_long: "Too long",
        all_n: "All-N sequence",
        duplicate_ids: "Duplicate IDs",
        invalid_ids: "Invalid IDs",
        renamed_ids: "Renamed IDs",
        sequences_with_gaps: "Sequences with gaps",
        sequences_with_illegal_chars: "Sequences with illegal characters",
        gaps_removed: "Gaps removed",
        illegal_characters_replaced: "Illegal characters replaced with N",
        whitespace_removed: "Whitespace removed",
        removed: "Removed"
      }
    },
    statusLabels: {
      queued: "Queued",
      preprocessing: "Preprocessing",
      aligning: "Aligning",
      packaging: "Packaging results",
      completed: "Completed",
      failed: "Failed"
    }
  },
  lookup: {
    title: "Restore Job",
    subtitle: "Enter the job ID and access token, or upload a job access JSON, to continue checking status and results.",
    manualTitle: "Manual restore",
    manualDescription:
      "After submitting a job, the waiting page shows the job ID and access token. If you close the page, enter both here to resume polling.",
    jobId: "Job ID",
    token: "Access token",
    restore: "Restore Job",
    uploadTitle: "Upload job access JSON",
    uploadDescription:
      "Upload the easymsa job access JSON you downloaded earlier to restore the matching job automatically.",
    chooseJson: "Choose JSON",
    missingFields: "Please provide both job ID and access token.",
    invalidJson: "This is not a valid easymsa job access JSON file.",
    readJsonFailed: "Could not read this JSON file."
  },
  viewerPage: {
    title: "MSA Viewer",
    subtitle: "Upload or paste FASTA and inspect the sequence matrix locally.",
    input: "Input",
    uploadFasta: "Upload FASTA",
    pasteFasta: "Paste FASTA",
    pastePlaceholder: ">seq1\nATGCTAGC\n>seq2\nATG-TAGC",
    pasteStats: "Characters: {chars}, estimated sequences: {count}",
    characterLimit: "Limit {limit} characters",
    inputHint: "The standalone viewer parses FASTA locally; unequal lengths are shown as raw sequences without running alignment.",
    viewPasted: "View Pasted FASTA",
    matrix: "Matrix",
    source: "Source",
    uploadedSource: "Uploaded FASTA",
    pastedSource: "Pasted FASTA",
    newFasta: "New FASTA",
    sequences: "Sequences",
    longestLength: "Longest length",
    lengthStatus: "Length status",
    equalLength: "Equal-length sequence input",
    rawSequenceView: "Raw sequence view; no alignment was performed.",
    empty: "Upload or paste FASTA to open the matrix viewer.",
    readError: "Could not read this FASTA file."
  },
  results: {
    title: "Results",
    subtitle: "Inspect the job overview, alignment matrix, and output files.",
    tabs: {
      overview: "Overview & Alignment",
      alignment: "Alignment",
      downloads: "Downloads"
    },
    metrics: {
      sequenceCount: "Number of sequences",
      alignmentLength: "Alignment length",
      averageIdentity: "Average identity",
      gapPercentage: "Gap percentage",
      outputSizeMB: "Output size"
    },
    viewer: {
      search: "Search sequence ID",
      searchPlaceholder: "Type a sequence name",
      motifSearch: "Search DNA/RNA motif",
      motifPlaceholder: "Motif, e.g. ACGU",
      motifMatchCount: "{count} motif matches",
      firstMotifMatch: "First match",
      sequenceCount: "Showing {shown} / {total} sequences",
      alignmentLength: "Alignment length {length}",
      consensus: "consensus",
      legend: "Color legend",
      noMatches: "No matching sequences.",
      noColumns: "No columns match the current column filter.",
      zoomIn: "Zoom in",
      zoomOut: "Zoom out",
      resetZoom: "Reset zoom",
      toggleDensity: "Toggle density",
      toolGroups: {
        search: "Search",
        view: "View",
        columns: "Columns",
        sequences: "Sequences",
        export: "Export"
      },
      sortBy: "Sort by",
      colorScheme: "Color scheme",
      columnFilter: "Column filter",
      conservation: "Conservation",
      hideSequence: "Hide sequence",
      showAll: "Show all",
      exportVisible: "Export visible FASTA",
      exportSelectedRange: "Export selected range",
      exportConsensusRange: "Export range consensus",
      hiddenCount: "{count} hidden",
      visibleColumns: "Showing {shown} / {total} columns",
      selectedRange: "Range {range}",
      jumpTo: "Jump to alignment position",
      jumpPlaceholder: "Position",
      position: "Position",
      detailMode: "Detail mode",
      overviewMode: "Overview mode",
      selectedCell: "Selected",
      selectedSequence: "Sequence",
      selectedPosition: "Position",
      selectedRangeLabel: "Range",
      selectedBase: "Base",
      columnSummary: "Column",
      columnConservation: "Conservation",
      columnGap: "Gap",
      dominantBase: "Dominant base",
      rangeLength: "Range length",
      rangeConservation: "Range avg conservation",
      rangeGap: "Range avg gap",
      rangeVariableColumns: "Range variable columns",
      rangeConsensus: "Range consensus",
      clearSelection: "Clear selection",
      matrixNavigation: "MSA matrix. Use arrow keys to move the selected position.",
      noSelection: "Click any base cell to inspect column composition; Shift-click to select a column range; use arrow keys after selecting.",
      emptyCell: "empty",
      sort: {
        original: "Original order",
        name: "Name",
        length: "Length"
      },
      colorSchemes: {
        nucleotide: "Nucleotide",
        purinePyrimidine: "Purine/pyrimidine",
        conservation: "Conservation"
      },
      columnFilters: {
        all: "All columns",
        variable: "Variable columns",
        conserved: "Conserved columns",
        lowGap: "Low-gap columns"
      },
      legendLabels: {
        purine: "Purine",
        pyrimidine: "Pyrimidine",
        dominant: "Dominant",
        variant: "Variant",
        gapEmpty: "Gap / empty"
      },
      density: {
        comfortable: "Comfortable",
        compact: "Compact"
      }
    },
    downloads: {
      title: "Downloadable files",
      description: "Download the result archive generated by the server."
    }
  },
  docs: {
    title: "Documentation",
    subtitle: "Submit FASTA, restore jobs, and inspect alignment results.",
    sections: [
      {
        title: "About easymsa",
        body: "easymsa connects to the backend, submits MAFFT jobs, and displays alignment results."
      },
      {
        title: "Input format",
        body: "Pasted input should use FASTA format, with each sequence containing a header line beginning with > and at least one sequence line."
      },
      {
        title: "Paste FASTA input",
        body: "Small datasets can be pasted directly. The page estimates character count and sequence count in real time."
      },
      {
        title: "File upload",
        body: "Supported files include .fasta, .fa, .fna, .zip, .gz, .tar.gz, and .tgz, with a suggested maximum of 100 MB."
      },
      {
        title: "Submit a job",
        body: "Only a job name and input data are required. This frontend intentionally avoids complex MSA parameters."
      },
      {
        title: "View job status",
        body: "The status page shows input checking, preprocessing, alignment, and result preparation."
      },
      {
        title: "Interpret alignment results",
        body: "The results page shows sequence count, alignment length, identity, gap percentage, and a scrollable alignment."
      },
      {
        title: "Download results",
        body: "The Downloads tab provides alignment FASTA, summary JSON, and a compressed result bundle."
      }
    ]
  },
  about: {
    title: "About easymsa",
    subtitle: "A web tool for DNA/RNA multiple sequence alignment.",
    project:
      "This project submits real backend alignment jobs, restores job status, and visualizes small-scale MSA results.",
    version: "Current version: MAFFT backend jobs + MSA viewer.",
    citation: "Citation: to be added.",
    contact: "Contact: to be added.",
    repository: "GitHub repository: https://github.com/malabz/easymsa"
  }
};

export type Dictionary = typeof zh;

export const dictionary: Record<Locale, Dictionary> = {
  zh,
  en
};
