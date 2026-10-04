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
