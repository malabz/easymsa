import type { Locale } from "./i18n/dictionary";

export const homeContent = {
  zh: {
    eyebrow: "DNA / RNA · MULTIPLE SEQUENCE ALIGNMENT",
    title: "核酸多序列比对",
    intro: "面向大规模 DNA / RNA 序列，自动选择比对方法，在线查看与下载结果。",
    start: "开始分析", example: "体验示例", openExample: "打开完整示例",
    sample: "合成 DNA · 20 条序列 · MiniPOA", free: "所有用途免费 · 无需注册",
    license: "MIT / 许可范围", privacy: "隐私与本地存储", scroll: "了解使用流程",
    workflowTitle: "一个工作流，完成序列分析。",
    steps: [
      { title: "准备输入", text: "上传或粘贴 FASTA，开始 DNA 或 RNA 序列分析。", link: "下载示例输入" },
      { title: "提交分析", text: "根据序列特征自动选择方法，也可手动指定比对工具。", link: "提交任务" },
      { title: "查看与下载", text: "浏览比对、检查感兴趣的区域，下载结果或恢复已有任务。", link: "恢复已有任务" },
    ],
    methodsTitle: "合适的方法，连贯的体验。",
    methodsIntro: "Auto 根据序列特征选择比对方法，连接 MiniPOA、HAlign4 与 MAFFT。FMAlign2 可供手动选择。",
    methods: [
      { name: "MiniPOA", text: "部分有序比对" },
      { name: "HAlign4", text: "大规模核酸比对" },
      { name: "FMAlign2", text: "结合 MAFFT 的加速比对" },
      { name: "MAFFT", text: "经典核酸多序列比对" },
    ],
    methodLink: "方法介绍与原始论文", refineLink: "可选：使用 ReAlign-N 优化已有比对",
    demo: {
      label: "EasyMSA 完整操作演示", play: "播放演示", pause: "暂停演示", replay: "重新加载演示",
      seek: "演示进度", fullscreen: "全屏观看", exitFullscreen: "退出全屏", loading: "正在加载演示…",
      unavailable: "演示暂时无法播放，可以直接体验示例。", waiting: "等待片段已省略",
      chapters: ["上传", "提交", "查看", "下载"], chapterLabel: "跳转到演示章节",
      fullscreenUnavailable: "此浏览器不支持全屏播放。", of: " / ",
    },
  },
  en: {
    eyebrow: "DNA / RNA · MULTIPLE SEQUENCE ALIGNMENT",
    title: "Multiple nucleotide sequence alignment",
    intro: "Large-scale DNA / RNA alignment. Automatic method selection. Interactive results.",
    start: "Start analysis", example: "Explore example", openExample: "Open full example",
    sample: "Synthetic DNA · 20 sequences · MiniPOA", free: "Free for all uses · No registration",
    license: "MIT / License scope", privacy: "Privacy and storage", scroll: "Explore the workflow",
    workflowTitle: "One workflow, from sequence to insight.",
    steps: [
      { title: "Prepare your input", text: "Upload or paste FASTA to start analyzing DNA or RNA sequences.", link: "Download example input" },
      { title: "Run your analysis", text: "Let Auto select a method from sequence features, or choose an alignment tool.", link: "Submit a job" },
      { title: "Explore and download", text: "Browse the alignment, inspect regions, download results, or recover an earlier job.", link: "Recover a job" },
    ],
    methodsTitle: "The right methods. A connected workflow.",
    methodsIntro: "Auto selects from MiniPOA, HAlign4 and MAFFT using sequence features. FMAlign2 is also available for manual selection.",
    methods: [
      { name: "MiniPOA", text: "Partial-order alignment" },
      { name: "HAlign4", text: "Large-scale nucleotide alignment" },
      { name: "FMAlign2", text: "Accelerated alignment with MAFFT" },
      { name: "MAFFT", text: "Established nucleotide alignment" },
    ],
    methodLink: "Methods and original papers", refineLink: "Optional: refine an alignment with ReAlign-N",
    demo: {
      label: "EasyMSA end-to-end demonstration", play: "Play demo", pause: "Pause demo", replay: "Reload demo",
      seek: "Demo progress", fullscreen: "View fullscreen", exitFullscreen: "Exit fullscreen", loading: "Loading demo…",
      unavailable: "The demo is unavailable. You can explore the interactive example.", waiting: "Waiting time omitted",
      chapters: ["Upload", "Submit", "Explore", "Download"], chapterLabel: "Jump to a demo chapter",
      fullscreenUnavailable: "Fullscreen playback is unavailable in this browser.", of: " / ",
    },
  },
} satisfies Record<Locale, unknown>;

