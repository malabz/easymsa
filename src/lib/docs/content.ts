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
    "id": "quick-start",
    "title": "快速开始",
    "summary": "",
    "keywords": [
      "开始",
      "流程",
      "提交",
      "结果"
    ],
    "articles": [
      {
        "id": "workflow",
        "title": "三步开始比对",
        "summary": "",
        "keywords": [
          "工作流",
          "新手",
          "任务"
        ],
        "blocks": [
          {
            "type": "steps",
            "items": [
              {
                "title": "准备输入",
                "body": "粘贴或上传至少两条 DNA / RNA 序列。"
              },
              {
                "title": "提交比对",
                "body": "默认自动选择方法，也可手动指定；按需勾选“比对完成后进行重比对”。"
              },
              {
                "title": "查看结果",
                "body": "打开比对结果，浏览、搜索并下载文件。"
              }
            ]
          },
          {
            "type": "paragraph",
            "text": "已有比对可从“重比对”页面粘贴或上传；仅需浏览文件时，使用“查看 MSA”。"
          },
          {
            "type": "links",
            "items": [
              {
                "label": "比对示例",
                "to": "/examples/alignment-small"
              },
              {
                "label": "重比对示例",
                "to": "/examples/realignment-small"
              },
              {
                "label": "打开查看器",
                "to": "/viewer"
              }
            ]
          },
          {
            "type": "paragraph",
            "text": "结果文件保留 7 天。请保存结果链接，并及时下载。"
          }
        ]
      }
    ]
  },
  {
    "id": "fasta-input",
    "title": "FASTA 与输入",
    "summary": "",
    "keywords": [
      "FASTA",
      "格式",
      "上传",
      "压缩",
      "限制"
    ],
    "articles": [
      {
        "id": "valid-fasta",
        "title": "有效的 FASTA 格式",
        "summary": "",
        "keywords": [
          "header",
          "序列",
          "示例",
          ">"
        ],
        "blocks": [
          {
            "type": "code",
            "label": "FASTA 示例",
            "language": "fasta",
            "code": ">reference_sequence\nATGCTAGCTAGC\n>sample_02\nATGCTAGATAGC\n>sample_03\nATG-TAGCTAGC"
          },
          {
            "type": "list",
            "items": [
              "在线比对至少需要两条序列。",
              "每条记录的第一行必须以 > 开头，后面的文本作为序列名称。",
              "序列可以分成多行；提交时会连接为一条连续序列。",
              "建议使用唯一且简短的序列名称，便于搜索、设为对照序列和导出。"
            ]
          }
        ]
      },
      {
        "id": "input-limits",
        "title": "输入方式与限制",
        "summary": "",
        "keywords": [
          "200000",
          "200,000",
          "100 MB",
          "zip",
          "tar",
          "gz",
          "xz",
          "bz2"
        ],
        "blocks": [
          {
            "type": "table",
            "headers": [
              "入口",
              "输入方式",
              "限制"
            ],
            "rows": [
              [
                "普通比对",
                "粘贴 FASTA",
                "20 万字符"
              ],
              [
                "普通比对",
                "上传 FASTA 或压缩文件",
                "100 MiB"
              ],
              [
                "重比对",
                "粘贴或上传已比对 FASTA；上传支持 gzip",
                "100 MiB；最多 2,000 条序列、30,000 列、100 万比对字符"
              ],
              [
                "MSA 查看器",
                "粘贴或打开 FASTA",
                "不设固定规模上限，实际载入能力取决于设备内存和浏览器"
              ]
            ]
          },
          {
            "type": "paragraph",
            "text": "重比对需同时满足三项规模限制，比对字符数为序列数 × 列数。序列应等长、名称唯一，只能使用 ACGT- 或 ACGU-，不能混用 T 和 U。"
          },
          {
            "type": "paragraph",
            "text": "普通上传支持 gz、xz、bz2 压缩文件及 zip、tar 压缩包。重比对上传仅支持 FASTA 和 gzip。"
          }
        ]
      }
    ]
  },
  {
    "id": "submit-preprocess",
    "title": "提交与预处理",
    "summary": "",
    "keywords": [
      "算法",
      "minipoa",
      "MAFFT",
      "auto",
      "thread",
      "maxiterate",
      "reorder",
      "audit",
      "filter",
      "邮件"
    ],
    "articles": [
      {
        "id": "job-settings",
        "title": "任务与高级设置",
        "summary": "",
        "keywords": [
          "任务名",
          "邮箱",
          "自动模式",
          "高级设置"
        ],
        "blocks": [
          {
            "type": "list",
            "items": [
              "点击空白任务名称框可生成名称，也可自行填写，最多 64 个字符。",
              "邮箱可选，用于接收完成通知和结果链接。",
              "默认自动选择比对方法；也可手动选择 minipoa、MAFFT、HAlign 或 FMAlign2。结果页显示实际使用的方法。"
            ]
          },
          {
            "type": "table",
            "headers": [
              "高级设置",
              "用途"
            ],
            "rows": [
              [
                "线程数",
                "留空自动分配，可选范围显示在输入框旁。"
              ],
              [
                "检查模式",
                "检查并保留输入序列，默认启用。"
              ],
              [
                "过滤模式",
                "移除不符合筛选条件的序列后进行比对。"
              ],
              [
                "MAFFT 参数",
                "可选择策略、迭代次数和输出顺序。增加迭代通常需要更长时间。"
              ]
            ]
          },
          {
            "type": "paragraph",
            "text": "“恢复默认”会重置高级设置。开启“比对完成后进行重比对”会增加运行时间，比对质量可能提高。"
          }
        ]
      },
      {
        "id": "preprocess-modes",
        "title": "检查模式与过滤模式",
        "summary": "",
        "keywords": [
          "审计",
          "过滤",
          "质量控制",
          "重复序列"
        ],
        "blocks": [
          {
            "type": "paragraph",
            "text": "检查模式保留输入序列并报告问题；过滤模式会移除不符合筛选条件的序列。结果中可查看保留和移除的数量。"
          }
        ]
      }
    ]
  },
  {
    "id": "status-access",
    "title": "任务进度与恢复",
    "summary": "",
    "keywords": [
      "状态",
      "token",
      "凭证",
      "恢复",
      "访问 JSON",
      "过期"
    ],
    "articles": [
      {
        "id": "job-stages",
        "title": "任务进度",
        "summary": "",
        "keywords": [
          "queued",
          "preprocessing",
          "aligning",
          "packaging",
          "completed",
          "failed"
        ],
        "blocks": [
          {
            "type": "paragraph",
            "text": "任务依次经过排队、输入检查、比对和结果准备。开启优化时，会在初始比对后进行重比对。进度自动更新，可关闭页面后通过结果链接返回。"
          }
        ]
      },
      {
        "id": "access-credentials",
        "title": "保存与恢复任务",
        "summary": "",
        "keywords": [
          "安全",
          "本地历史",
          "恢复链接",
          "下载凭证"
        ],
        "blocks": [
          {
            "type": "list",
            "items": [
              "保存结果链接，稍后可直接打开进度和结果。",
              "查询任务页优先显示当前浏览器保存的最近任务。",
              "更换浏览器后，可导入恢复文件，或填写任务 ID 和访问密钥。",
              "结果链接和访问密钥可用于访问任务，请勿公开分享。"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "results-downloads",
    "title": "结果与下载",
    "summary": "",
    "keywords": [
      "结果",
      "概览",
      "下载",
      "产物",
      "预览限制"
    ],
    "articles": [
      {
        "id": "result-dashboard",
        "title": "结果概览",
        "summary": "",
        "keywords": [
          "留存率",
          "GC",
          "质量轨道",
          "变异列"
        ],
        "blocks": [
          {
            "type": "paragraph",
            "text": "查看序列数量、比对长度、缺口比例及其他统计。点击“比对结果”进入全屏查看器；“下载结果”提供比对文件、预处理文件和运行记录。"
          }
        ]
      },
      {
        "id": "preview-limits",
        "title": "大规模比对浏览",
        "summary": "",
        "keywords": [
          "large",
          "大规模"
        ],
        "blocks": [
          {
            "type": "paragraph",
            "text": "实际载入能力取决于设备内存与浏览器；大数据可下载后在本地查看。"
          }
        ]
      },
      {
        "id": "downloads",
        "title": "可下载文件",
        "summary": "",
        "keywords": [
          "zip",
          "fasta.gz",
          "xz",
          "summary JSON",
          "日志"
        ],
        "blocks": [
          {
            "type": "list",
            "items": [
              "all_results.zip：包含服务端生成的完整结果目录。",
              "比对.fasta.gz：gzip 压缩的 比对 FASTA。",
              "比对.fasta.gz.xz：进一步使用 xz 压缩的 比对 FASTA。",
              "查看器还可以按当前筛选、选区或选中行导出 FASTA，并导出 SVG 或 PNG 图像。"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "msa-viewer",
    "title": "MSA 查看器",
    "summary": "",
    "keywords": [
      "查看器",
      "reference",
      "motif",
      "IUPAC",
      "差异",
      "导出",
      "Canvas"
    ],
    "articles": [
      {
        "id": "navigate-search",
        "title": "浏览与搜索",
        "summary": "",
        "keywords": [
          "缩略图",
          "缩放",
          "序列 ID",
          "命中",
          "键盘"
        ],
        "blocks": [
          {
            "type": "list",
            "items": [
              "拖动概览图或滚动条，移动到目标行列。",
              "按名称查找 ID 或描述，点击结果定位；勾选“只显示匹配序列”才会筛选矩阵。位置搜索输入单个有效整数。",
              "片段搜索显示命中数及上一处、下一处。“更多搜索选项”可设置精确／简并匹配和反向互补链。",
              "点击碱基或按住 Shift 点击选择区间，再从底部查看统计、导出区域或添加标记。"
            ]
          }
        ]
      },
      {
        "id": "reference-analysis",
        "title": "对照序列与差异",
        "summary": "",
        "keywords": [
          "参考序列",
          "mismatch",
          "transition",
          "transversion",
          "坐标"
        ],
        "blocks": [
          {
            "type": "paragraph",
            "text": "打开“比较”，搜索并选择一条对照序列，然后点击“开始比较”。也可从序列菜单直接设为对照。结束比较会恢复比对位置，保留其他显示设置。"
          }
        ]
      },
      {
        "id": "tracks-rows-export",
        "title": "显示、序列操作与导出",
        "summary": "",
        "keywords": [
          "conservation",
          "coverage",
          "entropy",
          "固定",
          "隐藏",
          "SVG",
          "PNG",
          "FASTA"
        ],
        "blocks": [
          {
            "type": "list",
            "items": [
              "在“显示”中调整颜色、顶部统计图和序列排序。列筛选先预览保留数量，点击“应用”后生效。",
              "“检查 → 序列检查”支持搜索、排序、分页和完整表格。修改列表不会隐藏矩阵中的序列；需要时点击“只显示匹配序列”，并可撤销。",
              "“导出 → 下载序列”分别选择序列和列的范围，确认数量与结果版本后下载。连续区间包含其中隐藏的列；不连续列下载 ZIP，附原始列位置表。图片另从“导出图片”设置。",
              "“保存查看记录”保存位置、筛选、对照和标记，不包含原始序列。统计默认使用全部序列；隐藏和筛选不会自动改变统计范围。"
            ]
          }
        ]
      },
      {
        "id": "workspace-modes",
        "title": "输入与统计",
        "summary": "",
        "keywords": [
          "工作区",
          "rowKey",
          "重复 名称行",
          "neutral",
          "蛋白",
          "不等长"
        ],
        "blocks": [
          {
            "type": "paragraph",
            "text": "等长核酸序列可进行统计分析。蛋白质、无法识别类型或长度不一致的输入仅供浏览。同名序列作为独立记录保留。"
          }
        ]
      }
    ]
  },
  {
    "id": "metrics",
    "title": "指标解读",
    "summary": "",
    "keywords": [
      "科学指标",
      "保守性",
      "覆盖率",
      "熵",
      "共识",
      "GC"
    ],
    "articles": [
      {
        "id": "column-metrics",
        "title": "列与区间统计",
        "summary": "",
        "keywords": [
          "conservation",
          "coverage",
          "gap fraction",
          "Shannon entropy"
        ],
        "blocks": [
          {
            "type": "table",
            "headers": [
              "指标",
              "计算方式",
              "读图提示"
            ],
            "rows": [
              [
                "保守性",
                "数量最多的明确碱基 / 明确碱基总数",
                "越接近 100%，该列碱基越一致。"
              ],
              [
                "缺口比例",
                "含缺口的序列数 / 总序列数",
                "可结合邻近区域检查插入、缺失和覆盖情况。"
              ],
              [
                "香农熵（bits）",
                "−Σ p log₂(p)，仅使用明确碱基",
                "碱基种类越均匀，熵越高。四类等频时为 2 bits。"
              ],
              [
                "碱基多样性（0–1）",
                "香农熵 / 2",
                "顶部多样性统计图使用此刻度；四类明确碱基等频时为 1。"
              ],
              [
                "非缺口比例",
                "不含缺口的序列数 / 当前统计范围内序列数",
                "与缺口比例互补；简并字符计作非缺口。"
              ],
              [
                "共识序列",
                "逐列取数量最多的明确碱基",
                "并列时，多数规则按固定顺序选取并标记；IUPAC 模式使用对应简并码。没有明确碱基时输出 N。"
              ],
              [
                "GC 比例",
                "(G + C) / (A + C + G + T/U)",
                "缺口和简并碱基不计入分母。"
              ]
            ]
          },
          {
            "type": "paragraph",
            "text": "明确碱基指 A、C、G、T/U。没有明确碱基的列不计算保守性和熵；统计范围以查看器当前选择为准。"
          }
        ]
      },
      {
        "id": "interpretation-caveats",
        "title": "查看建议",
        "summary": "",
        "keywords": [
          "注意",
          "抽样",
          "蛋白",
          "结论",
          "参考"
        ],
        "blocks": [
          {
            "type": "paragraph",
            "text": "结合保守性、缺口比例和碱基组成，检查感兴趣的区域。共识序列汇总各列主要碱基；如需比较差异，请选择一条对照序列。"
          }
        ]
      }
    ]
  },
  {
    "id": "faq",
    "title": "常见问题",
    "summary": "",
    "keywords": [
      "FAQ",
      "问题",
      "错误",
      "帮助"
    ],
    "articles": [
      {
        "id": "invalid-fasta",
        "title": "为什么无法提交 FASTA？",
        "summary": "",
        "keywords": [
          "无效",
          "header",
          "空输入"
        ],
        "collapsible": true,
        "blocks": [
          {
            "type": "paragraph",
            "text": "普通比对至少需要两条序列，每条名称行以 > 开头，后面有非空序列。普通粘贴上限为 20 万字符。重比对还要求序列等长，并满足其输入要求。"
          }
        ]
      },
      {
        "id": "service-unavailable",
        "title": "为什么提交按钮不可用？",
        "summary": "",
        "keywords": [
          "离线",
          "队列满",
          "按钮禁用"
        ],
        "collapsible": true,
        "blocks": [
          {
            "type": "paragraph",
            "text": "请检查输入和页面顶部的服务状态。服务暂不可用或队列已满时，可稍后重试。若所选方法不可用，可改选其他方法。"
          }
        ]
      },
      {
        "id": "lost-token",
        "title": "如何找回任务？",
        "summary": "",
        "keywords": [
          "找回",
          "凭证丢失",
          "历史"
        ],
        "collapsible": true,
        "blocks": [
          {
            "type": "paragraph",
            "text": "先检查最近任务、通知邮件、保存的结果链接和恢复文件。手动恢复需要任务 ID 和访问密钥，只有任务 ID 无法打开结果。"
          }
        ]
      },
      {
        "id": "large-preview",
        "title": "为什么结果可以下载但不能显示矩阵？",
        "summary": "",
        "keywords": [
          "过大",
          "truncated",
          "空矩阵"
        ],
        "collapsible": true,
        "blocks": [
          {
            "type": "paragraph",
            "text": "若在线载入失败，可下载完整 FASTA，在独立查看器中打开。"
          }
        ]
      },
      {
        "id": "standalone-unaligned",
        "title": "独立查看器会自动执行比对吗？",
        "summary": "",
        "keywords": [
          "本地查看",
          "长度不一致",
          "原始序列"
        ],
        "collapsible": true,
        "blocks": [
          {
            "type": "paragraph",
            "text": "等长输入可以作为 MSA 浏览；长度不一致时会按原始序列显示。需要生成新的 比对 时，请使用提交任务页面。"
          }
        ]
      },
      {
        "id": "export-limit",
        "title": "为什么 PNG 导出失败？",
        "summary": "",
        "keywords": [
          "图片",
          "尺寸",
          "SVG"
        ],
        "collapsible": true,
        "blocks": [
          {
            "type": "paragraph",
            "text": "缩小导出范围、降低缩放或改用 SVG/FASTA。SVG 更适合需要后续排版的矢量输出，大型完整结果则建议直接下载 FASTA。"
          }
        ]
      }
    ]
  }
];

const en: DocsSection[] = [
  {
    "id": "quick-start",
    "title": "Quick start",
    "summary": "",
    "keywords": [
      "start",
      "workflow",
      "submit",
      "results"
    ],
    "articles": [
      {
        "id": "workflow",
        "title": "Start an alignment in three steps",
        "summary": "",
        "keywords": [
          "workflow",
          "beginner",
          "task"
        ],
        "blocks": [
          {
            "type": "steps",
            "items": [
              {
                "title": "Prepare sequences",
                "body": "Paste or upload at least two DNA / RNA sequences."
              },
              {
                "title": "Submit alignment",
                "body": "Let Auto select a method or choose one yourself. Enable refinement if needed."
              },
              {
                "title": "Explore results",
                "body": "Open the alignment to browse, search and download."
              }
            ]
          },
          {
            "type": "paragraph",
            "text": "For an existing alignment, paste or upload it on the Realign page. Use Viewer to browse a file without running an alignment."
          },
          {
            "type": "links",
            "items": [
              {
                "label": "Alignment example",
                "to": "/examples/alignment-small"
              },
              {
                "label": "Realignment example",
                "to": "/examples/realignment-small"
              },
              {
                "label": "Open viewer",
                "to": "/viewer"
              }
            ]
          },
          {
            "type": "paragraph",
            "text": "Result files are retained for 7 days. Save your results link and download files in time."
          }
        ]
      }
    ]
  },
  {
    "id": "fasta-input",
    "title": "FASTA and input",
    "summary": "",
    "keywords": [
      "FASTA",
      "format",
      "upload",
      "archive",
      "limits"
    ],
    "articles": [
      {
        "id": "valid-fasta",
        "title": "Valid FASTA format",
        "summary": "",
        "keywords": [
          "header",
          "sequence",
          "example",
          ">"
        ],
        "blocks": [
          {
            "type": "code",
            "label": "FASTA example",
            "language": "fasta",
            "code": ">reference_sequence\nATGCTAGCTAGC\n>sample_02\nATGCTAGATAGC\n>sample_03\nATG-TAGCTAGC"
          },
          {
            "type": "list",
            "items": [
              "Online alignment requires at least two sequences.",
              "The first line of each record must begin with >; the remaining text is used as the sequence name.",
              "Sequences may span multiple lines, which are joined during submission.",
              "Use unique, concise sequence names to simplify search, reference selection, and export."
            ]
          }
        ]
      },
      {
        "id": "input-limits",
        "title": "Input options and limits",
        "summary": "",
        "keywords": [
          "200000",
          "200,000",
          "100 MB",
          "zip",
          "tar",
          "gz",
          "xz",
          "bz2"
        ],
        "blocks": [
          {
            "type": "table",
            "headers": [
              "Entry",
              "Input",
              "Limit"
            ],
            "rows": [
              [
                "Alignment",
                "Paste FASTA",
                "200,000 characters"
              ],
              [
                "Alignment",
                "Upload FASTA or compressed files",
                "100 MiB"
              ],
              [
                "Realignment",
                "Paste or upload aligned FASTA; gzip uploads supported",
                "100 MiB; up to 2,000 sequences, 30,000 columns and 1 million alignment characters"
              ],
              [
                "MSA viewer",
                "Paste or open FASTA",
                "No fixed size cap; loading capacity depends on device memory and browser"
              ]
            ]
          },
          {
            "type": "paragraph",
            "text": "Realignment must meet all three limits. Alignment characters = sequence count × column count. Use equal-length sequences, unique names and only ACGT- or ACGU-. Do not mix T and U."
          },
          {
            "type": "paragraph",
            "text": "Standard uploads support gz, xz, bz2, zip and tar archives. Realignment uploads support FASTA and gzip only."
          }
        ]
      }
    ]
  },
  {
    "id": "submit-preprocess",
    "title": "Submission and preprocessing",
    "summary": "",
    "keywords": [
      "algorithm",
      "minipoa",
      "MAFFT",
      "auto",
      "thread",
      "maxiterate",
      "reorder",
      "audit",
      "filter",
      "email"
    ],
    "articles": [
      {
        "id": "job-settings",
        "title": "Job and advanced settings",
        "summary": "",
        "keywords": [
          "task name",
          "email",
          "auto mode",
          "advanced settings"
        ],
        "blocks": [
          {
            "type": "list",
            "items": [
              "Click an empty job name field to generate a name, or enter your own, up to 64 characters.",
              "Email is optional and receives completion notices and a results link.",
              "Auto selects the alignment method. You can also choose minipoa, MAFFT, HAlign or FMAlign2. Results show the method actually used."
            ]
          },
          {
            "type": "table",
            "headers": [
              "Advanced setting",
              "Purpose"
            ],
            "rows": [
              [
                "Threads",
                "Leave blank for automatic allocation. The allowed range is shown beside the field."
              ],
              [
                "Check mode",
                "Checks and retains input sequences; enabled by default."
              ],
              [
                "Filter mode",
                "Removes sequences that fail the filters before alignment."
              ],
              [
                "MAFFT settings",
                "Choose a strategy, iteration count and output order. More iterations generally take longer."
              ]
            ]
          },
          {
            "type": "paragraph",
            "text": "Restore defaults resets advanced settings. Refinement increases running time and may improve alignment quality."
          }
        ]
      },
      {
        "id": "preprocess-modes",
        "title": "Check and filter modes",
        "summary": "",
        "keywords": [
          "quality control",
          "duplicate",
          "remove"
        ],
        "blocks": [
          {
            "type": "paragraph",
            "text": "Check mode retains sequences and reports issues. Filter mode removes sequences that fail the filters. Results show retained and removed counts."
          }
        ]
      }
    ]
  },
  {
    "id": "status-access",
    "title": "Progress and recovery",
    "summary": "",
    "keywords": [
      "status",
      "token",
      "credentials",
      "restore",
      "access JSON",
      "expiry"
    ],
    "articles": [
      {
        "id": "job-stages",
        "title": "Job progress",
        "summary": "",
        "keywords": [
          "queued",
          "preprocessing",
          "aligning",
          "packaging",
          "completed",
          "failed"
        ],
        "blocks": [
          {
            "type": "paragraph",
            "text": "Jobs proceed through queuing, input checks, alignment and result preparation. When enabled, refinement follows the initial alignment. Progress updates automatically; use your results link to return later."
          }
        ]
      },
      {
        "id": "access-credentials",
        "title": "Save and recover jobs",
        "summary": "",
        "keywords": [
          "security",
          "local history",
          "restore link",
          "download credentials"
        ],
        "blocks": [
          {
            "type": "list",
            "items": [
              "Save the results link to return to progress and results.",
              "Lookup shows recent jobs saved in this browser.",
              "In another browser, import the recovery file or enter the job ID and access key.",
              "Keep results links and access keys private; they grant access to the job."
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "results-downloads",
    "title": "Results and downloads",
    "summary": "",
    "keywords": [
      "results",
      "overview",
      "download",
      "artifacts",
      "preview limits"
    ],
    "articles": [
      {
        "id": "result-dashboard",
        "title": "Result overview",
        "summary": "",
        "keywords": [
          "retention",
          "GC",
          "quality tracks",
          "variable columns"
        ],
        "blocks": [
          {
            "type": "paragraph",
            "text": "View sequence count, alignment length, gap fraction and other statistics. Alignment opens the fullscreen viewer; Downloads contains alignment files, preprocessing files and run records."
          }
        ]
      },
      {
        "id": "preview-limits",
        "title": "Large alignment browsing",
        "summary": "",
        "keywords": [
          "large",
          "大规模"
        ],
        "blocks": [
          {
            "type": "paragraph",
            "text": "Loading capacity depends on device memory and browser resources. Large results can also be downloaded and opened locally."
          }
        ]
      },
      {
        "id": "downloads",
        "title": "Downloadable files",
        "summary": "",
        "keywords": [
          "zip",
          "fasta.gz",
          "xz",
          "summary JSON",
          "logs"
        ],
        "blocks": [
          {
            "type": "list",
            "items": [
              "all_results.zip contains the complete result directory generated by the server.",
              "alignment.fasta.gz is the gzip-compressed alignment FASTA.",
              "alignment.fasta.gz.xz applies additional xz compression to the alignment FASTA.",
              "The viewer can also export filtered data, selected regions or rows as FASTA, plus SVG and PNG images."
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "msa-viewer",
    "title": "MSA Viewer",
    "summary": "",
    "keywords": [
      "viewer",
      "reference",
      "motif",
      "IUPAC",
      "difference",
      "export",
      "Canvas"
    ],
    "articles": [
      {
        "id": "navigate-search",
        "title": "Navigation and search",
        "summary": "",
        "keywords": [
          "minimap",
          "zoom",
          "sequence ID",
          "matches",
          "keyboard"
        ],
        "blocks": [
          {
            "type": "list",
            "items": [
              "Drag the overview or scrollbars to navigate rows and columns.",
              "Find an ID or description, then click a result to locate it. Only “Show only matching sequences” filters the matrix. Position search accepts one valid integer.",
              "Motif search shows the match count with previous/next navigation. More search options provides exact or IUPAC matching and the reverse-complement strand.",
              "Click a base or Shift-click a region, then use the bottom bar to view statistics, export the region or add a note."
            ]
          }
        ]
      },
      {
        "id": "reference-analysis",
        "title": "Reference and differences",
        "summary": "",
        "keywords": [
          "reference sequence",
          "mismatch",
          "transition",
          "transversion",
          "coordinates"
        ],
        "blocks": [
          {
            "type": "paragraph",
            "text": "Open Compare, find and select a reference, then Start comparison. The sequence menu offers the same action. End comparison restores alignment positions and keeps other display settings."
          }
        ]
      },
      {
        "id": "tracks-rows-export",
        "title": "Display, sequence actions and export",
        "summary": "",
        "keywords": [
          "conservation",
          "coverage",
          "entropy",
          "pin",
          "hide",
          "SVG",
          "PNG",
          "FASTA"
        ],
        "blocks": [
          {
            "type": "list",
            "items": [
              "Display controls colors, top statistics and sequence order. Preview the retained column count before applying a column filter.",
              "Check → Sequence checks provides search, sorting, pages and a full table. Changing the list does not hide matrix rows. Show only matching sequences applies the list explicitly and can be undone.",
              "Export → Download sequences lets you choose rows and columns and confirm their counts and result stage. A continuous region includes hidden columns. Non-contiguous columns download as ZIP with the original column mapping. Use Export image for PNG or SVG.",
              "Save view records positions, filters, the reference and notes, without the original sequences. Statistics default to all sequences; display filters do not change their scope automatically."
            ]
          }
        ]
      },
      {
        "id": "workspace-modes",
        "title": "Input and statistics",
        "summary": "",
        "keywords": [
          "workspace",
          "rowKey",
          "duplicate header",
          "neutral",
          "protein",
          "unequal"
        ],
        "blocks": [
          {
            "type": "paragraph",
            "text": "Equal-length nucleotide sequences support statistical analysis. Protein, unidentified or unequal-length input is available for browsing only. Sequences with duplicate names remain separate records."
          }
        ]
      }
    ]
  },
  {
    "id": "metrics",
    "title": "Interpreting metrics",
    "summary": "",
    "keywords": [
      "scientific metrics",
      "conservation",
      "coverage",
      "entropy",
      "consensus",
      "GC"
    ],
    "articles": [
      {
        "id": "column-metrics",
        "title": "Column and range statistics",
        "summary": "",
        "keywords": [
          "conservation",
          "coverage",
          "gap fraction",
          "Shannon entropy"
        ],
        "blocks": [
          {
            "type": "table",
            "headers": [
              "Metric",
              "Calculation",
              "Interpretation"
            ],
            "rows": [
              [
                "Conservation",
                "Most frequent unambiguous base count / total unambiguous base count",
                "Values near 100% indicate greater agreement in the column."
              ],
              [
                "Gap fraction",
                "Sequences with a gap / total sequences",
                "Inspect alongside neighboring regions for insertions, deletions and coverage."
              ],
              [
                "Entropy (bits)",
                "−Σ p log₂(p) over unambiguous bases",
                "Higher for more evenly distributed bases. Four equally frequent bases give 2 bits."
              ],
              [
                "Base diversity (0–1)",
                "Entropy / 2",
                "The diversity track uses this scale; four equally frequent unambiguous bases give 1."
              ],
              [
                "Non-gap fraction",
                "Non-gap sequences / sequences in the statistics scope",
                "Complements the gap fraction. Ambiguous characters count as non-gap."
              ],
              [
                "Consensus sequence",
                "The most frequent unambiguous base in each column",
                "Ties use a fixed order and are marked in majority mode, or an ambiguity code in IUPAC mode. No unambiguous base gives N."
              ],
              [
                "GC content",
                "(G + C) / (A + C + G + T/U)",
                "Gaps and ambiguous bases are excluded from the denominator."
              ]
            ]
          },
          {
            "type": "paragraph",
            "text": "Unambiguous bases are A, C, G and T/U. Conservation and entropy are unavailable for columns without them. Statistics use the current analysis scope."
          }
        ]
      },
      {
        "id": "interpretation-caveats",
        "title": "Exploration tips",
        "summary": "",
        "keywords": [
          "caution",
          "sampling",
          "protein",
          "conclusion",
          "reference"
        ],
        "blocks": [
          {
            "type": "paragraph",
            "text": "Use conservation, gap fraction and base composition to inspect regions of interest. Consensus summarizes the predominant bases; select a reference sequence to compare differences."
          }
        ]
      }
    ]
  },
  {
    "id": "faq",
    "title": "Frequently asked questions",
    "summary": "",
    "keywords": [
      "FAQ",
      "questions",
      "errors",
      "help"
    ],
    "articles": [
      {
        "id": "invalid-fasta",
        "title": "Why can’t I submit FASTA?",
        "summary": "",
        "keywords": [
          "invalid",
          "header",
          "empty"
        ],
        "collapsible": true,
        "blocks": [
          {
            "type": "paragraph",
            "text": "Alignment requires at least two records, each with a name starting with > and a non-empty sequence. Standard pasted input is limited to 200,000 characters. Realignment also requires equal-length sequences and its additional input rules."
          }
        ]
      },
      {
        "id": "service-unavailable",
        "title": "Why is Submit unavailable?",
        "summary": "",
        "keywords": [
          "offline",
          "queue full",
          "disabled"
        ],
        "collapsible": true,
        "blocks": [
          {
            "type": "paragraph",
            "text": "Check your input and the service status at the top of the page. Retry later if the service is unavailable or the queue is full, or choose another available method."
          }
        ]
      },
      {
        "id": "lost-token",
        "title": "How do I find a job?",
        "summary": "",
        "keywords": [
          "recover",
          "lost credentials",
          "history"
        ],
        "collapsible": true,
        "blocks": [
          {
            "type": "paragraph",
            "text": "Check recent jobs, notification emails, saved results links and recovery files. Manual recovery requires both the job ID and access key."
          }
        ]
      },
      {
        "id": "large-preview",
        "title": "Why can I download results but not display the matrix?",
        "summary": "",
        "keywords": [
          "large",
          "truncated",
          "empty matrix"
        ],
        "collapsible": true,
        "blocks": [
          {
            "type": "paragraph",
            "text": "If loading fails, download the complete FASTA and open it in the standalone viewer."
          }
        ]
      },
      {
        "id": "standalone-unaligned",
        "title": "Does the standalone viewer align sequences automatically?",
        "summary": "",
        "keywords": [
          "local viewer",
          "unequal length",
          "raw sequences"
        ],
        "collapsible": true,
        "blocks": [
          {
            "type": "paragraph",
            "text": "Equal-length input can be viewed as an MSA; unequal-length input is shown as raw sequences. Use Submit when a new alignment must be generated."
          }
        ]
      },
      {
        "id": "export-limit",
        "title": "Why did PNG export fail?",
        "summary": "",
        "keywords": [
          "image",
          "dimensions",
          "SVG"
        ],
        "collapsible": true,
        "blocks": [
          {
            "type": "paragraph",
            "text": "Reduce the exported region, lower zoom, or use SVG/FASTA. SVG is preferable for vector layout work, while full large results are best downloaded as FASTA."
          }
        ]
      }
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
