export type Locale = "zh" | "en";

const zh = {
  nav: {
    home: "首页",
    submit: "提交任务",
    examples: "示例数据",
    docs: "使用文档",
    about: "关于"
  },
  common: {
    appName: "easymsa",
    startAnalysis: "开始分析",
    tryDemo: "查看示例",
    viewResults: "查看结果",
    download: "下载",
    loading: "正在加载",
    error: "加载失败",
    empty: "暂无内容",
    remove: "移除",
    submit: "提交任务",
    optional: "可选",
    createdAt: "创建时间",
    updatedAt: "更新时间"
  },
  footer: {
    tagline: "友好的多序列比对 Web Server 前端原型。",
    note: "当前版本使用前端 mock 数据，后续可对接真实计算服务。"
  },
  home: {
    title: "easymsa：友好的多序列比对可视化工具",
    subtitle:
      "上传或粘贴 FASTA 序列，提交任务，查看比对结果并下载结果文件。",
    intro:
      "easymsa 面向小规模多序列比对结果浏览，提供清晰的提交流程、模拟任务状态和可读的 MSA 可视化界面。",
    demoNotice: "当前为前端 demo，所有任务与结果均由浏览器端 mock 数据模拟。",
    workflowTitle: "三步完成分析",
    workflow: [
      {
        title: "提交",
        text: "粘贴 FASTA、上传文件，或使用内置示例数据。"
      },
      {
        title: "运行",
        text: "查看任务检查、分析和结果准备的模拟进度。"
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
        title: "使用示例",
        text: "无需准备数据，直接体验结果页面和 MSA viewer。"
      }
    ],
    visualTitle: "小规模 MSA 可视化",
    visualCaption: "固定序列名、横向滚动、consensus 行和柔和碱基着色。"
  },
  submit: {
    title: "提交任务",
    subtitle: "选择输入方式，提供任务名称，即可创建一个模拟 MSA 任务。",
    jobName: "任务名称",
    jobNamePlaceholder: "例如：Kinase family alignment",
    email: "通知邮箱",
    emailPlaceholder: "name@example.com",
    inputMethod: "输入方式",
    methods: {
      paste: "粘贴 FASTA",
      upload: "上传文件",
      demo: "使用示例"
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
    demoTitle: "使用内置示例数据",
    demoDescription:
      "示例任务会使用一组小规模 DNA alignment，方便快速查看结果页面。",
    submitting: "正在提交",
    errors: {
      jobName: "请输入任务名称。",
      email: "请输入合法邮箱地址，或留空。",
      paste: "当前粘贴内容不是可提交的 FASTA。",
      upload: "请选择一个受支持的输入文件。",
      submitFailed: "提交失败，请稍后再试。"
    }
  },
  job: {
    title: "任务状态",
    subtitle: "浏览器端 mock API 会模拟任务检查、运行和结果准备。",
    jobId: "任务 ID",
    jobName: "任务名称",
    currentStep: "当前步骤",
    progress: "进度",
    timeline: "任务时间线",
    logs: "运行日志",
    statusLabels: {
      submitted: "已提交",
      checking: "正在检查输入",
      running: "正在运行分析",
      preparing: "正在准备结果",
      completed: "已完成",
      failed: "失败"
    }
  },
  results: {
    title: "结果",
    subtitle: "查看任务概览、比对矩阵和 demo 输出文件。",
    tabs: {
      overview: "结果概览",
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
      sequenceCount: "显示 {shown} / {total} 条序列",
      alignmentLength: "比对长度 {length}",
      consensus: "consensus",
      legend: "颜色图例",
      noMatches: "没有匹配的序列。"
    },
    downloads: {
      title: "可下载文件",
      description: "这些文件来自 public/demo，可在 GitHub Pages 静态环境中直接下载。"
    }
  },
  examples: {
    title: "示例数据",
    subtitle: "使用内置 demo 体验提交、状态和结果浏览流程。",
    description:
      "Demo 数据包含一组小规模 DNA 序列和对应 alignment 结果，适合验证 MSA viewer 的滚动、搜索和着色能力。",
    inputDownload: "下载 demo 输入 FASTA",
    resultDownload: "下载 demo alignment"
  },
  docs: {
    title: "使用文档",
    subtitle: "当前版本聚焦前端提交与小规模结果展示。",
    sections: [
      {
        title: "About easymsa",
        body: "easymsa 是一个多序列比对 Web Server 前端原型，当前不执行真实算法计算。"
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
        body: "任务状态页面会模拟输入检查、分析运行和结果准备过程。"
      },
      {
        title: "Interpret alignment results",
        body: "结果页面展示序列数量、比对长度、一致性、gap 比例和可滚动 alignment。"
      },
      {
        title: "Download results",
        body: "Downloads 标签提供 alignment FASTA、summary JSON 和结果压缩包下载。"
      },
      {
        title: "Future backend integration",
        body: "未来可通过 VITE_API_MODE=remote 和 VITE_API_BASE_URL 接入远程 API。"
      }
    ]
  },
  about: {
    title: "关于 easymsa",
    subtitle: "一个面向 GitHub Pages 的静态 MSA Web Server 前端原型。",
    project:
      "本项目当前用于验证任务提交、状态展示和小规模多序列比对可视化体验。",
    version: "当前版本：前端 demo / mock API。",
    citation: "Citation：待补充。",
    contact: "Contact：待补充。",
    repository: "GitHub repository：https://github.com/malabz/easymsa"
  }
};

const en: typeof zh = {
  nav: {
    home: "Home",
    submit: "Submit",
    examples: "Examples",
    docs: "Docs",
    about: "About"
  },
  common: {
    appName: "easymsa",
    startAnalysis: "Start Analysis",
    tryDemo: "Try Demo",
    viewResults: "View Results",
    download: "Download",
    loading: "Loading",
    error: "Error",
    empty: "Nothing here yet",
    remove: "Remove",
    submit: "Submit Job",
    optional: "Optional",
    createdAt: "Created",
    updatedAt: "Updated"
  },
  footer: {
    tagline: "A friendly frontend prototype for an MSA web server.",
    note: "This version uses browser-side mock data and can later connect to a real compute service."
  },
  home: {
    title: "easymsa: A Friendly MSA Visualization Tool",
    subtitle:
      "Upload or paste FASTA sequences, submit a job, view alignment results, and download output files.",
    intro:
      "easymsa focuses on small-scale multiple sequence alignment browsing, with a clear submission flow, simulated job status, and readable MSA visualization.",
    demoNotice: "This is a frontend demo. Jobs and results are simulated in the browser.",
    workflowTitle: "Analyze in three steps",
    workflow: [
      {
        title: "Submit",
        text: "Paste FASTA, upload a file, or use the built-in demo dataset."
      },
      {
        title: "Run",
        text: "Follow simulated input checking, analysis, and result preparation."
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
        title: "Use demo",
        text: "Try the results page and MSA viewer without preparing data."
      }
    ],
    visualTitle: "Small-scale MSA visualization",
    visualCaption: "Fixed sequence IDs, horizontal scrolling, consensus row, and soft base colors."
  },
  submit: {
    title: "Submit Job",
    subtitle: "Choose an input method, name the job, and create a simulated MSA task.",
    jobName: "Job name",
    jobNamePlaceholder: "For example: Kinase family alignment",
    email: "Notification email",
    emailPlaceholder: "name@example.com",
    inputMethod: "Input method",
    methods: {
      paste: "Paste FASTA",
      upload: "Upload File",
      demo: "Use Demo"
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
    demoTitle: "Use built-in demo data",
    demoDescription:
      "The demo job uses a small DNA alignment so you can quickly inspect the results page.",
    submitting: "Submitting",
    errors: {
      jobName: "Enter a job name.",
      email: "Enter a valid email address, or leave it blank.",
      paste: "The pasted content is not a valid FASTA input.",
      upload: "Choose a supported input file.",
      submitFailed: "Submission failed. Please try again later."
    }
  },
  job: {
    title: "Job Status",
    subtitle: "The browser-side mock API simulates checking, running, and preparing results.",
    jobId: "Job ID",
    jobName: "Job name",
    currentStep: "Current step",
    progress: "Progress",
    timeline: "Timeline",
    logs: "Run log",
    statusLabels: {
      submitted: "Submitted",
      checking: "Checking input",
      running: "Running analysis",
      preparing: "Preparing results",
      completed: "Completed",
      failed: "Failed"
    }
  },
  results: {
    title: "Results",
    subtitle: "Inspect the job overview, alignment matrix, and demo output files.",
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
      outputSizeMB: "Output size"
    },
    viewer: {
      search: "Search sequence ID",
      searchPlaceholder: "Type a sequence name",
      sequenceCount: "Showing {shown} / {total} sequences",
      alignmentLength: "Alignment length {length}",
      consensus: "consensus",
      legend: "Color legend",
      noMatches: "No matching sequences."
    },
    downloads: {
      title: "Downloadable files",
      description: "These files are served from public/demo and work in a static GitHub Pages build."
    }
  },
  examples: {
    title: "Examples",
    subtitle: "Use the built-in demo to try submission, status, and result browsing.",
    description:
      "The demo dataset contains a small DNA sequence set and a matching alignment result for validating scrolling, search, and coloring in the MSA viewer.",
    inputDownload: "Download demo input FASTA",
    resultDownload: "Download demo alignment"
  },
  docs: {
    title: "Documentation",
    subtitle: "This version focuses on frontend submission and small-scale result display.",
    sections: [
      {
        title: "About easymsa",
        body: "easymsa is a frontend prototype for a multiple sequence alignment web server. It does not run real algorithms yet."
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
        body: "The status page simulates input checking, analysis, and result preparation."
      },
      {
        title: "Interpret alignment results",
        body: "The results page shows sequence count, alignment length, identity, gap percentage, and a scrollable alignment."
      },
      {
        title: "Download results",
        body: "The Downloads tab provides alignment FASTA, summary JSON, and a compressed result bundle."
      },
      {
        title: "Future backend integration",
        body: "A remote API can later be enabled with VITE_API_MODE=remote and VITE_API_BASE_URL."
      }
    ]
  },
  about: {
    title: "About easymsa",
    subtitle: "A static MSA web server frontend prototype for GitHub Pages.",
    project:
      "This project currently validates job submission, status display, and small-scale multiple sequence alignment visualization.",
    version: "Current version: frontend demo / mock API.",
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