export const HOME_DEMO = {
  version: "v2", duration: 40, chapterTimes: [0, 8, 15, 32],
  exampleRoute: "/examples/alignment-small",
} as const;

export function homeMedia(locale: Locale) {
  const root = `${import.meta.env.BASE_URL}media/home/${HOME_DEMO.version}`;
  return { mp4: `${root}/demo-${locale}.mp4`, webm: `${root}/demo-${locale}.webm`, poster: `${root}/poster-${locale}.webp` };
}

export const homeBenefitsContent = {
  zh: {
    eyebrow: "从输入，到结果", workflowTitle: "把复杂的比对，交给一个简单的流程。",
    workflowIntro: "从大规模序列输入，到可交互的比对结果。", stepLabel: "体验分析流程",
    steps: [
      { title: "接收大规模序列", text: "批量上传 DNA 或 RNA，交给服务器完成比对。" },
      { title: "自动选择合适的方法", text: "根据序列特征选择方法，减少手动配置。" },
      { title: "直观探索比对结果", text: "浏览全局、定位区域，查看并下载结果。" },
    ],
    phases: ["读入序列", "分析与选择", "生成比对结果"],
    alignedLabel: "多序列比对", identifying: "识别序列特征", autoChoice: "自动选择合适的方法", autoChoiceLines: ["自动选择", "合适的方法"],
    storyLabel: "公开示例序列逐步对齐的动态演示", scaleTitle: "体验不同数据规模",
    scaleSmall: "100 条序列", scaleMedium: "1,000 条序列", scaleLarge: "10,000 条序列",
    scaleHint: "拖动滑块，切换规模演示。", play: "播放流程演示", pause: "暂停流程演示", replay: "重新播放流程",
    progress: "流程演示进度", nextStep: "查看下一步",
    autoTitle: "少做选择，更快开始。", autoIntro: "根据序列特征自动选择方法，也可自行指定。",
    featureTitle: "识别序列特征", features: ["序列类型", "序列数量", "序列差异", "序列长度"],
    dnaRna: "DNA / RNA", small: "小规模", medium: "中规模", large: "大规模", lengthValue: "识别长度分布",
    differences: ["低", "中", "高"], differenceLabel: "体验序列差异", outputTitle: "连接比对结果",
    connected: "选择、计算与结果浏览，一次完成", methodLink: "方法介绍与原始论文", compactLabel: "公开示例的局部比对矩阵",
    exploreTitle: "从全局，看到每一个位置。", exploreIntro: "在比对图中浏览全局结构，定位感兴趣的区域。",
    openExample: "打开交互示例", exampleLabel: "合成 DNA · 公开示例", sequences: "条序列", columns: "列",
    overview: "序列概览", overviewLabel: "公开示例的全长序列概览", pan: "拖动概览，横向浏览比对",
    previewLabel: "可点击查看列统计的公开示例比对矩阵", position: "位置", conservation: "保守性", gap: "缺口",
    dragHint: "拖动概览，定位感兴趣的区域。", interactionHint: "拖动概览移动视窗，点击矩阵查看列统计。",
    start: "开始分析", downloadInput: "下载示例输入", recover: "恢复已有任务",
  },
  en: {
    eyebrow: "FROM INPUT TO RESULTS", workflowTitle: "A simple workflow for complex alignments.",
    workflowIntro: "From large sequence datasets to interactive results.", stepLabel: "Explore the analysis workflow",
    steps: [
      { title: "Bring your sequence dataset", text: "Upload DNA or RNA in bulk and let the server run the alignment." },
      { title: "Let Auto choose a method", text: "Sequence features guide method selection with less manual setup." },
      { title: "Explore your alignment", text: "Navigate the whole alignment, inspect regions, and download results." },
    ],
    phases: ["Read sequences", "Analyze and select", "Generate alignment"],
    alignedLabel: "Multiple sequence alignment", identifying: "Identify sequence features", autoChoice: "Automatically select a suitable method", autoChoiceLines: ["Auto-select", "a method"],
    storyLabel: "An animated alignment of public example sequences", scaleTitle: "Explore dataset scales",
    scaleSmall: "100 sequences", scaleMedium: "1,000 sequences", scaleLarge: "10,000 sequences", scaleHint: "Drag to change the scale demonstration.",
    play: "Play workflow demonstration", pause: "Pause workflow demonstration", replay: "Replay the workflow", progress: "Workflow demonstration progress", nextStep: "View the next step",
    autoTitle: "Less setup. Get started sooner.", autoIntro: "Choose a method automatically from sequence features, or select one yourself.",
    featureTitle: "Identify sequence features", features: ["Sequence type", "Sequence count", "Sequence differences", "Sequence lengths"],
    dnaRna: "DNA / RNA", small: "Small dataset", medium: "Medium dataset", large: "Large dataset", lengthValue: "Inspect length distribution",
    differences: ["Low", "Medium", "High"], differenceLabel: "Explore sequence differences", outputTitle: "Connect to alignment results",
    connected: "Selection, alignment and exploration in one workflow", methodLink: "Methods and original papers", compactLabel: "A region of the public example alignment",
    exploreTitle: "See the whole alignment. Inspect every position.", exploreIntro: "Navigate the global structure and locate regions of interest.",
    openExample: "Open interactive example", exampleLabel: "Synthetic DNA · Public example", sequences: "sequences", columns: "columns",
    overview: "Overview", overviewLabel: "Full-length overview of the public example", pan: "Drag the overview to pan the alignment",
    previewLabel: "Public example alignment; click a column to inspect its statistics", position: "Position", conservation: "Conservation", gap: "Gaps",
    dragHint: "Drag the overview to explore a region.", interactionHint: "Drag the overview to move the viewport. Click a column to inspect its statistics.",
    start: "Start analysis", downloadInput: "Download example input", recover: "Recover a job",
  },
} satisfies Record<Locale, unknown>;


