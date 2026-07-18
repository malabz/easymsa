import type { Locale } from "../i18n/dictionary";

export const DOCS_SECTION_IDS = [
  "quick-start",
  "fasta-input",
  "submit-preprocess",
  "status-access",
  "results-downloads",
  "msa-viewer",
  "metrics",
  "faq"
] as const;

export type DocsSectionId = (typeof DOCS_SECTION_IDS)[number];

export type DocsBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "steps"; items: Array<{ title: string; body: string }> }
  | { type: "code"; label: string; language: string; code: string }
  | {
      type: "callout";
      tone: "info" | "tip" | "warning";
      title: string;
      body: string;
    }
  | { type: "table"; headers: string[]; rows: string[][] };

export type DocsArticle = {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  collapsible?: boolean;
  blocks: DocsBlock[];
};

export type DocsSection = {
  id: DocsSectionId;
  title: string;
  summary: string;
  keywords: string[];
  articles: DocsArticle[];
};

const fastaExample = `>reference_sequence
ATGCTAGCTAGC
>sample_02
ATGCTAGATAGC
>sample_03
ATG-TAGCTAGC`;

const zh: DocsSection[] = [
  {
    id: "quick-start",
    title: "快速开始",
    summary: "从 FASTA 输入到查看和下载多序列比对结果。",
    keywords: ["开始", "流程", "提交", "结果"],
    articles: [
      {
        id: "workflow",
        title: "四步完成一次比对",
        summary: "准备输入、配置任务、等待运行并分析结果。",
        keywords: ["工作流", "新手", "任务"],
        blocks: [
          {
            type: "steps",
            items: [
              { title: "准备 FASTA", body: "准备至少两条 DNA 或 RNA 序列，每条记录都包含以 > 开头的 header。" },
              { title: "提交任务", body: "粘贴序列或上传文件；需要时选择算法和预处理模式。" },
              { title: "保存任务凭证", body: "保存任务 ID、访问 token、恢复链接或访问 JSON，以便稍后继续查看。" },
              { title: "解读与导出", body: "查看科研概览和 MSA 矩阵，并下载 FASTA、SVG、PNG 或服务端结果包。" }
            ]
          },
          { type: "callout", tone: "tip", title: "只想查看已有 FASTA？", body: "使用独立 MSA 查看器可在浏览器本地打开文件。它不会把未比对序列自动执行比对。" }
        ]
      },
      {
        id: "choose-entry",
        title: "选择正确的入口",
        summary: "提交任务、独立查看和恢复任务分别适用于不同场景。",
        keywords: ["独立查看器", "恢复", "入口"],
        blocks: [
          { type: "table", headers: ["需求", "入口", "说明"], rows: [
            ["执行新的 MSA", "提交任务", "由后端运行预处理与 minipoa 或 MAFFT。"],
            ["浏览本地 FASTA", "查看 MSA", "仅在本地解析和显示，不执行新的比对。"],
            ["继续已有任务", "查询任务", "使用保存的任务 ID、token 或访问 JSON。"]
          ] }
        ]
      }
    ]
  },
  {
    id: "fasta-input",
    title: "FASTA 与输入",
    summary: "了解有效 FASTA、粘贴与上传限制，以及压缩文件支持。",
    keywords: ["FASTA", "格式", "上传", "压缩", "限制"],
    articles: [
      {
        id: "valid-fasta",
        title: "有效的 FASTA 格式",
        summary: "每条序列需要 header 和至少一行非空序列内容。",
        keywords: ["header", "序列", "示例", ">"],
        blocks: [
          { type: "code", label: "FASTA 示例", language: "fasta", code: fastaExample },
          { type: "list", items: [
            "在线比对至少需要两条序列。",
            "每条记录的第一行必须以 > 开头，后面的文本作为序列名称。",
            "序列可以分成多行；提交时会连接为一条连续序列。",
            "建议使用唯一且简短的序列名称，便于搜索、设为 reference 和导出。"
          ] }
        ]
      },
      {
        id: "input-limits",
        title: "输入方式与当前默认限制",
        summary: "小数据适合粘贴，大文件和压缩包应使用上传。",
        keywords: ["200000", "200,000", "100 MB", "zip", "tar", "gz", "xz", "bz2"],
        blocks: [
          { type: "table", headers: ["输入方式", "当前默认上限", "适用场景"], rows: [
            ["粘贴 FASTA", "200,000 字符", "快速提交小型数据，页面会即时检查格式。"],
            ["上传文件", "100 MB", "较大 FASTA、压缩 FASTA 或包含多个 FASTA 的压缩包。"],
            ["独立查看器", "200,000 字节", "在浏览器本地查看单个文本 FASTA。"]
          ] },
          { type: "paragraph", text: "上传支持常见 FASTA 扩展名，以及 gz、xz、bz2、zip、tar、tar.gz、tar.xz 和 tar.bz2 等压缩格式。压缩包内可以包含多个 FASTA。" },
          { type: "callout", tone: "info", title: "部署配置可能不同", body: "这些数字是当前 EasyMSA 的默认值。若服务端管理员调整限制，实际响应以提交页面和服务端提示为准。" }
        ]
      }
    ]
  },
  {
    id: "submit-preprocess",
    title: "提交与预处理",
    summary: "配置任务名称、通知、比对算法和预处理行为。",
    keywords: ["算法", "minipoa", "MAFFT", "auto", "audit", "filter", "邮件"],
    articles: [
      {
        id: "job-settings",
        title: "任务信息与比对算法",
        summary: "任务名称必填，通知邮箱与高级设置可选。",
        keywords: ["任务名", "邮箱", "自动模式", "高级设置"],
        blocks: [
          { type: "list", items: [
            "任务名称用于识别任务，最长 64 个字符，不应包含路径字符或连续的 ..。",
            "通知邮箱可留空；填写后，任务完成或失败时会发送访问链接。",
            "Auto 是默认算法选择，当前通常选择 minipoa。",
            "可以手动选择 minipoa 或 MAFFT；服务不可用的算法会在页面中禁用。"
          ] },
          { type: "table", headers: ["算法", "建议用途"], rows: [
            ["Auto", "让当前服务配置选择可用的默认算法。"],
            ["minipoa", "EasyMSA 当前快速工作流的默认实现。"],
            ["MAFFT", "需要明确使用 MAFFT 或与既有 MAFFT 流程保持一致时。"]
          ] }
        ]
      },
      {
        id: "preprocess-modes",
        title: "Audit 与 Filter",
        summary: "两种模式都会检查输入，但对可疑序列的处理不同。",
        keywords: ["审计", "过滤", "质量控制", "重复序列"],
        blocks: [
          { type: "table", headers: ["模式", "行为", "推荐场景"], rows: [
            ["Audit", "报告潜在问题，通常保留可疑序列。", "希望先观察质量问题、不轻易删除数据。"],
            ["Filter", "按照质量规则移除部分被标记的序列。", "希望在比对前自动清理明显不合格输入。"]
          ] },
          { type: "callout", tone: "warning", title: "Filter 会改变进入比对的数据集", body: "提交前请确认过滤符合你的分析设计。任务状态页和结果概览会显示原始、保留、移除及重复折叠数量。" }
        ]
      }
    ]
  },
  {
    id: "status-access",
    title: "状态与任务凭证",
    summary: "跟踪任务阶段，并安全保存用于恢复结果的访问凭证。",
    keywords: ["状态", "token", "凭证", "恢复", "访问 JSON", "过期"],
    articles: [
      {
        id: "job-stages",
        title: "任务运行阶段",
        summary: "状态页会自动轮询队列、预处理、比对和打包进度。",
        keywords: ["queued", "preprocessing", "aligning", "packaging", "completed", "failed"],
        blocks: [
          { type: "steps", items: [
            { title: "排队", body: "任务等待可用 Worker。队列已满时提交会被拒绝。" },
            { title: "预处理", body: "检查和清理输入，并汇总质量问题与处理数量。" },
            { title: "比对", body: "使用选定算法生成多序列比对。" },
            { title: "结果准备", body: "生成摘要、压缩文件和运行日志。" },
            { title: "完成或失败", body: "完成后进入结果页；失败时显示可用的错误说明。" }
          ] }
        ]
      },
      {
        id: "access-credentials",
        title: "保存并恢复任务",
        summary: "任务 ID 不是密码，真正的访问凭证是 token。",
        keywords: ["安全", "本地历史", "恢复链接", "下载凭证"],
        blocks: [
          { type: "list", items: [
            "保存完整恢复链接，或下载页面提供的访问 JSON。",
            "当前浏览器最多保留最近 50 组任务凭证，可在查询任务页恢复或删除。",
            "更换浏览器或清理本地存储后，需要重新提供任务 ID 与 token。",
            "完成和失败的任务会按服务端保留策略过期；当前默认保留期为 7 天。"
          ] },
          { type: "callout", tone: "warning", title: "不要公开访问 token", body: "任何获得 token 的人都可能访问对应任务状态和结果。分享截图或链接前请隐藏 token。" }
        ]
      }
    ]
  },
  {
    id: "results-downloads",
    title: "结果与下载",
    summary: "使用科研概览理解结果，并获取服务端生成的文件。",
    keywords: ["结果", "概览", "下载", "产物", "预览限制"],
    articles: [
      {
        id: "result-dashboard",
        title: "科研概览",
        summary: "概览汇总预处理留存、比对质量、碱基组成和输出产物。",
        keywords: ["留存率", "GC", "质量轨道", "变异列"],
        blocks: [
          { type: "list", items: [
            "结果摘要显示序列数量、比对长度、gap 比例、保守性、entropy 和变异列数。",
            "预处理区域显示原始、保留、移除序列及运行模式。",
            "科研分析区域显示全长质量轨道、GC%、覆盖率和碱基组成。",
            "输出产物区域列出实际生成的预处理、比对和日志文件。"
          ] }
        ]
      },
      {
        id: "preview-limits",
        title: "比对预览边界",
        summary: "超出安全上限时仍可下载结果，但不在浏览器中推断统计。",
        keywords: ["1 MB", "500", "10000", "10,000", "truncated", "过大"],
        blocks: [
          { type: "table", headers: ["项目", "当前默认上限"], rows: [
            ["用于浏览器预览的 alignment 文件", "1 MB"],
            ["可视化序列数量", "500 条"],
            ["可视化比对长度", "10,000 列"]
          ] },
          { type: "callout", tone: "info", title: "超限不会删除结果", body: "页面会停止加载矩阵和基于矩阵的科研统计，避免卡顿或误导；完整服务端产物仍可在下载页获取。" }
        ]
      },
      {
        id: "downloads",
        title: "可下载文件",
        summary: "下载完整结果包或压缩后的 alignment FASTA。",
        keywords: ["zip", "fasta.gz", "xz", "summary JSON", "日志"],
        blocks: [
          { type: "list", items: [
            "all_results.zip：包含服务端生成的完整结果目录。",
            "alignment.fasta.gz：gzip 压缩的 alignment FASTA。",
            "alignment.fasta.gz.xz：进一步使用 xz 压缩的 alignment FASTA。",
            "查看器还可以按当前筛选、选区或选中行导出 FASTA，并导出 SVG 或 PNG 图像。"
          ] }
        ]
      }
    ]
  },
  {
    id: "msa-viewer",
    title: "MSA 查看器",
    summary: "浏览矩阵、定位 motif、设置 reference、分析区间并导出。",
    keywords: ["查看器", "reference", "motif", "IUPAC", "差异", "导出", "Canvas"],
    articles: [
      {
        id: "navigate-search",
        title: "导航、缩放与搜索",
        summary: "使用概览导航、序列搜索和 IUPAC motif 快速定位。",
        keywords: ["缩略图", "缩放", "序列 ID", "命中", "键盘"],
        blocks: [
          { type: "list", items: [
            "点击或拖动顶部概览导航图可以快速移动当前视窗。",
            "按序列 ID 搜索可过滤显示行；列筛选可聚焦变异、高保守或低 gap 列。",
            "motif 搜索支持 IUPAC 模糊碱基，可在命中列表中前后跳转。",
            "低缩放使用 Canvas 保证性能，高缩放自动切换为可点击和键盘操作的 DOM 单元格。",
            "方向键移动当前单元格，Shift 扩展列范围，也可以用鼠标拖拽选择区间。"
          ] },
          { type: "code", label: "IUPAC motif 示例", language: "text", code: "ATGRY\nR = A/G\nY = C/T" }
        ]
      },
      {
        id: "reference-analysis",
        title: "Reference 与差异分析",
        summary: "显式设置参考序列后查看替换、插入、缺失和参考坐标。",
        keywords: ["参考序列", "mismatch", "transition", "transversion", "坐标"],
        blocks: [
          { type: "list", items: [
            "任意序列都可以设为 reference；系统不会默认把第一条序列当作参考。",
            "reference 会固定在顶部，差异视图弱化匹配位点并区分替换、插入和缺失。",
            "参考坐标会跳过 reference 中的 gap，可在比对坐标和参考坐标之间切换。",
            "检查器会显示当前单元格、列和区间统计；存在 reference 时还显示 mismatch、transition/transversion 等统计。"
          ] }
        ]
      },
      {
        id: "tracks-rows-export",
        title: "统计轨道、行管理与导出",
        summary: "组合分析轨道，固定或隐藏行，并导出当前研究视图。",
        keywords: ["conservation", "coverage", "entropy", "固定", "隐藏", "SVG", "PNG", "FASTA"],
        blocks: [
          { type: "list", items: [
            "可切换 conservation、gap、coverage 和 Shannon entropy 轨道。",
            "序列行可以固定、隐藏、多选，并只导出选中行。",
            "Consensus 可在确定性多数规则与 IUPAC ambiguity 模式之间切换。",
            "FASTA 导出支持当前可见数据、选中区间和区间 consensus。",
            "SVG/PNG 导出会保留当前配色、reference 差异模式、统计轨道与选择范围。"
          ] },
          { type: "callout", tone: "tip", title: "偏好不会修改任务结果", body: "reference、配色、轨道、密度等查看偏好只保存在浏览器本地，不会写回服务端结果。" }
        ]
      }
    ]
  },
  {
    id: "metrics",
    title: "指标解读",
    summary: "理解保守性、覆盖率、gap、entropy、consensus 和 GC%。",
    keywords: ["科学指标", "保守性", "覆盖率", "熵", "共识", "GC"],
    articles: [
      {
        id: "column-metrics",
        title: "列与区间统计",
        summary: "所有查看器统计都基于当前加载的完整可视化 alignment。",
        keywords: ["conservation", "coverage", "gap fraction", "Shannon entropy"],
        blocks: [
          { type: "table", headers: ["指标", "含义", "阅读方式"], rows: [
            ["Conservation", "非 gap 碱基中，占比最高碱基的比例。", "越接近 100%，该列越一致。"],
            ["Coverage", "该列含有非 gap 碱基的序列比例。", "越高表示该列被更多序列覆盖。"],
            ["Gap fraction", "该列 gap 或空位的比例。", "高值可能提示插入缺失或局部覆盖不足。"],
            ["Shannon entropy", "该列非 gap 碱基组成的多样性，并归一化到 0–1。", "越高表示碱基分布越分散。"],
            ["Consensus", "按确定性多数规则或 IUPAC 平票规则生成的代表碱基。", "它是摘要，不等同于真实参考序列。"],
            ["GC%", "G 和 C 占 A/C/G/T/U 的比例。", "N、其他模糊字符和 gap 不进入 GC 分母。"]
          ] }
        ]
      },
      {
        id: "interpretation-caveats",
        title: "解读边界",
        summary: "统计用于探索与质量检查，不自动构成生物学结论。",
        keywords: ["注意", "抽样", "蛋白", "结论", "参考"],
        blocks: [
          { type: "callout", tone: "warning", title: "结合实验设计解释", body: "高 entropy、gap 或 mismatch 可能来自真实变异、测序质量、方向问题、输入截断或比对错误。应结合样本来源和分析目的判断。" },
          { type: "list", items: [
            "当前配色和统计优先面向 DNA/RNA，不提供蛋白专用指标。",
            "Consensus 不是系统自动选择的 reference；差异分析必须由用户显式设置 reference。",
            "结果超过预览限制时，页面不会基于抽样序列推断这些指标。"
          ] }
        ]
      }
    ]
  },
  {
    id: "faq",
    title: "常见问题",
    summary: "解决输入、服务、凭证、预览和导出中的常见问题。",
    keywords: ["FAQ", "问题", "错误", "帮助"],
    articles: [
      { id: "invalid-fasta", title: "为什么粘贴的 FASTA 无法提交？", summary: "通常是记录数不足、header 缺失、序列为空或字符数超限。", keywords: ["无效", "header", "空输入"], collapsible: true, blocks: [{ type: "paragraph", text: "确认至少有两条记录，每条 header 以 > 开头且后面存在非空序列内容；粘贴内容还必须不超过 200,000 字符。" }] },
      { id: "service-unavailable", title: "为什么提交按钮不可用？", summary: "服务健康检查、队列或选定算法可能暂时不可用。", keywords: ["离线", "队列满", "按钮禁用"], collapsible: true, blocks: [{ type: "paragraph", text: "查看页面顶部的服务状态。后端离线、队列已满或手动选择的算法不可用时，页面会阻止提交；可以稍后重试或选择当前可用算法。" }] },
      { id: "lost-token", title: "丢失 token 后还能恢复任务吗？", summary: "只有任务 ID 不能访问受保护的任务结果。", keywords: ["找回", "凭证丢失", "历史"], collapsible: true, blocks: [{ type: "paragraph", text: "先检查查询任务页的本地历史、通知邮件、保存的恢复链接或访问 JSON。若这些位置都没有 token，前端无法绕过访问控制恢复任务。" }] },
      { id: "large-preview", title: "为什么结果可以下载但不能显示矩阵？", summary: "alignment 超过文件大小、序列数量或列数预览上限。", keywords: ["过大", "truncated", "空矩阵"], collapsible: true, blocks: [{ type: "paragraph", text: "当 alignment 超过 1 MB、500 条序列或 10,000 列时，浏览器预览会停止，但服务端结果仍可从下载页获取。" }] },
      { id: "standalone-unaligned", title: "独立查看器会自动执行比对吗？", summary: "不会；它只解析和显示本地 FASTA。", keywords: ["本地查看", "长度不一致", "原始序列"], collapsible: true, blocks: [{ type: "paragraph", text: "等长输入可以作为 MSA 浏览；长度不一致时会按原始序列显示。需要生成新的 alignment 时，请使用提交任务页面。" }] },
      { id: "export-limit", title: "为什么 PNG 导出失败？", summary: "当前范围生成的画布可能超过浏览器安全尺寸。", keywords: ["图片", "尺寸", "SVG"], collapsible: true, blocks: [{ type: "paragraph", text: "缩小导出范围、降低缩放或改用 SVG/FASTA。SVG 更适合需要后续排版的矢量输出，大型完整结果则建议直接下载 FASTA。" }] }
    ]
  }
];

