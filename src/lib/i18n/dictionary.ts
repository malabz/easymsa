export type Locale = "zh" | "en";

const zh = {
  nav: {
    home: "首页",
    submit: "提交任务",
    realign: "重比对",
    examples: "示例",
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
    copyFailed: "复制失败，请手动复制。",
    retry: "重试",
    loadingPage: "正在加载页面",
    skipToContent: "跳到主要内容",
    primaryNavigation: "主要导航",
    openNavigation: "打开导航",
    closeNavigation: "关闭导航",
    toggleLanguage: "切换语言",
    appErrorTitle: "页面出现问题",
    appErrorDescription: "该页面暂时无法正常显示。你可以重试，或通过导航前往其他页面。",
    checkingService: "正在检查服务状态",
    serviceReady: "分析服务可用",
    serviceReadyDescription: "预处理与自动比对工具均可用，可以提交新任务。",
    serviceDegraded: "分析服务受限",
    serviceDegradedDescription: "部分后端工具暂不可用，请稍后再试或选择可用算法。",
    serviceOffline: "无法连接分析服务",
    serviceOfflineDescription: "当前无法访问后端，浏览本地 MSA 不受影响。",
    queueJobs: "队列 {count} 个任务",
    algorithmNames: {
      auto: "自动选择",
      minipoa: "minipoa",
      mafft: "MAFFT",
      mafft_fast: "MAFFT 快速",
      halign3: "HAlign4",
      fmalign2_mafft: "FMAlign2",
      fmalign2_halign3: "FMAlign2 + HAlign4"
    },
    algorithmAutoResolved: "自动选择（实际：{value}）"
  },
  footer: {
    tagline: "友好的多序列比对 Web 工作台。",
    note: "前端提交任务到 EasyMSA 后端，并使用任务凭证恢复状态和结果。"
  },
  home: {
    eyebrow: "面向 DNA / RNA 的在线比对工作台",
    title: "核酸多序列比对与重比对",
    subtitle:
      "上传或粘贴 FASTA 序列，提交任务，查看比对结果并下载结果文件。",
    intro:
      "上传 DNA 或 RNA 序列，自动选择比对方法，在线浏览并下载结果。",
    restoreJob: "恢复已有任务",
    workflowTitle: "三步完成分析",
    workflow: [
      {
        title: "提交",
        text: "粘贴 FASTA 或上传文件，提交比对任务。"
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
      },
      {
        title: "安全恢复",
        text: "凭任务 ID 和访问 token 在当前浏览器中恢复状态与下载结果。"
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
    emailHint: "可填写任意有效邮箱；任务完成或失败时会发送包含任务访问链接的邮件。",
    inputMethod: "输入方式",
    advancedSettings: "高级设置",
    loadExample: "载入示例",
    exampleJobName: "血红蛋白示例",
    selectedAlgorithmUnavailable: "当前选择的比对算法不可用，请在高级设置中改选可用算法。",
    algorithm: "比对方法",
    algorithmHint:
      "Auto 根据序列特征自动选择比对方法，也可手动指定。",
    adaptiveBadge: "推荐 · 自适应",
    algorithms: {
      auto: "自动选择（自适应）",
      minipoa: "minipoa",
      mafft: "MAFFT",
      halign3: "HAlign4",
      fmalign2_mafft: "FMAlign2",
      fmalign2_halign3: "FMAlign2 + HAlign4"
    },
    algorithmDescriptions: {
      auto: "根据序列特征自动选择合适的比对方法。",
      minipoa: "快速部分有序比对，适合较大的近缘序列集。",
      mafft: "经典多序列比对，提供多种模式与迭代参数。",
      halign3: "面向超大规模 DNA/RNA 的原生高速比对，内存占用较高。",
      fmalign2_mafft: "FMAlign2 框架内置 MAFFT 后端，两步式加速比对。",
      fmalign2_halign3: "FMAlign2 框架内置 HAlign4 后端，适合大体量数据。"
    },
    dataFitLabel: "适用数据",
    algorithmDataFit: {
      auto: "DNA/RNA；适用于约 50–10,000 条序列、长度中位数约 495–10,000 的训练域，超出时回退 minipoa。",
      minipoa: "中等规模、序列相似度较高的数据集，速度快。",
      mafft: "数百至数千条中等长度序列的通用场景。",
      halign3: "超大规模且整体相似的 DNA/RNA，内存占用高。",
      fmalign2_mafft: "大体量数据的加速管线，内置 MAFFT 后端。",
      fmalign2_halign3: "超大规模且高相似数据的加速管线，内置 HAlign4 后端。"
    },
    algorithmParameters: {
      title: "算法参数",
      hint: "参数仅应用于当前任务。留空时由服务器按资源情况选择推荐值。",
      reset: "恢复服务器默认值",
      serverDefault: "服务器默认",
      thread: "线程数",
      threadHint: "请输入大于等于 1 的整数；留空时由服务器自动分配。",
      threadHintWithMax: "可填写 1–{max}；留空时由服务器自动分配。",
      mafftMode: "MAFFT 运行模式",
      mafftModes: {
        auto: "自动（--auto）",
        fast: "快速模式",
        localpair: "局部配对（--localpair）",
        globalpair: "全局配对（--globalpair）"
      },
      mafftModeDescriptions: {
        auto: "由 MAFFT 根据输入规模自动选择策略。",
        fast: "不启用高精度配对策略，适合更快的初步分析。",
        localpair: "使用局部配对信息，适合包含局部同源区域的序列。",
        globalpair: "使用全局配对信息，适合长度接近且整体同源的序列。"
      },
      maxiterate: "最大迭代次数",
      maxiterateHint: "允许 0–1000；增加迭代可能提高精度，也会增加运行时间。",
      reorder: "按比对结果重新排序",
      reorderHint: "允许 MAFFT 改变输出序列顺序；关闭时尽量保留输入顺序。",
      errors: {
        threadInteger: "线程数必须是整数。",
        threadRange: "线程数超出服务器允许范围。",
        maxiterateInteger: "最大迭代次数必须是整数。",
        maxiterateRange: "最大迭代次数必须在 0–1000 之间。"
      }
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
      "支持 FASTA 文件、FASTA 的 gz/xz/bz2 压缩文件，以及 zip/tar/tar.gz/tar.xz/tar.bz2 压缩包；压缩包内可包含多个 FASTA。",
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
      algorithmParams: "请检查高级设置中的算法参数。",
      submitFailed: "提交失败，请稍后再试。"
    }
  },
  job: {
    title: "任务状态",
    subtitle: "查看后端任务的排队、预处理、比对和打包进度。",
    jobId: "任务 ID",
    jobName: "任务名称",
    algorithmLabel: "比对方法",
    currentStep: "当前步骤",
    progress: "进度",
    timeline: "任务时间线",
    logs: "运行日志",
    lookupLink: "前往任务恢复",
    missingJobId: "缺少任务 ID。",
    missingAccess: "缺少此任务的访问 token。请前往任务恢复页输入任务 ID 与 token，或上传任务凭证 JSON。",
    loadingStatus: "正在读取任务状态",
    polling: "状态会每 3 秒自动更新",
    updating: "正在更新任务状态",
    logEntries: {
      jobStatus: "任务 {jobId} 当前状态：{status}。",
      preprocess: "预处理：{status}{mode}。",
      algorithm: "比对方法：{value}。",
      failure: "失败 {code}：{message}",
      preprocessError: "预处理错误：{message}",
      exitCode: "MSA 工具退出码：{value}",
      timeout: "MSA 工具超时：{value} 秒",
      executionError: "MSA 工具执行错误：{value}",
      binary: "MSA 工具路径：{value}",
      mode: "MSA 参数模式：{value}",
      algorithmDetail: "请求的比对方法：{value}",
      toolLog: "MSA 工具错误输出：",
      expiresAt: "结果过期时间：{value}。"
    },
    email: {
      title: "邮件通知",
      error: "发送错误",
      statuses: {
        pending: "等待任务结束后发送",
        sent: "已发送",
        failed: "发送失败",
        skipped: "未发送"
      }
    },
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
      showToken: "显示敏感信息",
      hideToken: "隐藏敏感信息",
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
      realigning: "正在重比对",
      packaging: "正在打包结果",
      completed: "已完成",
      failed: "失败"
    }
  },
  lookup: {
    title: "恢复任务",
    subtitle: "从当前浏览器已保存的任务中，继续查看进度和结果。",
    cachedTitle: "已缓存任务",
    cachedDescription:
      "这些任务凭证只保存在当前浏览器。删除缓存不会影响服务器任务。",
    cachedEmpty:
      "当前浏览器还没有保存的任务。可使用下方的任务凭证恢复。",
    cachedOrder: "最近创建的任务在前",
    otherMethods: "其他恢复方式",
    otherMethodsHint: "任务 ID 与凭证 · JSON 文件",
    importHint: "也可导入之前下载的任务凭证。",
    importJson: "导入凭证 JSON",
    cachedRestore: "恢复",
    cachedDelete: "删除缓存",
    cachedCreatedAt: "创建时间",
    cachedToken: "token 标识",
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
    inputHint: "独立查看器只在本地解析 FASTA；本地文件上限为 1 MiB，粘贴文本上限为 200,000 字符。长度不一致时按原始序列浏览，不执行比对。",
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
    readError: "无法读取该 FASTA 文件。",
    fileTooLarge: "文件过大。请使用不超过 {limit} 字节的 FASTA 文件。",
    inputErrors: {
      decode: "无法将文件解码为 UTF-8 文本。",
      empty: "FASTA 输入为空。",
      invalid: "FASTA 格式无效；请检查 header 与序列内容。",
      worker: "本地 FASTA 解析失败，请重试。",
      protocol: "查看器解析组件版本不匹配，请刷新页面后重试。"
    }
  },
  results: {
    title: "结果",
    subtitle: "查看任务概览、比对矩阵和输出文件。",
    missingJobId: "缺少任务 ID。",
    missingAccess: "缺少此任务的访问 token。请前往任务恢复页输入凭证。",
    lookupLink: "前往任务恢复",
    loading: {
      overview: "正在读取结果概览",
      alignment: "正在读取比对预览",
      viewer: "正在载入 MSA 查看器"
    },
    tabs: {
      overview: "概览",
      alignment: "比对结果",
      downloads: "下载结果"
    },
    metrics: {
      sequenceCount: "序列数量",
      alignmentLength: "比对长度",
      averageIdentity: "平均一致性",
      gapPercentage: "缺口比例",
      averageConservation: "平均保守性",
      averageEntropy: "平均归一化 entropy",
      variableColumns: "变异列数",
      averageCoverage: "平均覆盖率",
      gcContent: "GC 比例",
      highGapColumns: "高缺口列数"
    },
    overview: {
      completed: "分析完成",
      title: "比对结果科研概览",
      description: "{sequences} 条序列已比对至 {columns} 个位置。这里汇总预处理、比对质量和结果产物。",
      unavailable: "未提供",
      actions: {
        openAlignment: "查看比对矩阵",
        openDownloads: "下载结果"
      },
      summary: {
        title: "结果摘要",
        description: "服务端结果与完整可视化预览的核心质量指标。",
        algorithm: "比对方法"
      },
      preprocess: {
        title: "预处理概况",
        description: "查看输入序列经过质量控制后的留存情况与运行配置。",
        raw: "原始序列",
        retained: "保留序列",
        removed: "移除序列",
        retentionRate: "序列留存率",
        mode: "模式",
        strictness: "严格度",
        unavailable: "该任务没有提供完整的预处理计数，已保留可用的配置数据。",
        values: {
          audit: "审计",
          filter: "过滤",
          strict: "严格",
          normal: "标准",
          lenient: "宽松"
        }
      },
      science: {
        title: "科研分析",
        description: "基于完整可视化比对在 Worker 中计算，不使用抽样数据。",
        calculating: "正在后台计算比对质量统计",
        failed: "比对预览无法加载，因此暂时不能计算科研统计；预处理和输出产物信息仍然有效。",
        truncated: "该比对超过预览上限，完整结果可下载。",
        empty: "当前没有可用于计算科研统计的比对序列。",
        qualityProfile: "全长质量轨道",
        qualityChartLabel: "比对全长保守性、缺口比例和 Shannon entropy 质量轨道",
        qualityChartSummary: "该图汇总全部 {columns} 个比对位置的保守性、缺口比例和 Shannon entropy。",
        baseComposition: "碱基与缺口组成",
        compositionNote: "组成比例以全部比对单元格为分母；GC 比例仅以 A、C、G、T、U 为分母。",
        bases: {
          A: "A",
          C: "C",
          G: "G",
          T: "T",
          U: "U",
          N: "N",
          other: "其他模糊字符",
          gap: "Gap"
        }
      },
      outputs: {
        title: "输出产物",
        description: "服务端已生成 {count} 个结果文件，可前往下载页获取归档和比对文件。",
        empty: "服务端没有返回具体的输出文件清单。",
        groups: {
          preprocess: "预处理产物",
          alignment: "比对产物",
          logs: "运行日志"
        }
      }
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
      calculating: "正在后台计算大规模比对的保守性统计",
      neutralTitle: "中性只读浏览模式",
      neutralDescription: "当前输入仍可浏览、搜索名称并下载原始 FASTA，但不会显示核酸专属统计。",
      stageTwo: {
        advanced: "高级视图与导出",
        commandBar: "MSA 科研工作区命令栏",
        statusChips: "当前查看器与分析状态",
        settings: "工作区设置",
        moreTools: "更多工具",
        closeSettings: "关闭设置",
        settingsDescription: "配置视图、质量轨道、序列操作和导出；当前分析范围会持续显示在状态栏。",
        settingsGroups: {
          view: "视图",
          location: "定位",
          workspace: "工作区",
          qc: "质量分析",
          rows: "序列与批量操作",
          export: "导出"
        },
        qc: "QC",
        closeQc: "关闭 QC",
        resizeDock: "调整侧边面板宽度",
        exportWorkspace: "导出",
        expandWorkspace: "展开工作区",
        exitWorkspace: "退出工作区",
        resetView: "重置视图",
        viewMode: "矩阵显示模式",
        labelWidth: "序列标签宽度",
        minimap: "显示概览导航",
        rangeSelectionMode: "触屏范围选择模式",
        rangeSelectionHint: "关闭时单指用于平移，轻点用于选中；开启后拖动可选择连续区间。",
        rangeStatsFailed: "区间统计计算失败，请重新选择区间后重试。",
        rowActions: "{name} 行操作",
        consensusTie: "多数 consensus 平票",
        analysisScope: "分析范围",
        analysisScopes: {
          all: "全部行",
          visible: "当前可见行",
          selected: "明确选中行"
        },
        scopeChip: "分析：{scope}（{count} 行）",
        clearScope: "恢复全部行分析",
        referenceChip: "参考：{value}",
        differenceChip: "参考差异视图",
        disableDifference: "关闭参考差异视图",
        columnFilterChip: "列过滤：{value}",
        clearColumnFilter: "清除列过滤",
        hiddenChip: "隐藏 {count} 行",
        selectedRowsChip: "选中 {count} 行",
        clearSelectedRows: "清除已选行",
        rangeChip: "选区：{range}",
        trackChip: "轨道：{value}",
        hideTrack: "关闭 {value} 轨道",
        motifMatchMode: "Motif 匹配规则",
        motifMatchModes: {
          strict: "严格匹配",
          possible: "可能匹配"
        },
        motifStrandMode: "Motif 链方向",
        motifStrandModes: {
          forward: "仅正向链",
          both: "搜索双链"
        },
        motifCoordinates: "{strand} 链 · 比对 {alignment} · 序列 {sequence}",
        motifErrors: {
          invalid: "Motif 包含非法字符：{characters}。只允许 DNA/RNA IUPAC 字符；空白会自动移除，gap 不允许。",
          failed: "Motif 搜索失败，请修改查询后重试。"
        },
        analysisFailed: "比对分析失败，请重新载入该数据源后重试。",
        selectAllVisible: "全选可见",
        hideSelected: "隐藏选中",
        pinSelected: "固定选中",
        unpinSelected: "取消固定",
        undoHide: "撤销隐藏",
        qcPanel: {
          title: "序列 QC",
          reviewOnly: "自动结果仅作为 QC 候选供复核；不会自动删除序列或改变源比对。",
          scope: "分析范围",
          rows: "序列",
          columns: "列",
          candidates: "QC 候选",
          search: "搜索序列名称",
          sort: "序列排序",
          ascending: "升序",
          descending: "降序",
          name: "名称",
          length: "非 gap 长度",
          gap: "缺口比例",
          ambiguity: "模糊碱基比例",
          gc: "GC 比例",
          identity: "一致性",
          comparisonTarget: "QC 比较对象",
          explicitReference: "明确指定的参考序列",
          scopeConsensus: "当前分析范围 consensus",
          differences: "差异数",
          review: "复核",
          direction: "方向",
          originalOrder: "原始顺序",
          combinedFilters: "组合行筛选",
          candidateRules: "QC 候选规则（留空表示关闭）",
          columnRules: "自定义列筛选（修改后自动启用）",
          minimumLength: "最小非 gap 长度",
          maximumLength: "最大非 gap 长度",
          maximumGap: "最大缺口比例",
          maximumAmbiguity: "最大模糊碱基比例",
          minimumGc: "最小 GC 比例",
          maximumGc: "最大 GC 比例",
          minimumIdentity: "最小一致性",
          maximumDifferences: "最大差异数",
          minimumConservation: "最小保守性",
          minimumCoverage: "最小 coverage",
          maximumEntropy: "最大归一化 entropy",
          maximumColumnAmbiguity: "最大列模糊碱基比例",
          status: "状态",
          showingRows: "筛选后共有 {total} 行，当前显示前 {shown} 行。",
          distributions: "序列级指标分布",
          distributionSummary: "{metric}：{count} 个观测；最小 {min}，中位数 {median}，最大 {max}。"
        },
        annotationPanel: {
          title: "QC 人工标记",
          reviewOnly: "“排除候选”只是复核标记，不会改变分析范围或源比对。",
          category: "类别",
          sequenceRow: "序列行",
          all: "全部",
          allRows: "全部序列",
          containsPosition: "包含比对位置",
          previous: "上一条",
          next: "下一条",
          noMatches: "没有匹配标记",
          newAnnotation: "新建标记",
          selectTarget: "请先选择序列、列或区间",
          optionalNote: "可选备注",
          add: "添加",
          delete: "删除",
          updated: "更新于",
          note: "备注",
          review: "复核",
          excludeCandidate: "排除候选"
        },
        analysisTracks: "分析轨道",
        activeTracks: "显示轨道",
        reference: "参考序列",
        noReference: "尚未选择参考序列",
        setReference: "设为参考序列",
        clearReference: "清除参考序列",
        referencePosition: "参考坐标",
        alignmentPosition: "比对坐标",
        coordinateMode: "坐标模式",
        differenceMode: "差异视图",
        consensusMode: "Consensus 模式",
        majorityConsensus: "多数规则",
        iupacConsensus: "IUPAC 模糊码",
        pinSequence: "固定序列",
        unpinSequence: "取消固定",
        selectSequence: "选择序列",
        selectedRows: "已选 {count} 行",
        exportSelectedRows: "导出选中行",
        inspector: "分析检查器",
        openInspector: "打开分析检查器",
        closeInspector: "关闭分析检查器",
        overviewNavigator: "比对概览导航",
        previousMotif: "上一个命中",
        nextMotif: "下一个命中",
        motifResult: "命中 {current} / {total}",
        motifHits: "片段命中列表",
        motifStoredLimit: "共命中 {total} 处；仅保留前 {stored} 处用于导航",
        searchingMotif: "正在搜索片段",
        canvasOverview: "Canvas 全局模式",
        domDetail: "DOM 细节模式",
        shortcutHint: "方向键移动；Shift 扩展范围；空格选择序列；P 固定；R 设为参考；H 隐藏。",
        tracks: {
          conservation: "保守性",
          gap: "缺口比例",
          coverage: "覆盖率",
          entropy: "Shannon entropy"
        },
        stats: {
          baseComposition: "碱基组成",
          gcContent: "GC 比例",
          averageEntropy: "平均归一化 entropy",
          averageCoverage: "平均覆盖率",
          mismatches: "替换",
          insertions: "插入",
          deletions: "缺失",
          transitions: "转换",
          transversions: "颠换"
        },
        differences: {
          match: "与参考一致",
          compatibleAmbiguity: "模糊码相容",
          substitution: "确定性替换",
          mismatch: "替换",
          insertion: "相对参考插入",
          deletion: "相对参考缺失",
          empty: "双方均为空",
          unknown: "未知字符",
          unclassifiedSubstitution: "未分类替换"
        }
      },
      scienceV2: {
        semanticsVersion: "核酸统计语义 nucleotide-v2",
        alphabets: {
          dna: "DNA",
          rna: "RNA",
          nucleotide: "混合 T/U 核酸",
          protein: "蛋白质",
          unknown: "未知字母表"
        },
        alignmentModes: {
          aligned: "等长核酸比对",
          rawUnequal: "非等长原始序列",
          neutral: "中性只读浏览"
        },
        warnings: {
          duplicateHeaders: "检测到重复 FASTA header；各行仍通过内部 rowKey 独立操作。",
          mixedTu: "同时检测到 T 和 U；显示保留原字符，统计时按统一核酸状态归一化。",
          normalizedGaps: "规范化指纹已将句点（.）统一为 gap（-）并统一字符大小写。",
          browserContentHash: "服务器结果只记录浏览器取得内容的规范化比对哈希，不代表服务端原文件哈希。"
        },
        neutralTitle: "中性只读浏览模式",
        neutralDescription: "当前输入仍可浏览、搜索名称并下载原始 FASTA，但不会显示核酸专属统计。",
        neutralReasons: {
          protein: "检测到蛋白质特异残基；本轮不对蛋白质计算 GC、consensus、entropy、保守性或 Ti/Tv。",
          unknown: "无法可靠判断序列字母表；为避免误导，已停用核酸专属统计。",
          rawUnequal: "FASTA 序列长度不一致；尾部空白不会被解释为 gap、deletion 或低覆盖。",
          invalidSymbols: "输入含非法字符；请修正输入后再运行核酸分析。"
        },
        scopeRows: "当前分析范围：{scope}，实际 {count} 行",
        unavailable: "不可用",
        metrics: {
          coverage: "覆盖率",
          informativeCoverage: "信息性覆盖率",
          gapFraction: "缺口比例",
          ambiguityFraction: "模糊碱基比例",
          unknownFraction: "未知字符比例",
          conservation: "保守性",
          entropyBits: "Shannon entropy（bits）",
          normalizedEntropy: "归一化 entropy",
          gc: "GC 比例",
          validComparisons: "有效比较数",
          unknownComparisons: "未知比较数",
          differenceRate: "差异率",
          unclassifiedSubstitutions: "未分类替换"
        },
        formulas: {
          coverage: "覆盖率 = 非 gap 行数 / 总行数。",
          informativeCoverage: "信息性覆盖率 = 确定性 A/C/G/T(U) 行数 / 总行数。",
          conservation: "保守性 = 最多确定性碱基计数 / 确定性碱基总数；无确定性碱基时不可用。",
          entropy: "Entropy = -Σ p log₂(p)，仅使用确定性碱基；归一化 entropy = entropy / 2。",
          gc: "GC = (G + C) / (A + C + G + T/U)，模糊码与 gap 不进入分母。",
          variable: "变异列表示至少观察到两种确定性碱基；模糊码本身不制造变异。",
          titv: "Ti/Tv 仅统计双方均为确定性单碱基的替换。",
          differenceRate: "差异率 = substitution + insertion + deletion / 有效比较数；同时报告绝对计数。",
          compatibleAmbiguity: "两个合法 IUPAC 集合有交集但不属于相同确定性单碱基时，记为模糊码相容。"
        },
        qc: {
          candidate: "QC 候选",
          needsReview: "需复核",
          noAutomaticExclusion: "QC 结果不会自动删除序列或改变源比对。",
          annotationCategories: {
            note: "备注",
            review: "复核",
            excludeCandidate: "排除候选"
          }
        }
      },
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
      imageExport: {
        button: "导出 / QC bundle",
        title: "导出 MSA 与 QC bundle",
        description: "按统一的行列范围导出 FASTA、SVG 或 PNG；推荐同时保存 manifest 与行列映射。",
        preset: "一键成品",
        presets: {
          paper: "论文矢量 SVG",
          presentation: "汇报高清 PNG",
          custom: "自定义",
          paperHint: "可编辑矢量、自动换行，适合论文排版与长期归档。",
          presentationHint: "高对比 3× PNG，适合 PPT、海报和图片分享。"
        },
        format: "格式",
        svg: "SVG",
        png: "PNG",
        region: "范围",
        regions: {
          visible: "当前视窗",
          full: "全部可见数据",
          selection: "选中区间",
          viewport: "当前屏幕",
          selectedInterval: "连续选中区间",
          filteredView: "完整筛选视图",
          fullAlignment: "原始完整比对"
        },
        layoutMode: "布局",
        layoutModes: {
          singleLine: "单行",
          wrapped: "换行"
        },
        wrapModes: {
          auto: "自动换行",
          fixed: "固定每行列数",
          single: "保持单行"
        },
        wrapColumns: "每行列数",
        include: "包含内容",
        sequenceNames: "序列名称",
        coordinates: "坐标",
        conservation: "当前分析轨道",
        consensus: "consensus",
        legend: "颜色图例",
        annotations: "注释/feature",
        annotationsUnavailable: "暂无数据",
        output: "输出",
        filename: "文件名",
        scale: "PNG 缩放",
        scaleAdjusted: "为满足浏览器安全上限，实际导出倍率已从 {requested}× 调整为 {resolved}×。",
        background: "背景",
        transparentBackground: "透明背景",
        estimate: "预估",
        sizeEstimate: "{rows} 行 · {columns} 列 · {width}×{height} px",
        fastaEstimate: "{rows} 行 · {columns} 个导出列",
        blockEstimate: "{count} 个区块",
        pageEstimate: "将输出 {count} 个编号页面；每页重复名称、坐标和轨道。",
        pngEstimate: "PNG {width}×{height} px · {mp} MP",
        noSelectionHint: "先在矩阵中选择列区间，才能导出选中区间。",
        preview: "导出缩略预览",
        progress: "导出进度 {value}%",
        cancelExport: "取消导出",
        bundle: {
          title: "复现信息",
          qcBundle: "QC bundle（推荐）",
          bare: "仅裸文件",
          qcHint: "ZIP 同时保存主文件、manifest、行映射、列映射和已有 QC 标记。",
          bareWarning: "仅导出主文件，不包含完整来源、筛选范围和行列映射。"
        },
        export: "导出",
        exporting: "导出中",
        cancel: "取消",
        errors: {
          noData: "当前没有可导出的矩阵数据。",
          selectionRequired: "请先选择一个列区间。",
          limitExceeded: "PNG 尺寸超过安全上限。",
          pngDimensionLimit: "PNG 将创建 {width} × {height} px 的画布，超过单边 {limit} px 的安全上限。",
          pngPixelLimit: "PNG 将创建 {actual} MP 的画布，超过 {limit} MP 的安全上限。",
          svgCellLimit: "SVG 将渲染 {actual} 个残基单元格，超过 {limit} 个的安全上限。",
          svgByteLimit: "SVG 预计为 {actual} MB，超过 {limit} MB 的安全上限。",
          failed: "导出失败，请调整范围或格式后重试。"
        }
      },
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
        length: "按长度",
        gap: "按缺口比例",
        ambiguity: "按模糊碱基比例",
        gc: "按 GC 比例",
        identity: "按参考一致性"
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
        lowGap: "低缺口列",
        custom: "自定义条件"
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
    eyebrow: "面向科研用户的 EasyMSA 指南",
    title: "使用文档",
    subtitle: "从 FASTA 输入、预处理和任务恢复，到科研结果解读、reference 差异分析与导出。",
    searchLabel: "搜索使用文档",
    searchPlaceholder: "搜索 FASTA、reference、entropy、导出……",
    searchHint: "搜索章节标题、正文、功能名称和常见问题。按 Ctrl/⌘ + K 可随时聚焦。",
    clearSearch: "清除文档搜索",
    searchResultsTitle: "搜索结果",
    searchResultsCount: "找到 {count} 项",
    noSearchResults: "没有找到匹配内容",
    noSearchResultsHint: "尝试更短的关键词，或使用 FASTA、token、reference、motif 等功能名称。",
    quickActionsTitle: "快捷入口",
    quickActions: {
      submit: {
        title: "提交任务",
        description: "创建新的多序列比对"
      },
      viewer: {
        title: "打开查看器",
        description: "在本地浏览 FASTA"
      },
      lookup: {
        title: "恢复任务",
        description: "使用 ID 和 token 继续"
      }
    },
    tocTitle: "文档目录",
    tocLabel: "文档章节导航",
    mobileToc: "展开文档目录",
    copyCode: "复制示例",
    copiedCode: "已复制",
    copyFailed: "复制失败"
  },
  about: {
    title: "关于 easymsa",
    subtitle: "一个面向 DNA/RNA 多序列比对的 Web 工具。",
    project:
      "提供核酸比对与重比对、任务恢复和交互式结果查看。",
    version: "当前版本：自适应 Auto、MiniPOA、MAFFT、HAlign4、FMAlign2、可选 ReAlign-N 与交互结果。",
    citation: "引用：发表研究时，建议引用实际使用的方法及软件。",
    contact: "联系：问题与建议请通过 GitHub Issues 提交。",
    repository: "GitHub repository：https://github.com/malabz/easymsa"
  }
};

const en: typeof zh = {
  nav: {
    home: "Home",
    submit: "Submit",
    realign: "Realign",
    examples: "Examples",
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
    copyFailed: "Copy failed. Please copy manually.",
    retry: "Retry",
    loadingPage: "Loading page",
    skipToContent: "Skip to main content",
    primaryNavigation: "Primary navigation",
    openNavigation: "Open navigation",
    closeNavigation: "Close navigation",
    toggleLanguage: "Switch language",
    appErrorTitle: "Something went wrong",
    appErrorDescription: "This page could not be displayed. Retry or use the navigation to open another page.",
    checkingService: "Checking service availability",
    serviceReady: "Analysis service ready",
    serviceReadyDescription: "Preprocessing and automatic alignment tools are available for new jobs.",
    serviceDegraded: "Analysis service limited",
    serviceDegradedDescription: "Some backend tools are unavailable. Try again later or choose an available algorithm.",
    serviceOffline: "Analysis service unreachable",
    serviceOfflineDescription: "The backend cannot be reached. Local MSA viewing remains available.",
    queueJobs: "{count} jobs queued",
    algorithmNames: {
      auto: "Auto",
      minipoa: "minipoa",
      mafft: "MAFFT",
      mafft_fast: "MAFFT fast",
      halign3: "HAlign4",
      fmalign2_mafft: "FMAlign2",
      fmalign2_halign3: "FMAlign2 + HAlign4"
    },
    algorithmAutoResolved: "Auto (actual: {value})"
  },
  footer: {
    tagline: "A friendly web workspace for multiple sequence alignment.",
    note: "The frontend submits jobs to the EasyMSA backend and restores status and results with job access credentials."
  },
  home: {
    eyebrow: "Online alignment workspace for DNA / RNA",
    title: "Nucleotide alignment and refinement",
    subtitle:
      "Upload or paste FASTA sequences, submit a job, view alignment results, and download output files.",
    intro:
      "Upload DNA or RNA sequences, automatically select an alignment method, and explore and download your results.",
    restoreJob: "Restore Existing Job",
    workflowTitle: "Analyze in three steps",
    workflow: [
      {
        title: "Submit",
        text: "Paste FASTA or upload a file to submit an alignment job."
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
      },
      {
        title: "Secure restore",
        text: "Use a job ID and access token to restore status and downloads in this browser."
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
    emailHint: "Use any valid email address; EasyMSA will email a job access link when the task completes or fails.",
    inputMethod: "Input method",
    advancedSettings: "Advanced settings",
    loadExample: "Load example",
    exampleJobName: "Hemoglobin example",
    selectedAlgorithmUnavailable: "The selected alignment algorithm is unavailable. Choose an available algorithm in advanced settings.",
    algorithm: "Alignment method",
    algorithmHint:
      "Auto selects an alignment method based on sequence features. You can also choose a method manually.",
    adaptiveBadge: "Recommended · Adaptive",
    algorithms: {
      auto: "Auto (adaptive)",
      minipoa: "minipoa",
      mafft: "MAFFT",
      halign3: "HAlign4",
      fmalign2_mafft: "FMAlign2",
      fmalign2_halign3: "FMAlign2 + HAlign4"
    },
    algorithmDescriptions: {
      auto: "Automatically selects a suitable method based on sequence features.",
      minipoa: "Fast partial-order alignment for larger, closely related sequence sets.",
      mafft: "Classic multiple sequence alignment with multiple modes and iteration parameters.",
      halign3: "Native high-speed alignment for ultra-large DNA/RNA datasets; higher memory usage.",
      fmalign2_mafft: "FMAlign2 framework with a built-in MAFFT backend.",
      fmalign2_halign3: "FMAlign2 framework with a built-in HAlign4 backend for large datasets."
    },
    dataFitLabel: "Data fit",
    algorithmDataFit: {
      auto: "DNA/RNA; fits the adaptive training domain of roughly 50–10,000 sequences with median length about 495–10,000, falling back to minipoa outside it.",
      minipoa: "Medium-sized datasets with closely related sequences; fast.",
      mafft: "General-purpose use with hundreds to thousands of medium-length sequences.",
      halign3: "Ultra-large, globally similar DNA/RNA sets; high memory usage.",
      fmalign2_mafft: "Accelerated pipeline for large datasets with a built-in MAFFT backend.",
      fmalign2_halign3: "Accelerated pipeline for ultra-large, high-similarity data with a built-in HAlign4 backend."
    },
    algorithmParameters: {
      title: "Algorithm parameters",
      hint: "Parameters apply to this job only. Leave a field blank to let the server choose its recommended value for available resources.",
      reset: "Restore server defaults",
      serverDefault: "Server default",
      thread: "Threads",
      threadHint: "Enter an integer of 1 or greater, or leave blank for automatic server allocation.",
      threadHintWithMax: "Enter 1–{max}, or leave blank for automatic server allocation.",
      mafftMode: "MAFFT mode",
      mafftModes: {
        auto: "Automatic (--auto)",
        fast: "Fast",
        localpair: "Local pair (--localpair)",
        globalpair: "Global pair (--globalpair)"
      },
      mafftModeDescriptions: {
        auto: "Let MAFFT select a strategy based on the input size.",
        fast: "Skip high-accuracy pairwise strategies for a faster initial analysis.",
        localpair: "Use local pairwise information for sequences with local homology.",
        globalpair: "Use global pairwise information for similar-length, globally homologous sequences."
      },
      maxiterate: "Maximum iterations",
      maxiterateHint: "Allowed range: 0–1000. More iterations can improve accuracy but increase runtime.",
      reorder: "Reorder aligned sequences",
      reorderHint: "Allow MAFFT to change output sequence order; leave off to preserve input order where possible.",
      errors: {
        threadInteger: "Threads must be an integer.",
        threadRange: "Threads exceed the range allowed by the server.",
        maxiterateInteger: "Maximum iterations must be an integer.",
        maxiterateRange: "Maximum iterations must be between 0 and 1000."
      }
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
      "Supports FASTA files, gz/xz/bz2-compressed FASTA files, and zip/tar/tar.gz/tar.xz/tar.bz2 archives containing one or more FASTA files.",
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
      algorithmParams: "Check the algorithm parameters in advanced settings.",
      submitFailed: "Submission failed. Please try again later."
    }
  },
  job: {
    title: "Job Status",
    subtitle: "Track backend queueing, preprocessing, alignment, and packaging progress.",
    jobId: "Job ID",
    jobName: "Job name",
    algorithmLabel: "Alignment method",
    currentStep: "Current step",
    progress: "Progress",
    timeline: "Timeline",
    logs: "Run log",
    lookupLink: "Go to task lookup",
    missingJobId: "Missing job ID.",
    missingAccess: "The access token is missing. Enter the job ID and token on the lookup page, or upload the job access JSON.",
    loadingStatus: "Loading job status",
    polling: "Status refreshes automatically every 3 seconds",
    updating: "Updating job status",
    logEntries: {
      jobStatus: "Job {jobId} is {status}.",
      preprocess: "Preprocess {status}{mode}.",
      algorithm: "Algorithm: {value}.",
      failure: "Failure {code}: {message}",
      preprocessError: "Preprocess error: {message}",
      exitCode: "MSA tool exit code: {value}",
      timeout: "MSA tool timed out after {value} seconds",
      executionError: "MSA tool execution error: {value}",
      binary: "MSA tool binary: {value}",
      mode: "MSA parameter mode: {value}",
      algorithmDetail: "Requested alignment method: {value}",
      toolLog: "MSA tool stderr:",
      expiresAt: "Expires at {value}."
    },
    email: {
      title: "Email notification",
      error: "Send error",
      statuses: {
        pending: "Waiting for job completion",
        sent: "Sent",
        failed: "Failed to send",
        skipped: "Not sent"
      }
    },
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
      showToken: "Show sensitive data",
      hideToken: "Hide sensitive data",
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
      realigning: "Realigning",
      packaging: "Packaging results",
      completed: "Completed",
      failed: "Failed"
    }
  },
  lookup: {
    title: "Restore Job",
    subtitle: "Resume a saved job from this browser to view its progress and results.",
    cachedTitle: "Cached jobs",
    cachedDescription:
      "These job credentials are stored only in this browser. Deleting a cache entry does not affect the server job.",
    cachedEmpty:
      "No jobs saved in this browser yet. Use your job credentials below to restore one.",
    cachedOrder: "Newest first",
    otherMethods: "Other recovery options",
    otherMethodsHint: "Job ID and token · JSON file",
    importHint: "Or import a previously downloaded credentials file.",
    importJson: "Import credentials JSON",
    cachedRestore: "Restore",
    cachedDelete: "Delete cache",
    cachedCreatedAt: "Created",
    cachedToken: "Token",
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
    inputHint: "The standalone viewer parses FASTA locally: local files are limited to 1 MiB and pasted text to 200,000 characters. Unequal lengths are shown as raw sequences without running alignment.",
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
    readError: "Could not read this FASTA file.",
    fileTooLarge: "The file is too large. Use a FASTA file no larger than {limit} bytes.",
    inputErrors: {
      decode: "The file could not be decoded as UTF-8 text.",
      empty: "The FASTA input is empty.",
      invalid: "The FASTA format is invalid. Check headers and sequence content.",
      worker: "Local FASTA parsing failed. Try again.",
      protocol: "The viewer parser version does not match. Refresh the page and try again."
    }
  },
  results: {
    title: "Results",
    subtitle: "Inspect the job overview, alignment matrix, and output files.",
    missingJobId: "Missing job ID.",
    missingAccess: "The access token is missing. Enter the credentials on the lookup page.",
    lookupLink: "Go to task lookup",
    loading: {
      overview: "Loading result overview",
      alignment: "Loading alignment preview",
      viewer: "Loading MSA viewer"
    },
    tabs: {
      overview: "Overview",
      alignment: "Alignment",
      downloads: "Downloads"
    },
    metrics: {
      sequenceCount: "Number of sequences",
      alignmentLength: "Alignment length",
      averageIdentity: "Average identity",
      gapPercentage: "Gap percentage",
      averageConservation: "Average conservation",
      averageEntropy: "Average normalized entropy",
      variableColumns: "Variable columns",
      averageCoverage: "Average coverage",
      gcContent: "GC content",
      highGapColumns: "High-gap columns"
    },
    overview: {
      completed: "Analysis complete",
      title: "Scientific alignment overview",
      description: "{sequences} sequences were aligned across {columns} positions. This dashboard summarizes preprocessing, alignment quality, and result artifacts.",
      unavailable: "Not provided",
      actions: {
        openAlignment: "Open alignment matrix",
        openDownloads: "Download results"
      },
      summary: {
        title: "Result summary",
        description: "Core quality metrics from the server result and the complete visual preview.",
        algorithm: "Alignment method"
      },
      preprocess: {
        title: "Preprocessing overview",
        description: "Review sequence retention after quality control and the run configuration.",
        raw: "Raw sequences",
        retained: "Retained",
        removed: "Removed",
        retentionRate: "Sequence retention",
        mode: "Mode",
        strictness: "Strictness",
        unavailable: "Complete preprocessing counts were not provided for this task; available configuration is still shown.",
        values: {
          audit: "Audit",
          filter: "Filter",
          strict: "Strict",
          normal: "Normal",
          lenient: "Lenient"
        }
      },
      science: {
        title: "Scientific analysis",
        description: "Calculated in a Worker from the complete visualized alignment without sampling.",
        calculating: "Calculating alignment quality statistics in the background",
        failed: "The alignment preview could not be loaded, so scientific statistics are unavailable. Preprocessing and output artifact details remain valid.",
        truncated: "This alignment exceeds the preview limits. Download the complete result.",
        empty: "No alignment sequences are available for scientific statistics.",
        qualityProfile: "Full-length quality tracks",
        qualityChartLabel: "Full-length conservation, gap fraction, and Shannon entropy tracks",
        qualityChartSummary: "This chart summarizes conservation, gap fraction, and Shannon entropy across all {columns} alignment positions.",
        baseComposition: "Base and gap composition",
        compositionNote: "Composition uses all alignment cells as the denominator; GC content uses only A, C, G, T, and U.",
        bases: {
          A: "A",
          C: "C",
          G: "G",
          T: "T",
          U: "U",
          N: "N",
          other: "Other ambiguity",
          gap: "Gap"
        }
      },
      outputs: {
        title: "Output artifacts",
        description: "The server generated {count} result files. Open Downloads for the archive and alignment files.",
        empty: "The server did not return a detailed output file list.",
        groups: {
          preprocess: "Preprocessing",
          alignment: "Alignment outputs",
          logs: "Run logs"
        }
      }
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
      calculating: "Calculating conservation statistics in the background",
      neutralTitle: "Neutral read-only browsing mode",
      neutralDescription: "You can still browse the input, search names, and download the original FASTA, but nucleotide-specific statistics are hidden.",
      stageTwo: {
        advanced: "Advanced view and export",
        commandBar: "MSA research workspace command bar",
        statusChips: "Current viewer and analysis state",
        settings: "Workspace settings",
        moreTools: "More tools",
        closeSettings: "Close settings",
        settingsDescription: "Configure the view, QC tracks, row actions, and export. The active analysis scope remains visible in the status bar.",
        settingsGroups: {
          view: "View",
          location: "Locate",
          workspace: "Workspace",
          qc: "Quality analysis",
          rows: "Sequences and batch actions",
          export: "Export"
        },
        qc: "QC",
        closeQc: "Close QC",
        resizeDock: "Resize side panel",
        exportWorkspace: "Export",
        expandWorkspace: "Expand workspace",
        exitWorkspace: "Exit workspace",
        resetView: "Reset view",
        viewMode: "Matrix display mode",
        labelWidth: "Sequence label width",
        minimap: "Show overview navigator",
        rangeSelectionMode: "Touch range-selection mode",
        rangeSelectionHint: "When off, one finger pans and a tap selects. Turn it on to drag a continuous range.",
        rangeStatsFailed: "Range statistics failed. Select the interval again and retry.",
        rowActions: "{name} row actions",
        consensusTie: "Majority-consensus tie",
        analysisScope: "Analysis scope",
        analysisScopes: {
          all: "All rows",
          visible: "Visible rows",
          selected: "Explicitly selected rows"
        },
        scopeChip: "Analysis: {scope} ({count} rows)",
        clearScope: "Restore all-row analysis",
        referenceChip: "Reference: {value}",
        differenceChip: "Reference differences",
        disableDifference: "Turn off reference differences",
        columnFilterChip: "Column filter: {value}",
        clearColumnFilter: "Clear column filter",
        hiddenChip: "{count} rows hidden",
        selectedRowsChip: "{count} rows selected",
        clearSelectedRows: "Clear selected rows",
        rangeChip: "Range: {range}",
        trackChip: "Track: {value}",
        hideTrack: "Hide {value} track",
        motifMatchMode: "Motif match rule",
        motifMatchModes: {
          strict: "Strict match",
          possible: "Possible match"
        },
        motifStrandMode: "Motif strand",
        motifStrandModes: {
          forward: "Forward only",
          both: "Search both strands"
        },
        motifCoordinates: "{strand} strand · alignment {alignment} · sequence {sequence}",
        motifErrors: {
          invalid: "The motif contains invalid characters: {characters}. Use DNA/RNA IUPAC symbols only; whitespace is removed, but gaps are not allowed.",
          failed: "Motif search failed. Revise the query and try again."
        },
        analysisFailed: "Alignment analysis failed. Reload this source and try again.",
        selectAllVisible: "Select visible",
        hideSelected: "Hide selected",
        pinSelected: "Pin selected",
        unpinSelected: "Unpin selected",
        undoHide: "Undo hide",
        qcPanel: {
          title: "Sequence QC",
          reviewOnly: "Automatic results are QC candidates for review only; rows are never removed and the source alignment is never changed automatically.",
          scope: "Analysis scope",
          rows: "Rows",
          columns: "Columns",
          candidates: "QC candidates",
          search: "Search sequence names",
          sort: "Sort rows",
          ascending: "Ascending",
          descending: "Descending",
          name: "Name",
          length: "Non-gap length",
          gap: "Gap fraction",
          ambiguity: "Ambiguity fraction",
          gc: "GC fraction",
          identity: "Identity",
          comparisonTarget: "QC comparison target",
          explicitReference: "Explicit reference sequence",
          scopeConsensus: "Current analysis-scope consensus",
          differences: "Differences",
          review: "Review",
          direction: "Direction",
          originalOrder: "Original order",
          combinedFilters: "Combined row filters",
          candidateRules: "QC candidate rules (blank means disabled)",
          columnRules: "Custom column filters (enabled when edited)",
          minimumLength: "Minimum non-gap length",
          maximumLength: "Maximum non-gap length",
          maximumGap: "Maximum gap fraction",
          maximumAmbiguity: "Maximum ambiguity fraction",
          minimumGc: "Minimum GC fraction",
          maximumGc: "Maximum GC fraction",
          minimumIdentity: "Minimum identity",
          maximumDifferences: "Maximum differences",
          minimumConservation: "Minimum conservation",
          minimumCoverage: "Minimum coverage",
          maximumEntropy: "Maximum normalized entropy",
          maximumColumnAmbiguity: "Maximum column ambiguity fraction",
          status: "Status",
          showingRows: "There are {total} filtered rows; showing the first {shown}.",
          distributions: "Sequence-level metric distributions",
          distributionSummary: "{metric}: {count} observations; minimum {min}, median {median}, maximum {max}."
        },
        annotationPanel: {
          title: "QC annotations",
          reviewOnly: "‘Exclude candidate’ is a review marker only; it never changes the analysis scope or source alignment.",
          category: "Category",
          sequenceRow: "Sequence row",
          all: "All",
          allRows: "All rows",
          containsPosition: "Contains alignment position",
          previous: "Previous",
          next: "Next",
          noMatches: "No matching annotations",
          newAnnotation: "New annotation",
          selectTarget: "Select a row, column, or interval first",
          optionalNote: "Optional note",
          add: "Add",
          delete: "Delete",
          updated: "Updated",
          note: "Note",
          review: "Review",
          excludeCandidate: "Exclude candidate"
        },
        analysisTracks: "Analysis tracks",
        activeTracks: "Visible tracks",
        reference: "Reference sequence",
        noReference: "No reference sequence selected",
        setReference: "Set as reference",
        clearReference: "Clear reference",
        referencePosition: "Reference coordinate",
        alignmentPosition: "Alignment coordinate",
        coordinateMode: "Coordinate mode",
        differenceMode: "Difference view",
        consensusMode: "Consensus mode",
        majorityConsensus: "Majority rule",
        iupacConsensus: "IUPAC ambiguity",
        pinSequence: "Pin sequence",
        unpinSequence: "Unpin sequence",
        selectSequence: "Select sequence",
        selectedRows: "{count} rows selected",
        exportSelectedRows: "Export selected rows",
        inspector: "Analysis inspector",
        openInspector: "Open analysis inspector",
        closeInspector: "Close analysis inspector",
        overviewNavigator: "Alignment overview navigator",
        previousMotif: "Previous match",
        nextMotif: "Next match",
        motifResult: "Match {current} / {total}",
        motifHits: "Motif match list",
        motifStoredLimit: "{total} matches found; navigation retains the first {stored}",
        searchingMotif: "Searching motif",
        canvasOverview: "Canvas overview mode",
        domDetail: "DOM detail mode",
        shortcutHint: "Arrow keys move; Shift extends the range; Space selects the row; P pins; R sets the reference; H hides the row.",
        tracks: {
          conservation: "Conservation",
          gap: "Gap fraction",
          coverage: "Coverage",
          entropy: "Shannon entropy"
        },
        stats: {
          baseComposition: "Base composition",
          gcContent: "GC content",
          averageEntropy: "Average normalized entropy",
          averageCoverage: "Average coverage",
          mismatches: "Substitutions",
          insertions: "Insertions",
          deletions: "Deletions",
          transitions: "Transitions",
          transversions: "Transversions"
        },
        differences: {
          match: "Matches reference",
          compatibleAmbiguity: "Compatible ambiguity",
          substitution: "Canonical substitution",
          mismatch: "Substitution",
          insertion: "Insertion vs reference",
          deletion: "Deletion vs reference",
          empty: "Both empty",
          unknown: "Unknown symbol",
          unclassifiedSubstitution: "Unclassified substitution"
        }
      },
      scienceV2: {
        semanticsVersion: "Nucleotide analysis semantics nucleotide-v2",
        alphabets: {
          dna: "DNA",
          rna: "RNA",
          nucleotide: "Mixed T/U nucleotide",
          protein: "Protein",
          unknown: "Unknown alphabet"
        },
        alignmentModes: {
          aligned: "Equal-length nucleotide alignment",
          rawUnequal: "Raw unequal-length sequences",
          neutral: "Neutral read-only browsing"
        },
        warnings: {
          duplicateHeaders: "Duplicate FASTA headers were detected; each row remains independently addressable through its internal rowKey.",
          mixedTu: "Both T and U were detected. Original characters remain visible while statistics normalize them to one nucleotide state.",
          normalizedGaps: "The normalized fingerprint converts dots (.) to gaps (-) and normalizes character case.",
          browserContentHash: "Server results record only the normalized hash of content received by the browser; it is not a hash of the original server file."
        },
        neutralTitle: "Neutral read-only browsing mode",
        neutralDescription: "You can still browse the input, search names, and download the original FASTA, but nucleotide-specific statistics are hidden.",
        neutralReasons: {
          protein: "Protein-specific residues were detected. GC, consensus, entropy, conservation, and Ti/Tv are not calculated for proteins in this release.",
          unknown: "The sequence alphabet cannot be determined reliably. Nucleotide-specific statistics are disabled to avoid misleading results.",
          rawUnequal: "FASTA rows have unequal lengths. Blank tails are not interpreted as gaps, deletions, or low coverage.",
          invalidSymbols: "The input contains invalid symbols. Correct the input before running nucleotide analysis."
        },
        scopeRows: "Analysis scope: {scope}, {count} rows actually used",
        unavailable: "Not available",
        metrics: {
          coverage: "Coverage",
          informativeCoverage: "Informative coverage",
          gapFraction: "Gap fraction",
          ambiguityFraction: "Ambiguity fraction",
          unknownFraction: "Unknown fraction",
          conservation: "Conservation",
          entropyBits: "Shannon entropy (bits)",
          normalizedEntropy: "Normalized entropy",
          gc: "GC fraction",
          validComparisons: "Valid comparisons",
          unknownComparisons: "Unknown comparisons",
          differenceRate: "Difference rate",
          unclassifiedSubstitutions: "Unclassified substitutions"
        },
        formulas: {
          coverage: "Coverage = non-gap rows / total rows.",
          informativeCoverage: "Informative coverage = canonical A/C/G/T(U) rows / total rows.",
          conservation: "Conservation = dominant canonical count / canonical count; it is unavailable when no canonical base is observed.",
          entropy: "Entropy = -Σ p log₂(p), using canonical bases only; normalized entropy = entropy / 2.",
          gc: "GC = (G + C) / (A + C + G + T/U); ambiguity codes and gaps are excluded from the denominator.",
          variable: "A variable column contains at least two observed canonical bases; ambiguity alone does not create variation.",
          titv: "Ti/Tv includes only substitutions where both sides are canonical single bases.",
          differenceRate: "Difference rate = substitutions + insertions + deletions / valid comparisons, with absolute counts reported alongside it.",
          compatibleAmbiguity: "Two valid IUPAC sets with a non-empty intersection, but not the same canonical single base, are compatible ambiguity."
        },
        qc: {
          candidate: "QC candidate",
          needsReview: "Needs review",
          noAutomaticExclusion: "QC results never delete rows or change the source alignment automatically.",
          annotationCategories: {
            note: "Note",
            review: "Review",
            excludeCandidate: "Exclude candidate"
          }
        }
      },
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
      imageExport: {
        button: "Export / QC bundle",
        title: "Export MSA and QC bundle",
        description: "Export FASTA, SVG, or PNG from one exact row/column region; the recommended bundle also preserves the manifest and mappings.",
        preset: "Ready-to-use output",
        presets: {
          paper: "Paper vector SVG",
          presentation: "Presentation HD PNG",
          custom: "Custom",
          paperHint: "Editable vector output with automatic wrapping for papers and archival.",
          presentationHint: "High-contrast 3× PNG for slides, posters, and sharing."
        },
        format: "Format",
        svg: "SVG",
        png: "PNG",
        region: "Region",
        regions: {
          visible: "Visible viewport",
          full: "All visible data",
          selection: "Selected region",
          viewport: "Current viewport",
          selectedInterval: "Continuous selected interval",
          filteredView: "Complete filtered view",
          fullAlignment: "Original full alignment"
        },
        layoutMode: "Layout",
        layoutModes: {
          singleLine: "Single line",
          wrapped: "Wrapped"
        },
        wrapModes: {
          auto: "Automatic wrapping",
          fixed: "Fixed columns per line",
          single: "Keep one line"
        },
        wrapColumns: "Columns per line",
        include: "Include",
        sequenceNames: "Sequence names",
        coordinates: "Coordinates",
        conservation: "Active analysis tracks",
        consensus: "Consensus",
        legend: "Color legend",
        annotations: "Annotations/features",
        annotationsUnavailable: "No data",
        output: "Output",
        filename: "Filename",
        scale: "PNG scale",
        scaleAdjusted: "The output scale was adjusted from {requested}× to {resolved}× to stay within browser safety limits.",
        background: "Background",
        transparentBackground: "Transparent background",
        estimate: "Estimate",
        sizeEstimate: "{rows} rows · {columns} columns · {width}×{height} px",
        fastaEstimate: "{rows} rows · {columns} exported columns",
        blockEstimate: "{count} blocks",
        pageEstimate: "The bundle will contain {count} numbered pages with repeated labels, coordinates, and tracks.",
        pngEstimate: "PNG {width}×{height} px · {mp} MP",
        noSelectionHint: "Select a column range in the matrix before exporting the selected region.",
        preview: "Export thumbnail preview",
        progress: "Export progress {value}%",
        cancelExport: "Cancel export",
        bundle: {
          title: "Reproducibility",
          qcBundle: "QC bundle (recommended)",
          bare: "Bare file only",
          qcHint: "The ZIP includes the primary file, manifest, row map, column map, and available QC annotations.",
          bareWarning: "A bare primary file omits complete provenance, filter scope, and row/column mappings."
        },
        export: "Export",
        exporting: "Exporting",
        cancel: "Cancel",
        errors: {
          noData: "There is no exportable matrix data.",
          selectionRequired: "Select a column range first.",
          limitExceeded: "PNG dimensions exceed the safety limit.",
          pngDimensionLimit: "PNG would create a {width} × {height} px canvas, above the {limit} px single-dimension safety limit.",
          pngPixelLimit: "PNG would create a {actual} MP canvas, above the {limit} MP safety limit.",
          svgCellLimit: "SVG would render {actual} residue cells, above the {limit}-cell safety limit.",
          svgByteLimit: "SVG is estimated at {actual} MB, above the {limit} MB safety limit.",
          failed: "Export failed. Adjust the region or format and try again."
        }
      },
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
        length: "Length",
        gap: "Gap fraction",
        ambiguity: "Ambiguity fraction",
        gc: "GC fraction",
        identity: "Reference identity"
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
        lowGap: "Low-gap columns",
        custom: "Custom conditions"
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
    eyebrow: "EasyMSA guide for research users",
    title: "Documentation",
    subtitle: "From FASTA input, preprocessing, and task recovery to scientific interpretation, reference differences, and export.",
    searchLabel: "Search documentation",
    searchPlaceholder: "Search FASTA, reference, entropy, export…",
    searchHint: "Search section titles, content, feature names, and FAQs. Press Ctrl/⌘ + K to focus from anywhere.",
    clearSearch: "Clear documentation search",
    searchResultsTitle: "Search results",
    searchResultsCount: "{count} results",
    noSearchResults: "No matching documentation",
    noSearchResultsHint: "Try a shorter query or feature names such as FASTA, token, reference, or motif.",
    quickActionsTitle: "Quick actions",
    quickActions: {
      submit: {
        title: "Submit a task",
        description: "Create a new alignment"
      },
      viewer: {
        title: "Open local viewer",
        description: "Inspect FASTA in your browser"
      },
      lookup: {
        title: "Restore a task",
        description: "Continue with an ID and token"
      }
    },
    tocTitle: "On this page",
    tocLabel: "Documentation sections",
    mobileToc: "Open documentation contents",
    copyCode: "Copy example",
    copiedCode: "Copied",
    copyFailed: "Copy failed"
  },
  about: {
    title: "About easymsa",
    subtitle: "A web tool for DNA/RNA multiple sequence alignment.",
    project:
      "This project offers server alignment and refinement, task recovery and interactive results.",
    version: "Current version: adaptive Auto selection, MiniPOA, MAFFT, HAlign4, FMAlign2, optional ReAlign-N and interactive results.",
    citation: "Citation: when publishing research, please cite the methods and software used.",
    contact: "Contact: submit questions and suggestions through GitHub Issues.",
    repository: "GitHub repository: https://github.com/malabz/easymsa"
  }
};

export type Dictionary = typeof zh;

export const dictionary: Record<Locale, Dictionary> = {
  zh,
  en
};
