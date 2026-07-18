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
    queueJobs: "队列 {count} 个任务"
  },
  footer: {
    tagline: "友好的多序列比对 Web 工作台。",
    note: "前端提交任务到 EasyMSA 后端，并使用任务凭证恢复状态和结果。"
  },
  home: {
    eyebrow: "面向 DNA / RNA 的在线比对工作台",
    title: "easymsa：友好的多序列比对可视化工具",
    subtitle:
      "上传或粘贴 FASTA 序列，提交任务，查看比对结果并下载结果文件。",
    intro:
      "easymsa 面向小规模多序列比对结果浏览，提供清晰的提交流程、任务状态追踪和可读的 MSA 可视化界面。",
    restoreJob: "恢复已有任务",
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
    algorithmHint: "默认使用自动模式，目前会选择 minipoa；也可以手动切换 minipoa 或 MAFFT。",
    algorithms: {
      auto: "自动选择",
      minipoa: "minipoa",
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
      packaging: "正在打包结果",
      completed: "已完成",
      failed: "失败"
    }
  },
  lookup: {
    title: "恢复任务",
    subtitle: "输入任务 ID 和访问 token，或上传任务凭证 JSON，继续查看任务状态和结果。",
    cachedTitle: "已缓存任务",
    cachedDescription:
      "这些任务凭证只保存在当前浏览器。删除缓存不会影响服务器任务。",
    cachedEmpty:
      "暂无缓存任务。你仍可以手动输入任务 ID 和 token，或上传任务凭证 JSON。",
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
    readError: "无法读取该 FASTA 文件。",
    fileTooLarge: "文件过大。请使用不超过 {limit} 字节的 FASTA 文件。"
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
      averageEntropy: "平均 Shannon entropy",
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
        description: "服务端结果与完整可视化预览的核心质量指标。"
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
        truncated: "该比对超过当前预览上限。为避免用抽样数据产生误导，本页不推断保守性、entropy 或碱基组成。",
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
      stageTwo: {
        advanced: "高级视图与导出",
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
        motifStoredLimit: "命中过多，仅加载前 {count} 个用于导航",
        searchingMotif: "正在搜索片段",
        canvasOverview: "Canvas 全局模式",
        domDetail: "DOM 细节模式",
        shortcutHint: "方向键移动 · Shift 扩展范围 · 拖拽选择列区间",
        tracks: {
          conservation: "保守性",
          gap: "缺口比例",
          coverage: "覆盖率",
          entropy: "Shannon entropy"
        },
        stats: {
          baseComposition: "碱基组成",
          gcContent: "GC 比例",
          averageEntropy: "平均 entropy",
          averageCoverage: "平均覆盖率",
          mismatches: "替换",
          insertions: "插入",
          deletions: "缺失",
          transitions: "转换",
          transversions: "颠换"
        },
        differences: {
          match: "与参考一致",
          mismatch: "替换",
          insertion: "相对参考插入",
          deletion: "相对参考缺失"
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
        button: "导出图片",
        title: "导出 MSA 图片",
        description: "根据当前查看器状态导出 SVG 或 PNG，不截图页面。",
        format: "格式",
        svg: "SVG",
        png: "PNG",
        region: "范围",
        regions: {
          visible: "当前视窗",
          full: "全部可见数据",
          selection: "选中区间"
        },
        layoutMode: "布局",
        layoutModes: {
          singleLine: "单行",
          wrapped: "换行"
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
        background: "背景",
        transparentBackground: "透明背景",
        estimate: "预估",
        sizeEstimate: "{rows} 行 · {columns} 列 · {width}×{height} px",
        blockEstimate: "{count} 个区块",
        pngEstimate: "PNG {width}×{height} px · {mp} MP",
        noSelectionHint: "先在矩阵中选择列区间，才能导出选中区间。",
        export: "导出",
        exporting: "导出中",
        cancel: "取消",
        errors: {
          noData: "当前没有可导出的矩阵数据。",
          selectionRequired: "请先选择一个列区间。",
          limitExceeded: "PNG 尺寸超过安全上限。",
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
        body: "easymsa 前端连接后端，自动选择或手动提交 minipoa / MAFFT 任务并展示比对结果。"
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
        body: "支持 FASTA、FASTA 的 gz/xz/bz2 压缩文件，以及 zip/tar/tar.gz/tar.xz/tar.bz2 压缩包；压缩包内可包含多个 FASTA，建议上限 100 MB。"
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
    version: "当前版本：自动模式（当前 minipoa）+ minipoa/MAFFT 后端任务 + MSA viewer。",
    citation: "引用：发表使用结果时，请根据任务实际使用的算法引用 minipoa 或 MAFFT 的论文与软件。",
    contact: "联系：问题与建议请通过 GitHub Issues 提交。",
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
    queueJobs: "{count} jobs queued"
  },
  footer: {
    tagline: "A friendly web workspace for multiple sequence alignment.",
    note: "The frontend submits jobs to the EasyMSA backend and restores status and results with job access credentials."
  },
  home: {
    eyebrow: "Online alignment workspace for DNA / RNA",
    title: "easymsa: A Friendly MSA Visualization Tool",
    subtitle:
      "Upload or paste FASTA sequences, submit a job, view alignment results, and download output files.",
    intro:
      "easymsa focuses on small-scale multiple sequence alignment browsing, with a clear submission flow, job status tracking, and readable MSA visualization.",
    restoreJob: "Restore Existing Job",
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
    algorithmHint: "Auto is the default and currently selects minipoa; minipoa and MAFFT can also be selected manually.",
    algorithms: {
      auto: "Auto",
      minipoa: "minipoa",
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
      packaging: "Packaging results",
      completed: "Completed",
      failed: "Failed"
    }
  },
  lookup: {
    title: "Restore Job",
    subtitle: "Enter the job ID and access token, or upload a job access JSON, to continue checking status and results.",
    cachedTitle: "Cached jobs",
    cachedDescription:
      "These job credentials are stored only in this browser. Deleting a cache entry does not affect the server job.",
    cachedEmpty:
      "No cached jobs yet. You can still enter a job ID and token manually, or upload a job access JSON.",
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
    readError: "Could not read this FASTA file.",
    fileTooLarge: "The file is too large. Use a FASTA file no larger than {limit} bytes."
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
      averageEntropy: "Average Shannon entropy",
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
        description: "Core quality metrics from the server result and the complete visual preview."
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
        truncated: "This alignment exceeds the current preview limits. To avoid misleading sampled results, conservation, entropy, and base composition are not inferred.",
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
      stageTwo: {
        advanced: "Advanced view and export",
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
        motifStoredLimit: "Many matches found; navigation loads the first {count}",
        searchingMotif: "Searching motif",
        canvasOverview: "Canvas overview mode",
        domDetail: "DOM detail mode",
        shortcutHint: "Arrow keys move · Shift extends · drag selects a column range",
        tracks: {
          conservation: "Conservation",
          gap: "Gap fraction",
          coverage: "Coverage",
          entropy: "Shannon entropy"
        },
        stats: {
          baseComposition: "Base composition",
          gcContent: "GC content",
          averageEntropy: "Average entropy",
          averageCoverage: "Average coverage",
          mismatches: "Substitutions",
          insertions: "Insertions",
          deletions: "Deletions",
          transitions: "Transitions",
          transversions: "Transversions"
        },
        differences: {
          match: "Matches reference",
          mismatch: "Substitution",
          insertion: "Insertion vs reference",
          deletion: "Deletion vs reference"
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
        button: "Export image",
        title: "Export MSA image",
        description: "Render SVG or PNG from the current viewer state without taking a page screenshot.",
        format: "Format",
        svg: "SVG",
        png: "PNG",
        region: "Region",
        regions: {
          visible: "Visible viewport",
          full: "All visible data",
          selection: "Selected region"
        },
        layoutMode: "Layout",
        layoutModes: {
          singleLine: "Single line",
          wrapped: "Wrapped"
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
        background: "Background",
        transparentBackground: "Transparent background",
        estimate: "Estimate",
        sizeEstimate: "{rows} rows · {columns} columns · {width}×{height} px",
        blockEstimate: "{count} blocks",
        pngEstimate: "PNG {width}×{height} px · {mp} MP",
        noSelectionHint: "Select a column range in the matrix before exporting the selected region.",
        export: "Export",
        exporting: "Exporting",
        cancel: "Cancel",
        errors: {
          noData: "There is no exportable matrix data.",
          selectionRequired: "Select a column range first.",
          limitExceeded: "PNG dimensions exceed the safety limit.",
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
        body: "easymsa connects to the backend, submits automatically selected or manual minipoa / MAFFT jobs, and displays alignment results."
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
        body: "Supported inputs include FASTA files, gz/xz/bz2-compressed FASTA files, and zip/tar/tar.gz/tar.xz/tar.bz2 archives containing one or more FASTA files, with a suggested maximum of 100 MB."
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
    version: "Current version: Auto mode (currently minipoa) + minipoa/MAFFT backend jobs + MSA viewer.",
    citation: "Citation: when publishing results, cite the paper and software for the algorithm actually used, minipoa or MAFFT.",
    contact: "Contact: submit questions and suggestions through GitHub Issues.",
    repository: "GitHub repository: https://github.com/malabz/easymsa"
  }
};

export type Dictionary = typeof zh;

export const dictionary: Record<Locale, Dictionary> = {
  zh,
  en
};