const en: DocsSection[] = [
  {
    id: "quick-start",
    title: "Quick start",
    summary: "Go from FASTA input to inspecting and downloading an alignment.",
    keywords: ["start", "workflow", "submit", "results"],
    articles: [
      {
        id: "workflow",
        title: "Complete an alignment in four steps",
        summary: "Prepare input, configure the task, wait for processing, and analyze results.",
        keywords: ["workflow", "beginner", "task"],
        blocks: [
          { type: "steps", items: [
            { title: "Prepare FASTA", body: "Prepare at least two DNA or RNA sequences, each with a header beginning with >." },
            { title: "Submit a task", body: "Paste sequences or upload a file, then choose an algorithm and preprocessing mode if needed." },
            { title: "Save access credentials", body: "Keep the task ID, access token, restore link, or access JSON so you can return later." },
            { title: "Interpret and export", body: "Inspect the scientific overview and MSA matrix, then export FASTA, SVG, PNG, or the server result bundle." }
          ] },
          { type: "callout", tone: "tip", title: "Only need to inspect an existing FASTA?", body: "The standalone MSA viewer opens a file locally in your browser. It does not align previously unaligned sequences." }
        ]
      },
      {
        id: "choose-entry",
        title: "Choose the right entry point",
        summary: "Submission, local viewing, and task restoration serve different workflows.",
        keywords: ["standalone viewer", "restore", "entry"],
        blocks: [
          { type: "table", headers: ["Goal", "Entry point", "What it does"], rows: [
            ["Run a new MSA", "Submit", "Runs preprocessing and minipoa or MAFFT on the backend."],
            ["Inspect local FASTA", "MSA Viewer", "Parses and displays data locally without running a new alignment."],
            ["Continue an existing task", "Task Lookup", "Uses a saved task ID, token, or access JSON."]
          ] }
        ]
      }
    ]
  },
  {
    id: "fasta-input",
    title: "FASTA and input",
    summary: "Learn valid FASTA syntax, paste and upload limits, and compressed-file support.",
    keywords: ["FASTA", "format", "upload", "archive", "limits"],
    articles: [
      {
        id: "valid-fasta",
        title: "Valid FASTA format",
        summary: "Every sequence needs a header and at least one non-empty sequence line.",
        keywords: ["header", "sequence", "example", ">"],
        blocks: [
          { type: "code", label: "FASTA example", language: "fasta", code: fastaExample },
          { type: "list", items: [
            "Online alignment requires at least two sequences.",
            "The first line of each record must begin with >; the remaining text is used as the sequence name.",
            "Sequences may span multiple lines, which are joined during submission.",
            "Use unique, concise sequence names to simplify search, reference selection, and export."
          ] }
        ]
      },
      {
        id: "input-limits",
        title: "Input methods and current default limits",
        summary: "Paste small datasets and use upload for large files or archives.",
        keywords: ["200000", "200,000", "100 MB", "zip", "tar", "gz", "xz", "bz2"],
        blocks: [
          { type: "table", headers: ["Input method", "Current default limit", "Best for"], rows: [
            ["Paste FASTA", "200,000 characters", "Small datasets with immediate format validation."],
            ["File upload", "100 MB", "Large FASTA files, compressed FASTA, or archives containing multiple FASTA files."],
            ["Standalone viewer", "200,000 bytes", "Opening one text FASTA locally in the browser."]
          ] },
          { type: "paragraph", text: "Upload supports common FASTA extensions plus gz, xz, bz2, zip, tar, tar.gz, tar.xz, and tar.bz2 archives. An archive may contain multiple FASTA files." },
          { type: "callout", tone: "info", title: "Deployment settings may differ", body: "These numbers are the current EasyMSA defaults. If an administrator changes them, follow the limits shown by the submission page and server response." }
        ]
      }
    ]
  },
  {
    id: "submit-preprocess",
    title: "Submission and preprocessing",
    summary: "Configure the task name, notification, alignment algorithm, and preprocessing behavior.",
    keywords: ["algorithm", "minipoa", "MAFFT", "auto", "audit", "filter", "email"],
    articles: [
      {
        id: "job-settings",
        title: "Task details and alignment algorithm",
        summary: "A task name is required; notification email and advanced settings are optional.",
        keywords: ["task name", "email", "auto mode", "advanced settings"],
        blocks: [
          { type: "list", items: [
            "The task name identifies the run, accepts up to 64 characters, and must not contain path characters or two consecutive periods (..).",
            "Notification email is optional; when provided, it receives an access link after completion or failure.",
            "Auto is the default algorithm selection and currently usually selects minipoa.",
            "minipoa or MAFFT can be selected explicitly; unavailable algorithms are disabled in the page."
          ] },
          { type: "table", headers: ["Algorithm", "Suggested use"], rows: [
            ["Auto", "Let the current service configuration select its available default."],
            ["minipoa", "The current default implementation for EasyMSA's fast workflow."],
            ["MAFFT", "Use when MAFFT is explicitly required or consistency with an existing MAFFT workflow matters."]
          ] }
        ]
      },
      {
        id: "preprocess-modes",
        title: "Audit and Filter",
        summary: "Both modes inspect input, but they treat suspicious sequences differently.",
        keywords: ["quality control", "duplicate", "remove"],
        blocks: [
          { type: "table", headers: ["Mode", "Behavior", "Recommended when"], rows: [
            ["Audit", "Reports potential problems and usually retains suspicious sequences.", "You want to inspect quality issues before removing data."],
            ["Filter", "Removes some sequences according to quality rules.", "You want obvious low-quality input cleaned before alignment."]
          ] },
          { type: "callout", tone: "warning", title: "Filter changes the aligned dataset", body: "Confirm that filtering matches your study design. The status page and result overview report raw, retained, removed, and collapsed duplicate counts." }
        ]
      }
    ]
  },
  {
    id: "status-access",
    title: "Status and task access",
    summary: "Track processing stages and safely preserve the credentials needed to restore results.",
    keywords: ["status", "token", "credentials", "restore", "access JSON", "expiry"],
    articles: [
      {
        id: "job-stages",
        title: "Task stages",
        summary: "The status page polls queueing, preprocessing, alignment, and packaging automatically.",
        keywords: ["queued", "preprocessing", "aligning", "packaging", "completed", "failed"],
        blocks: [
          { type: "steps", items: [
            { title: "Queued", body: "The task waits for an available worker. Submission is rejected if the queue is full." },
            { title: "Preprocessing", body: "Input is inspected and cleaned, with quality issues and actions summarized." },
            { title: "Alignment", body: "The selected algorithm generates the multiple sequence alignment." },
            { title: "Result preparation", body: "Summaries, compressed files, and run logs are produced." },
            { title: "Completed or failed", body: "Completed tasks open the results page; failures show the available error explanation." }
          ] }
        ]
      },
      {
        id: "access-credentials",
        title: "Save and restore a task",
        summary: "The task ID is not a password; the access token is the actual credential.",
        keywords: ["security", "local history", "restore link", "download credentials"],
        blocks: [
          { type: "list", items: [
            "Save the complete restore link or download the access JSON provided by the page.",
            "The current browser keeps up to 50 recent credential records, which can be restored or removed on Task Lookup.",
            "After changing browsers or clearing local storage, provide the task ID and token again.",
            "Completed and failed tasks expire according to the server retention policy; the current default is 7 days."
          ] },
          { type: "callout", tone: "warning", title: "Do not publish access tokens", body: "Anyone with the token may be able to inspect that task's status and results. Hide it before sharing screenshots or links." }
        ]
      }
    ]
  },
  {
    id: "results-downloads",
    title: "Results and downloads",
    summary: "Use the scientific overview to understand results and retrieve server-generated files.",
    keywords: ["results", "overview", "download", "artifacts", "preview limits"],
    articles: [
      {
        id: "result-dashboard",
        title: "Scientific overview",
        summary: "The dashboard combines preprocessing retention, alignment quality, composition, and output artifacts.",
        keywords: ["retention", "GC", "quality tracks", "variable columns"],
        blocks: [
          { type: "list", items: [
            "Result summary reports sequence count, alignment length, gap fraction, conservation, entropy, and variable columns.",
            "Preprocessing reports raw, retained, and removed sequences plus the run mode.",
            "Scientific analysis shows full-length quality tracks, GC content, coverage, and base composition.",
            "Output artifacts lists the preprocessing, alignment, and log files actually generated."
          ] }
        ]
      },
      {
        id: "preview-limits",
        title: "Alignment preview boundaries",
        summary: "Results remain downloadable beyond the safe browser limits, but statistics are not inferred.",
        keywords: ["1 MB", "500", "10000", "10,000", "truncated", "large"],
        blocks: [
          { type: "table", headers: ["Item", "Current default limit"], rows: [
            ["Alignment file used for browser preview", "1 MB"],
            ["Visualized sequences", "500"],
            ["Visualized alignment length", "10,000 columns"]
          ] },
          { type: "callout", tone: "info", title: "Exceeding a limit does not delete results", body: "The matrix and matrix-derived scientific statistics stop loading to prevent poor performance or misleading output. Complete server artifacts remain available from Downloads." }
        ]
      },
      {
        id: "downloads",
        title: "Downloadable files",
        summary: "Download the complete result bundle or compressed alignment FASTA.",
        keywords: ["zip", "fasta.gz", "xz", "summary JSON", "logs"],
        blocks: [
          { type: "list", items: [
            "all_results.zip contains the complete result directory generated by the server.",
            "alignment.fasta.gz is the gzip-compressed alignment FASTA.",
            "alignment.fasta.gz.xz applies additional xz compression to the alignment FASTA.",
            "The viewer can also export filtered data, selected regions or rows as FASTA, plus SVG and PNG images."
          ] }
        ]
      }
    ]
  },
  {
    id: "msa-viewer",
    title: "MSA Viewer",
    summary: "Navigate the matrix, locate motifs, set a reference, inspect regions, and export.",
    keywords: ["viewer", "reference", "motif", "IUPAC", "difference", "export", "Canvas"],
    articles: [
      {
        id: "navigate-search",
        title: "Navigation, zoom, and search",
        summary: "Use the overview navigator, sequence search, and IUPAC motifs to locate data quickly.",
        keywords: ["minimap", "zoom", "sequence ID", "matches", "keyboard"],
        blocks: [
          { type: "list", items: [
            "Click or drag the overview navigator to move the current viewport.",
            "Search by sequence ID to filter rows; column filters isolate variable, highly conserved, or low-gap columns.",
            "Motif search accepts IUPAC ambiguity codes and supports previous/next navigation plus a match list.",
            "Low zoom uses Canvas for performance; high zoom switches to keyboard-accessible, clickable DOM cells.",
            "Arrow keys move the selected cell, Shift extends the column range, and pointer dragging selects a region."
          ] },
          { type: "code", label: "IUPAC motif example", language: "text", code: "ATGRY\nR = A/G\nY = C/T" }
        ]
      },
      {
        id: "reference-analysis",
        title: "Reference and difference analysis",
        summary: "Set an explicit reference to inspect substitutions, insertions, deletions, and reference coordinates.",
        keywords: ["reference sequence", "mismatch", "transition", "transversion", "coordinates"],
        blocks: [
          { type: "list", items: [
            "Any sequence may be the reference; the first sequence is never assumed automatically.",
            "The reference remains pinned at the top, and difference mode distinguishes substitutions, insertions, and deletions while fading matches.",
            "Reference coordinates skip gaps in the reference and can be toggled against alignment coordinates.",
            "The inspector reports cell, column, and range statistics; with a reference it also reports mismatch and transition/transversion statistics."
          ] }
        ]
      },
      {
        id: "tracks-rows-export",
        title: "Tracks, row management, and export",
        summary: "Combine analysis tracks, pin or hide rows, and export the current research view.",
        keywords: ["conservation", "coverage", "entropy", "pin", "hide", "SVG", "PNG", "FASTA"],
        blocks: [
          { type: "list", items: [
            "Toggle conservation, gap, coverage, and Shannon entropy tracks.",
            "Rows can be pinned, hidden, multi-selected, and exported as selected rows only.",
            "Consensus can use deterministic majority or IUPAC ambiguity mode.",
            "FASTA export supports current visible data, a selected region, and region consensus.",
            "SVG and PNG export preserve the current colors, reference difference mode, statistical tracks, and selection."
          ] },
          { type: "callout", tone: "tip", title: "Preferences do not modify task results", body: "Reference, colors, tracks, and density are stored locally in the browser and are never written back to server results." }
        ]
      }
    ]
  },
  {
    id: "metrics",
    title: "Interpreting metrics",
    summary: "Understand conservation, coverage, gaps, entropy, consensus, and GC content.",
    keywords: ["scientific metrics", "conservation", "coverage", "entropy", "consensus", "GC"],
    articles: [
      {
        id: "column-metrics",
        title: "Column and range statistics",
        summary: "Viewer statistics use the complete alignment currently loaded for visualization.",
        keywords: ["conservation", "coverage", "gap fraction", "Shannon entropy"],
        blocks: [
          { type: "table", headers: ["Metric", "Meaning", "How to read it"], rows: [
            ["Conservation", "The largest base fraction among non-gap observations.", "Values near 100% indicate stronger agreement."],
            ["Coverage", "The fraction of sequences with a non-gap base in the column.", "Higher values mean more sequences cover the position."],
            ["Gap fraction", "The fraction of gaps or empty cells in the column.", "High values may reflect indels or limited local coverage."],
            ["Shannon entropy", "Diversity of non-gap base composition, normalized to 0–1.", "Higher values indicate a more dispersed base distribution."],
            ["Consensus", "A representative base from deterministic majority or IUPAC tie handling.", "It is a summary, not a biological reference sequence."],
            ["GC content", "G and C divided by A/C/G/T/U.", "N, other ambiguities, and gaps are excluded from the denominator."]
          ] }
        ]
      },
      {
        id: "interpretation-caveats",
        title: "Interpretation boundaries",
        summary: "Statistics support exploration and quality control; they do not create biological conclusions automatically.",
        keywords: ["caution", "sampling", "protein", "conclusion", "reference"],
        blocks: [
          { type: "callout", tone: "warning", title: "Interpret in the context of study design", body: "High entropy, gaps, or mismatches may represent real variation, sequencing quality, orientation problems, truncated input, or alignment error. Evaluate them against sample provenance and analysis goals." },
          { type: "list", items: [
            "Current colors and statistics prioritize DNA/RNA and do not provide protein-specific metrics.",
            "Consensus is not an automatically selected reference; difference analysis requires an explicit user-selected reference.",
            "When a result exceeds preview limits, these metrics are not inferred from a sequence sample."
          ] }
        ]
      }
    ]
  },
  {
    id: "faq",
    title: "Frequently asked questions",
    summary: "Resolve common input, service, credential, preview, and export issues.",
    keywords: ["FAQ", "questions", "errors", "help"],
    articles: [
      { id: "invalid-fasta", title: "Why can I not submit pasted FASTA?", summary: "Common causes are too few records, missing headers, empty sequences, or the character limit.", keywords: ["invalid", "header", "empty"], collapsible: true, blocks: [{ type: "paragraph", text: "Confirm there are at least two records, every header begins with >, sequence content is non-empty, and the pasted input does not exceed 200,000 characters." }] },
      { id: "service-unavailable", title: "Why is the submit button unavailable?", summary: "Service health, queue capacity, or the selected algorithm may be unavailable.", keywords: ["offline", "queue full", "disabled"], collapsible: true, blocks: [{ type: "paragraph", text: "Check the service status at the top of the page. Submission is blocked when the backend is offline, the queue is full, or a manually selected algorithm is unavailable; retry later or select an available algorithm." }] },
      { id: "lost-token", title: "Can I restore a task after losing its token?", summary: "A task ID alone cannot access a protected task.", keywords: ["recover", "lost credentials", "history"], collapsible: true, blocks: [{ type: "paragraph", text: "Check local history on Task Lookup, notification email, saved restore links, and downloaded access JSON. If none contains the token, the frontend cannot bypass access control to restore the task." }] },
      { id: "large-preview", title: "Why can I download results but not display the matrix?", summary: "The alignment exceeds the file-size, sequence-count, or column preview boundary.", keywords: ["large", "truncated", "empty matrix"], collapsible: true, blocks: [{ type: "paragraph", text: "Browser preview stops when the alignment exceeds 1 MB, 500 sequences, or 10,000 columns, but server results remain available from Downloads." }] },
      { id: "standalone-unaligned", title: "Does the standalone viewer align sequences automatically?", summary: "No. It only parses and displays local FASTA.", keywords: ["local viewer", "unequal length", "raw sequences"], collapsible: true, blocks: [{ type: "paragraph", text: "Equal-length input can be viewed as an MSA; unequal-length input is shown as raw sequences. Use Submit when a new alignment must be generated." }] },
      { id: "export-limit", title: "Why did PNG export fail?", summary: "The current region may produce a canvas beyond browser safety limits.", keywords: ["image", "dimensions", "SVG"], collapsible: true, blocks: [{ type: "paragraph", text: "Reduce the exported region, lower zoom, or use SVG/FASTA. SVG is preferable for vector layout work, while full large results are best downloaded as FASTA." }] }
    ]
  }
];

export const docsContent: Record<Locale, DocsSection[]> = { zh, en };

function blockText(block: DocsBlock): string {
  if (block.type === "paragraph") return block.text;
  if (block.type === "list") return block.items.join(" ");
  if (block.type === "steps") return block.items.map((item) => `${item.title} ${item.body}`).join(" ");
  if (block.type === "code") return `${block.label} ${block.code}`;
  if (block.type === "callout") return `${block.title} ${block.body}`;
  return `${block.headers.join(" ")} ${block.rows.flat().join(" ")}`;
}

export function articleSearchText(section: DocsSection, article: DocsArticle) {
  return [
    section.title,
    section.summary,
    ...section.keywords,
    article.title,
    article.summary,
    ...article.keywords,
    ...article.blocks.map(blockText)
  ].join(" ");
}

export function flattenDocsText(sections: DocsSection[]) {
  return sections
    .flatMap((section) => section.articles.map((article) => articleSearchText(section, article)))
    .join(" ");
}
