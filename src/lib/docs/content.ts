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
  | { type: "links"; items: Array<{label:string;to:string}> }
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
      "id": "linked-workflows",
      "title": "三条完整使用流程",
      "summary": "选择适合你的流程，从示例开始体验。",
      "keywords": [
            "ReAlign-N",
            "MiniPOA",
            "example",
            "refinement",
            "重比对",
            "示例"
      ],
      "blocks": [
            {
                  "type": "steps",
                  "items": [
                        {
                              "title": "普通比对",
                              "body": "上传 FASTA 或载入示例，选择 Auto 或指定方法后提交。"
                        },
                        {
                              "title": "比对后重比对",
                              "body": "在普通提交页最后勾选 ReAlign-N；完成后切换初始、重比对与最终结果。优化失败、超限或跳过时保留初始结果，并显示原因。"
                        },
                        {
                              "title": "独立重比对",
                              "body": "上传等长的已比对 FASTA 或 FASTA.gz，默认先局部后全局。完成后可查看和下载各阶段结果。"
                        }
                  ]
            },
            {
                  "type": "links",
                  "items": [
                        {
                              "label": "普通示例输入与结果",
                              "to": "/examples/alignment-small"
                        },
                        {
                              "label": "重比对输入与结果",
                              "to": "/examples/realignment-small"
                        },
                        {
                              "label": "方法与引用",
                              "to": "/about"
                        },
                        {
                              "label": "隐私与记录管理",
                              "to": "/privacy"
                        },
                        {
                              "label": "许可与免费使用",
                              "to": "/license"
                        }
                  ]
            },
            {
                  "type": "paragraph",
                  "text": "普通上传限制为 100 MiB；重比对还需同时满足 2,000 条序列、30,000 列和 1,000,000 字符，实际以服务返回值为准。独立重比对仅接受 ACGT- 或 ACGU-，拒绝混用 T/U 和简并字符。浏览器预览另有限制，完整结果以下载文件为准。"
            },
            {
                  "type": "paragraph",
                  "text": "结合保守性、gap 分布和区域统计，检查感兴趣的比对区域。结果文件保留 7 天，建议及时下载。请妥善保存恢复链接。"
            }
      ]
},
      {
        id: "workflow",
        title: "四步完成一次比对",
        summary: "准备输入、设置参数、提交任务、查看与下载。",
        keywords: ["工作流", "新手", "任务"],
        blocks: [
          {
            type: "steps",
            items: [
              { title: "准备 FASTA", body: "准备至少两条 DNA 或 RNA 序列，每条记录都包含以 > 开头的 header。" },
              { title: "设置参数", body: "选择 Auto 或指定方法，按需调整预处理和重比对设置。" },
              { title: "提交任务", body: "提交后保存恢复链接或任务凭证，方便稍后查看进度与结果。" },
              { title: "查看与下载", body: "查看科研概览和 MSA 矩阵，并下载 FASTA、SVG、PNG 或服务端结果包。" }
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
            ["执行新的 MSA", "提交任务", "运行预处理与所选比对方法。"],
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
    keywords: ["算法", "minipoa", "MAFFT", "auto", "thread", "maxiterate", "reorder", "audit", "filter", "邮件"],
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
            "Auto 是默认的自适应模式：后端根据序列数量、长度与相似性特征，在 minipoa、MAFFT、HAlign4 与 FMAlign2 之间选择，并在任务完成后显示实际使用的方法。",
            "也可以手动选择 minipoa、MAFFT、HAlign4、FMAlign2；服务不可用的算法会在页面中禁用。"
          ] },
          { type: "table", headers: ["算法", "建议用途", "适用数据"], rows: [
            ["Auto（自适应）", "后端根据输入特征选择方法，结果页显示实际算法。", "DNA/RNA；约 50–10,000 条序列、长度中位数约 495–10,000。"],
            ["minipoa", "EasyMSA 快速工作流的默认实现。", "中等规模、序列相似度较高的数据集。"],
            ["MAFFT", "需要明确使用 MAFFT 或与既有 MAFFT 流程保持一致时。", "数百至数千条中等长度序列的通用场景。"],
            ["HAlign4", "面向超大规模 DNA/RNA 的原生高速比对，内存占用较高。", "超大规模且整体相似的 DNA/RNA。"],
            ["FMAlign2", "FMAlign2 框架内置 MAFFT 后端。", "大体量数据的加速管线。"]
          ] },
          { type: "paragraph", text: "高级设置中的算法参数只影响当前任务。所有输入都会在前端检查，并由后端再次验证；恢复服务器默认值会停止发送自定义 algorithm_params。" },
          { type: "table", headers: ["参数", "适用算法", "含义与范围"], rows: [
            ["thread", "Auto、minipoa、MAFFT、HAlign4、FMAlign2 系列", "线程数；留空由服务器自动分配，上限以当前服务器资源配置为准。"],
            ["mode", "MAFFT", "auto、fast、localpair 或 globalpair；根据速度与局部/全局同源假设选择。"],
            ["maxiterate", "MAFFT", "最大迭代次数，允许 0–1000；较大的值通常需要更多运行时间。"],
            ["reorder", "MAFFT", "允许 MAFFT 根据比对结果重新排列输出序列。"]
          ] },
          { type: "callout", tone: "warning", title: "显式选择与资源消耗", body: "手动选择的方法会直接执行，不经过自适应选择器。HAlign4 与 FMAlign2 系列可能显著增加运行时间和内存占用，请根据数据规模选择。" },
          { type: "callout", tone: "info", title: "记录可复现参数", body: "自定义参数可能改变运行时间、输出顺序和比对结果。用于科研分析时，请在实验记录中保存算法名称及参数值。" }
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
            "点击或拖动顶部概览导航图可以快速移动当前视窗；概览始终使用原始 alignment 坐标，即使列筛选后也不会按压缩比例重映射。",
            "按序列名称搜索只改变可见行。科学指标默认使用全部行；只有显式切换 Analysis scope 为“可见行”或“已选行”时才改变分析样本。",
            "motif 搜索只自动移除空白，gap 或非法符号会直接报错，不会被静默删除；可选择严格/可能匹配和正向/双链搜索。",
            "矩阵只有一个键盘 Tab 入口。方向键移动，Home/End、PageUp/PageDown 跨区导航，Shift 扩展选区并自动滚动。",
            "低缩放使用 Canvas、高缩放使用 DOM；两种渲染共享同一 viewport、当前单元格、reference 和选择状态。"
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
            "reference 会固定在顶部；差异分为 match、compatible ambiguity、substitution、insertion、deletion、empty 和 unknown。",
            "参考 gap 列使用稳定 interbase 坐标，例如 12+1、12+2；reference 首碱基前的插入从 0+1 开始。",
            "Ti/Tv 只统计双方均为确定 canonical 碱基的 substitution；模糊替换单列为未分类替换。",
            "检查器和区间统计同时报告有效比较分母、差异绝对数与差异率，不把不可判定字符塞入 transversion。"
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
            "序列行可以固定、隐藏、多选、批量操作和添加 note、review 或 exclude-candidate 标记；标记不会删除或自动排除源数据。",
            "Consensus 可在确定性多数规则与 IUPAC ambiguity 模式之间切换。",
            "FASTA、SVG 和 PNG 使用相同的四种范围：当前 viewport、连续 selected interval、完整 filtered view、原始 full alignment。",
            "QC bundle 包含主文件、manifest.json、rows.tsv，并在非连续列或存在标记时加入 columns.tsv 与 annotations.tsv；仅裸文件模式不具备完整复现信息。"
          ] },
          { type: "callout", tone: "tip", title: "工作区按比对指纹保存", body: "reference、scope、筛选、选区、布局和 QC 标记按规范化 alignment SHA-256 分区保存在浏览器本地，不会写回服务端，也不会写入 token、URL 查询参数或本机绝对路径。" }
        ]
      },
      {
        id: "workspace-modes",
        title: "科研 QC 工作区与输入模式",
        summary: "了解沉浸工作区、重复 header 和中性只读模式。",
        keywords: ["工作区", "rowKey", "重复 header", "neutral", "蛋白", "不等长"],
        blocks: [
          { type: "list", items: [
            "展开工作区会使用浏览器视口的完整高度；退出后恢复页面滚动位置和触发按钮焦点。",
            "内部 rowKey 区分重复 FASTA header，因此同名序列仍能分别选择、固定、隐藏、设为 reference 和标记。",
            "只有合法、等长的 DNA/RNA 或 IUPAC 核酸 alignment 启用科学统计。蛋白质、未知字符和不等长 FASTA 进入中性只读模式。",
            "中性模式保留原始字符浏览、名称搜索和原始 FASTA 下载，但不会把尾部空白解释为 gap、deletion 或低 coverage。"
          ] }
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
          { type: "table", headers: ["指标", "nucleotide-v2 定义", "阅读方式"], rows: [
            ["Coverage", "非 gap 行数 / 总行数。", "模糊碱基计入 coverage。"],
            ["Informative coverage", "canonical A/C/G/T(U) 行数 / 总行数。", "只表示可确定碱基的覆盖。"],
            ["Conservation", "dominant canonical count / canonical count；无 canonical 时不可用。", "越接近 100%，确定碱基越一致。"],
            ["Gap fraction", "gap 行数 / 总行数。", "高值可能提示 indel 或局部覆盖不足。"],
            ["Shannon entropy", "仅基于 canonical 的 −Σ p log2(p)，单位 bits；normalized entropy = entropy bits / 2。", "A/C/G/T 等频时为 2 bits、归一化为 1。"],
            ["Consensus", "canonical 多数；平票时 majority 用确定性顺序并标记 tie，IUPAC 模式输出并列集合对应码；无 canonical 输出 N。", "Consensus 是摘要，不是真实 reference。"],
            ["GC%", "(G + C) / (A + C + G + T/U)。", "N、其他模糊字符和 gap 不进入分母。"]
          ] }
        ]
      },
      {
        id: "interpretation-caveats",
        title: "结果解读建议",
        summary: "结合统计轨迹、样本来源和分析目的检查感兴趣的区域。",
        keywords: ["注意", "抽样", "蛋白", "结论", "参考"],
        blocks: [
          { type: "callout", tone: "tip", title: "检查感兴趣的区域", body: "从 entropy、gap 或 mismatch 较高的区域开始，结合样本来源检查序列差异、覆盖和方向。" },
          { type: "list", items: [
            "R/Y/S/W/K/M/B/D/H/V/N 计入 ambiguity，但不进入 conservation、entropy、GC、Ti/Tv 或确定性 consensus 的分母；ambiguity 本身不会制造变异列。",
            "蛋白质、非法字符、无法可靠判断的字母表和不等长 FASTA 不提供 GC、IUPAC、Ti/Tv、conservation 或 consensus。",
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
      { id: "service-unavailable", title: "为什么提交按钮不可用？", summary: "服务健康检查、队列或选定算法可能暂时不可用。", keywords: ["离线", "队列满", "按钮禁用"], collapsible: true, blocks: [{ type: "paragraph", text: "查看页面顶部的服务状态。后端离线、队列已满或手动选择的算法不可用时，页面会阻止提交；例如 HAlign4 与 FMAlign2 系列在对应工具未安装时会被禁用。可以稍后重试或选择当前可用算法。" }] },
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
      "id": "linked-workflows",
      "title": "Three complete workflows",
      "summary": "Choose a workflow and try an example.",
      "keywords": [
            "ReAlign-N",
            "MiniPOA",
            "example",
            "refinement",
            "重比对",
            "示例"
      ],
      "blocks": [
            {
                  "type": "steps",
                  "items": [
                        {
                              "title": "Ordinary alignment",
                              "body": "Upload FASTA or load an example, choose Auto or a method, and submit."
                        },
                        {
                              "title": "Alignment followed by refinement",
                              "body": "Enable ReAlign-N at the end of the ordinary form. Switch between initial, refined and final results. Failed, oversized or skipped refinement retains the initial result with an explanation."
                        },
                        {
                              "title": "Standalone refinement",
                              "body": "Upload equal-length aligned FASTA or FASTA.gz. The default order is local then global. View and download each stage after completion."
                        }
                  ]
            },
            {
                  "type": "links",
                  "items": [
                        {
                              "label": "Alignment input and interactive result",
                              "to": "/examples/alignment-small"
                        },
                        {
                              "label": "Refinement input and interactive result",
                              "to": "/examples/realignment-small"
                        },
                        {
                              "label": "Methods and citations",
                              "to": "/about"
                        },
                        {
                              "label": "Privacy and storage controls",
                              "to": "/privacy"
                        },
                        {
                              "label": "Licensing and free access",
                              "to": "/license"
                        }
                  ]
            },
            {
                  "type": "paragraph",
                  "text": "Ordinary uploads are limited to 100 MiB. Refinement must also satisfy 2,000 sequences, 30,000 columns and 1,000,000 cells together; live service values take precedence. Standalone refinement accepts ACGT- or ACGU- only, rejecting mixed T/U and ambiguous bases. Browser previews have separate limits; use downloads for complete results."
            },
            {
                  "type": "paragraph",
                  "text": "Use conservation, gap distribution and regional statistics to inspect regions of interest. Result files are retained for 7 days; download them promptly and keep your recovery link private."
            }
      ]
},
      {
        id: "workflow",
        title: "Complete an alignment in four steps",
        summary: "Prepare input, configure settings, submit, and view or download results.",
        keywords: ["workflow", "beginner", "task"],
        blocks: [
          { type: "steps", items: [
            { title: "Prepare FASTA", body: "Prepare at least two DNA or RNA sequences, each with a header beginning with >." },
            { title: "Configure settings", body: "Choose Auto or a method, then adjust preprocessing and refinement as needed." },
            { title: "Submit a job", body: "Submit and save your recovery link or access credentials to return to progress and results later." },
            { title: "View and download", body: "Inspect the scientific overview and MSA matrix, then export FASTA, SVG, PNG, or the server result bundle." }
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
            ["Run a new MSA", "Submit", "Runs preprocessing and the selected alignment method."],
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
    keywords: ["algorithm", "minipoa", "MAFFT", "auto", "thread", "maxiterate", "reorder", "audit", "filter", "email"],
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
            "Auto is the default adaptive mode: the backend chooses among minipoa, MAFFT, HAlign4, and FMAlign2 based on sequence count, length, and similarity, then reports the actual tool after completion.",
            "minipoa, MAFFT, HAlign4, or FMAlign2 can also be selected explicitly; unavailable algorithms are disabled in the page."
          ] },
          { type: "table", headers: ["Algorithm", "Suggested use", "Data fit"], rows: [
            ["Auto (adaptive)", "Backend selection from input features; the result records the actual method.", "DNA/RNA; roughly 50–10,000 sequences with median length about 495–10,000."],
            ["minipoa", "The default implementation for EasyMSA's fast workflow.", "Medium-sized datasets with closely related sequences."],
            ["MAFFT", "Use when MAFFT is explicitly required or consistency with an existing MAFFT workflow matters.", "General-purpose use with hundreds to thousands of medium-length sequences."],
            ["HAlign4", "Native high-speed alignment for ultra-large DNA/RNA datasets; higher memory usage.", "Ultra-large, globally similar DNA/RNA sets."],
            ["FMAlign2", "FMAlign2 framework with a built-in MAFFT backend.", "Accelerated pipeline for large datasets."]
          ] },
          { type: "paragraph", text: "Algorithm parameters in advanced settings apply to the current task only. Inputs are checked in the browser and validated again by the backend; restoring server defaults stops sending custom algorithm_params." },
          { type: "table", headers: ["Parameter", "Algorithms", "Meaning and range"], rows: [
            ["thread", "Auto, minipoa, MAFFT, HAlign4, FMAlign2 methods", "Thread count. Leave blank for server allocation; the upper bound follows the current server resource configuration."],
            ["mode", "MAFFT", "auto, fast, localpair, or globalpair, selected according to speed and local/global homology assumptions."],
            ["maxiterate", "MAFFT", "Maximum iteration count from 0 to 1000; larger values usually require more runtime."],
            ["reorder", "MAFFT", "Allow MAFFT to reorder output sequences based on the alignment result."]
          ] },
          { type: "callout", tone: "warning", title: "Explicit selection and resource usage", body: "Manually selected methods run directly and bypass the adaptive selector. HAlign4 and the FMAlign2 family can substantially increase runtime and memory; choose according to data size." },
          { type: "callout", tone: "info", title: "Record parameters for reproducibility", body: "Custom parameters can change runtime, output order, and the alignment itself. For research use, record the algorithm name and parameter values with the experiment." }
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
            "Click or drag the overview navigator to move the viewport. It always maps full alignment coordinates, even when a column filter is active.",
            "Sequence-name search changes visible rows only. Scientific metrics use all rows by default and change only when Analysis scope is explicitly set to Visible or Selected.",
            "Motif search removes whitespace only. Gaps and invalid symbols produce validation errors; strict/possible matching and forward/both-strand search are explicit controls.",
            "The matrix has one keyboard Tab stop. Arrow keys move; Home/End and PageUp/PageDown navigate farther; Shift extends the range with automatic scrolling.",
            "Low zoom uses Canvas and high zoom uses DOM; both renderers share the same viewport, active cell, reference, and selection state."
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
            "The reference remains pinned. Differences are match, compatible ambiguity, substitution, insertion, deletion, empty, or unknown.",
            "Reference-gap columns use stable interbase coordinates such as 12+1 and 12+2; insertions before the first reference base begin at 0+1.",
            "Ti/Tv includes substitutions only when both sides are unambiguous canonical bases; ambiguous substitutions are reported as unclassified.",
            "The inspector and range statistics show the valid comparison denominator, absolute difference count, and difference rate."
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
            "Rows can be pinned, hidden, multi-selected, batch-operated, and annotated as note, review, or exclude-candidate; annotations never delete or automatically exclude source data.",
            "Consensus can use deterministic majority or IUPAC ambiguity mode.",
            "FASTA, SVG, and PNG share four regions: viewport, continuous selected interval, complete filtered view, and original full alignment.",
            "A QC bundle includes the primary file, manifest.json, rows.tsv, and—when needed—columns.tsv and annotations.tsv. Bare-file mode omits complete reproducibility metadata."
          ] },
          { type: "callout", tone: "tip", title: "Workspaces are keyed by alignment fingerprint", body: "Reference, scope, filters, selection, layout, and QC annotations are stored locally by normalized alignment SHA-256. They are not written to the server and never include tokens, URL queries, or absolute local paths." }
        ]
      },
      {
        id: "workspace-modes",
        title: "Scientific QC workspace and input modes",
        summary: "Understand immersive layout, duplicate headers, and neutral read-only mode.",
        keywords: ["workspace", "rowKey", "duplicate header", "neutral", "protein", "unequal"],
        blocks: [
          { type: "list", items: [
            "Immersive workspace mode fills the browser viewport and restores page scroll and trigger focus when closed.",
            "Internal rowKey identities distinguish duplicate FASTA headers, so same-named rows can still be selected, pinned, hidden, referenced, and annotated independently.",
            "Scientific metrics are enabled only for legal, equal-length DNA/RNA or IUPAC nucleotide alignments. Proteins, unknown symbols, and unequal FASTA enter neutral read-only mode.",
            "Neutral mode keeps raw-character browsing, name search, and raw FASTA download, but never interprets missing tails as gaps, deletions, or low coverage."
          ] }
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
          { type: "table", headers: ["Metric", "nucleotide-v2 definition", "How to read it"], rows: [
            ["Coverage", "Non-gap rows / total rows.", "Ambiguous bases count toward coverage."],
            ["Informative coverage", "Canonical A/C/G/T(U) rows / total rows.", "Measures coverage by determinate bases only."],
            ["Conservation", "Dominant canonical count / canonical count; unavailable with no canonical observation.", "Values near 100% indicate stronger canonical agreement."],
            ["Gap fraction", "Gap rows / total rows.", "High values may reflect indels or limited local coverage."],
            ["Shannon entropy", "−Σ p log2(p) over canonical bases, in bits; normalized entropy = entropy bits / 2.", "Equal A/C/G/T gives 2 bits and normalized value 1."],
            ["Consensus", "Canonical majority; deterministic marked tie in majority mode, IUPAC code for tied maxima in IUPAC mode, N when no canonical base exists.", "It is a summary, not a biological reference sequence."],
            ["GC content", "(G + C) / (A + C + G + T/U).", "N, other ambiguities, and gaps are excluded from the denominator."]
          ] }
        ]
      },
      {
        id: "interpretation-caveats",
        title: "Interpreting results",
        summary: "Use statistical tracks, sample provenance and analysis goals to inspect regions of interest.",
        keywords: ["caution", "sampling", "protein", "conclusion", "reference"],
        blocks: [
          { type: "callout", tone: "tip", title: "Inspect regions of interest", body: "Start with regions of high entropy, gaps or mismatches, then use sample provenance to examine sequence differences, coverage and orientation." },
          { type: "list", items: [
            "R/Y/S/W/K/M/B/D/H/V/N count as ambiguity but are excluded from conservation, entropy, GC, Ti/Tv, and determinate-consensus denominators; ambiguity alone does not create a variable column.",
            "Protein, illegal-symbol, uncertain-alphabet, and unequal-length FASTA inputs do not show GC, IUPAC, Ti/Tv, conservation, or consensus metrics.",
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
      { id: "service-unavailable", title: "Why is the submit button unavailable?", summary: "Service health, queue capacity, or the selected algorithm may be unavailable.", keywords: ["offline", "queue full", "disabled"], collapsible: true, blocks: [{ type: "paragraph", text: "Check the service status at the top of the page. Submission is blocked when the backend is offline, the queue is full, or a manually selected algorithm is unavailable (for example, HAlign4 and FMAlign2 methods are disabled when their backend tools are not installed). Retry later or select an available algorithm." }] },
      { id: "lost-token", title: "Can I restore a task after losing its token?", summary: "A task ID alone cannot access a protected task.", keywords: ["recover", "lost credentials", "history"], collapsible: true, blocks: [{ type: "paragraph", text: "Check local history on Task Lookup, notification email, saved restore links, and downloaded access JSON. If none contains the token, the frontend cannot bypass access control to restore the task." }] },
      { id: "large-preview", title: "Why can I download results but not display the matrix?", summary: "The alignment exceeds the file-size, sequence-count, or column preview boundary.", keywords: ["large", "truncated", "empty matrix"], collapsible: true, blocks: [{ type: "paragraph", text: "Browser preview stops when the alignment exceeds 1 MB, 500 sequences, or 10,000 columns, but server results remain available from Downloads." }] },
      { id: "standalone-unaligned", title: "Does the standalone viewer align sequences automatically?", summary: "No. It only parses and displays local FASTA.", keywords: ["local viewer", "unequal length", "raw sequences"], collapsible: true, blocks: [{ type: "paragraph", text: "Equal-length input can be viewed as an MSA; unequal-length input is shown as raw sequences. Use Submit when a new alignment must be generated." }] },
      { id: "export-limit", title: "Why did PNG export fail?", summary: "The current region may produce a canvas beyond browser safety limits.", keywords: ["image", "dimensions", "SVG"], collapsible: true, blocks: [{ type: "paragraph", text: "Reduce the exported region, lower zoom, or use SVG/FASTA. SVG is preferable for vector layout work, while full large results are best downloaded as FASTA." }] }
    ]
  }
];

export const docsContent: Record<Locale, DocsSection[]> = { zh, en };

function blockText(block: DocsBlock): string {
  if (block.type === "links") return block.items.map(item=>item.label).join(" ");
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