export const homeAdvantagesContent = {
  zh: {
    scaleTitle: "大规模序列，也能高效完成。",
    scaleIntro: "面向成千上万条核酸序列，从上传到结果一步完成。",
    batchInput: "批量输入", alignmentComplete: "比对完成",
    scaleAnimationLabel: "公开示例核酸序列从批量输入到整齐比对的动态演示",
    autoTitle: "用决策树，选出适合的方法。",
    autoIntro: "识别序列特征，沿分支自动判断，让比对更高效。",
    treeLabel: "决策树选择演示", treeAnimationLabel: "当前选择器决策树的分支逐步点亮，选择适合的比对方法",
    treeFeatures: ["片段多样性", "长度分布", "序列相似性", "GC 组成"],
    featuresNote: "从输入序列中自动提取", selectionLabel: "比对方法", runAlignment: "自动开始比对",
    selectedPrefix: "已匹配", evaluating: "正在判断",
    inputLabel: "输入序列（FASTA）", featureLabel: "识别序列特征",
    features: ["序列数量", "序列长度", "序列差异"], differenceValue: "自动评估",
    matchLines: ["自动选择", "比对方法"], candidateLabel: "自动选择的候选方法",
    scanning: "正在识别序列特征", matching: "正在匹配比对方法", resultLabel: "自动选择 · MiniPOA",
    outputLabel: "公开 MiniPOA 示例的局部比对结果", replay: "重新演示",
    start: "开始分析", methodLink: "了解自动选择与比对方法",
  },
  en: {
    scaleTitle: "Large datasets. Efficient alignment.",
    scaleIntro: "Thousands of nucleotide sequences. One workflow from upload to results.",
    batchInput: "Batch input", alignmentComplete: "Aligned sequences",
    scaleAnimationLabel: "Public nucleotide example sequences moving from batch input to an alignment",
    autoTitle: "The right method. Selected by a decision tree.",
    autoIntro: "Sequence features guide each decision, for efficient alignment.",
    treeLabel: "Decision tree demonstration", treeAnimationLabel: "The selector's decision tree highlights a branch to choose an alignment method",
    treeFeatures: ["K-mer diversity", "Length distribution", "Sequence similarity", "GC composition"],
    featuresNote: "Extracted automatically from input", selectionLabel: "Alignment method", runAlignment: "Start alignment automatically",
    selectedPrefix: "Selected", evaluating: "Evaluating",
    inputLabel: "Input sequences (FASTA)", featureLabel: "Sequence features",
    features: ["Sequence count", "Sequence length", "Differences"], differenceValue: "Auto-assessed",
    matchLines: ["Auto-select", "a method"], candidateLabel: "Candidate methods for automatic selection",
    scanning: "Identifying sequence features", matching: "Matching an alignment method", resultLabel: "Auto-selection · MiniPOA",
    outputLabel: "A region of the public MiniPOA example alignment", replay: "Replay",
    start: "Start analysis", methodLink: "Explore Auto and alignment methods",
  },
} satisfies Record<Locale, unknown>;
