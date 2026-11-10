# Viewer 滚动、WebKit 与截图复核

2026-11-10。本轮在本地分支 `codex/viewer-performance-20261110` 完成，没有推送 GitHub 或部署网站。后端未修改。

## 实现

- `4d0814c`：行、列虚拟滚动共用一个滚动容器，关闭两个虚拟器各自的同步强制提交，使同一事件中的 React 更新合并。保留 overscan、单元格尺寸、Canvas 画法和所有统计算法。新增双向滚动、末端跳转、返回原点后的行名、选中坐标及列轨道同步检查。
- `301943e`：旧服务器没有 FASTA 路由时，在现有输入 Worker 内读取和校验 JSON，直接继续承担统计，不再销毁输入 Worker 后创建第二个计算 Worker。沿用原严格 schema、规范化、完整标题、重复标题、内容指纹和行标识。鉴权失败、任务不存在、结果过期和结果文件缺失均不触发回退。

滚动剖析显示，原路径会先同步提交一个虚拟器，再让另一个读取布局，产生重复布局工作。单次剖析只用于定位，不作为最终提速百分比；正式数字使用下面的重复测量。

## 性能方法与记录

机器、Chromium 构建、1440 × 900 视口、固定种子和四种数据形状沿用[首轮记录](../viewer-2026-11-10/README.md)。每个场景先预热一次，再测三次，统计 P95 的中位数。测试期间不运行其他浏览器验证。

- `round1-repeat.json`：将本轮开始时冻结的 `efd2318` 构建重新测量，覆盖 5,000 × 10,000 的文件、网站结果两个入口。
- `candidate.json`：最终代码 `301943e` 的四种形状、两个入口，共 24 次正式测量及 8 次预热。
- 其余三种形状的上轮数字引用首轮已保存的 `candidate.json`，明确与本次重测的两个场景区分。
- 网站结果使用本机 HTTP 服务和真实 fetch/Worker/Canvas，排除公网和线上负载；它不能直接代表生产网络下的端到端耗时。
- 读取、首次可操作、统计阶段和自动化输入时间仍分别记录；统计、界面和合成数据未为达标而缩减。

详见[八组测量](./measurements.md)和[机器可读对照](./comparison.json)。

5,000 × 10,000 的文件入口首轮滚动 P95 从 **28.3 降到 22.0 毫秒**，统计后从 **27.4 降到 21.4 毫秒**；网站结果入口分别从 **27.1 降到 21.7 毫秒**、**26.7 降到 21.3 毫秒**，这四项缩短约 20%–22%。首次可操作分别为 **1.89 秒、2.25 秒**，保留前一轮的加载改善。

**八组中七组同时达到首轮和统计后 P95 ≤25 毫秒。** 未达到的是 500 × 100,000 的网站结果：**25.4、26.1 毫秒**。这项不标为通过，也不以较好的单次测量替换三次中位数。

另对未达标场景做了 CPU 剖析，Canvas 图块复制是显著的采样热点。试验将三个 Canvas 上下文改为 `alpha: false` 后，三次中位数为 **25.1、25.5 毫秒**，仍未达标；没有保留该实验，源码和构建恢复为 `301943e`。其[原始测量](./long-result-opaque-rejected.json)与[剖析测量](./long-result-profile.json)保留，不与最终候选混算。

复现命令（Node 24.21+，项目已安装的 Playwright 浏览器）：

```powershell
$env:EASYMSA_BASE_PATH = '/'
$env:VITE_API_BASE_URL = '/api'
node node_modules/vite/bin/vite.js build --outDir dist-performance
node scripts/viewer-performance.mjs --dist ../round1-dist-performance --quick --runs 3 --output docs/performance/viewer-scroll-2026-11-10/round1-repeat.json
node scripts/viewer-performance.mjs --dist dist-performance --runs 3 --output docs/performance/viewer-scroll-2026-11-10/candidate.json
node scripts/summarize-viewer-scroll.mjs
```

内存预算、科学计算、导出逻辑本轮没有改动。文件替换与 Worker 生命周期检查保留，网站新、旧接口均新增“只创建一个 Worker，当前只保留一个 Worker”的断言。本轮没有重新宣称一次完整 RSS/GPU 内存优化结果。

## WebKit：应用问题与运行环境分别处理

### 旧接口回退

修复前，原输入测试重复 6 轮合计 **23/24**；其中一次 JSON 回退在原 12 秒断言内未完成。诊断记录中可见销毁输入 Worker、加载 Viewer、再创建计算 Worker之间的延迟，实际两条短序列的统计只需很短时间。

复用原输入 Worker 后，相同四项测试重复 6 轮 **24/24**，且新增 Worker 数量断言。严格 JSON 校验、完整标题、维度警告、非法控制字符、网络中断和各类服务端错误另有单元测试。不能把这部分改善描述为修改了科研统计算法。

### Windows 原生 WebKit 并发停顿

修复后执行全部三浏览器核心测试，一次为 **68/69**；剩余错误是示例打开时仍未显示 Viewer。随后同一示例并发重复 8 次为 **6/8**。已保留失败日志、截图、录像和 trace，没有把重跑成功覆盖为原运行成功。

增加计时探针后，页面定时器、动画帧及消息派发均可出现数秒停顿。进一步移除全部 EasyMSA 代码，只留下一个 HTML 页面和一个回显 Worker：两个原生 WebKit 进程并发的四次检查中有一次约 **10.00 秒**；相同最小页面串行四次约 **76–89 毫秒**。这证明至少一类停顿可以脱离应用复现，尚不能据此确定 Windows/WebKit 内部具体函数或所有 Safari 环境的行为。

- [最小页面并发原始记录](./webkit-minimal-parallel.json)
- [相同页面串行原始记录](./webkit-minimal-serial.json)
- [应用页面并发探针](./webkit-application-parallel.json)
- 复现脚本：`scripts/viewer-webkit-stall.mjs --minimal --parallel 2 --runs 2`；串行对照使用 `--parallel 1 --runs 4`。

测试配置在 Windows 默认使用一个进程，并限制每个 WebKit 项目的并发，避免完整套件中不同 WebKit 项目互相干扰；Linux 保留两个并发。只运行 Chromium/Firefox 时可显式指定 `--workers=2`。断言 12 秒、单项测试 60 秒、失败截图、trace、录像及原重试策略均未改变。此设置处理本地测试执行环境，不是修改正式网站的 Safari 行为。

最终 Windows WebKit 核心 **23/23**，原失败示例另重复 **8/8**；Linux WebKit 保留两个并发，核心 **23/23**。

## 截图复核

不修改网站样式、图标、颜色、间距或截图容差。

1. **微小图标／按钮边缘差异**：冻结旧版与自身比较也出现 8–10 个像素差异，SVG 内容、几何位置和计算颜色相同。独立浏览器进程的一次 20 场景检查为 20/20，但扩展为 30 场景时仍出现边缘差异；禁用 GPU 也未稳定消除。现在还要求每个版本先独立得到连续两张完全相同的截图，再做版本间比较，不按是否匹配另一版挑帧。没有遮住图标或提高阈值。保留[自比较失败记录](./visual-self-shared-renderer.json)、[独立进程初次记录](./visual-isolated-first.json)、[扩展重复记录](./visual-isolated-repeat.json)、[软件渲染诊断](./visual-software-isolated.json)及[最终逐像素记录](./visual-parity.json)。
2. **历史 Windows 基准**：旧基准仍反映更早的手机工具栏、密度和高度；这些变化已存在于优化前版本。本轮先保存原 PNG，再从冻结的 `e08316e` 构建生成基准，最后运行当前代码验收。
3. **字体准备竞态**：测试在矩阵首次绘制后注入固定字体。旧 Canvas 不一定在字体加载后自动重绘，1920px 的第一次基准因此保留了替代字体。测试准备现增加一次水平滚动并恢复位置，在字体已加载的条件下重绘；没有调整任何截图断言。
4. **Linux 字体基准**：本机当前浏览器对既有 Linux 基准的检查同样在冻结旧版上 5/5 失败。检查 diff 后确认主要落在序列名和字符字体；也从同一冻结构建、同一固定字体重新生成，再独立检验当前实现。

所有 `--update-snapshots` 命令均访问冻结旧版地址：Windows `5298`、Linux `5303`；当前实现的 `5290`、`5302` 检查没有使用更新标志。旧 PNG 保存在 `test-results/round2/golden-before`，Git 中的上一版本也完整保留。[来源与哈希](./screenshot-provenance.json)记录了全部 34 张图，其中 29 张发生变化。

Windows 与 Linux 各 5 个截图用例、共 34 张基准图通过。既有 `maxDiffPixelRatio: 0.002` 未改；新旧版直接对照继续使用更严格的零像素差异要求。

额外的零容差检查覆盖 360、390、768、1280、1440、1920px 六种宽度，以及嵌入、全屏、选区、概览和非等长文件五种状态。最终 **29/30 逐像素相同**；剩下 1440px 嵌入状态仅有 **2 个按钮边缘像素**，最大通道差值为 8（0–255）。严格脚本仍返回失败，不能将这次额外检查称为全通过；既有两平台截图断言均通过。

随后对同一个冻结旧版做三次 1440px 自比较，第一次也在 **(1279, 37)、(1279, 38)** 重现这两个像素，另外两次完全一致。[自比较原始记录](./visual-self-stable.json)证明这处波动不需要本轮代码改动即可出现。保留零容差检查及其失败结果，不修改按钮外观来消除浏览器的边缘栅格差异。

## 最终验证

| 范围 | 结果 |
|---|---|
| 单元测试与科学行为差分 | 129 个文件，957 项通过 |
| TypeScript 与生产构建 | 通过 |
| Chromium 核心流程 | 23/23 |
| Firefox 核心流程 | 23/23 |
| Windows WebKit 核心流程 | 23/23 |
| Linux WebKit 核心流程，2 并发 | 23/23 |
| 输入链路的 Windows WebKit 重复检查 | 24/24 |
| 示例阶段切换重复检查 | 8/8 |
| 布局、触屏、键盘及无障碍（不含截图） | 20 通过，1 按原 CDP 条件跳过 |
| Windows 截图用例 | 5/5 |
| Linux 截图用例 | 5/5 |
| 额外零容差新旧画面对照 | 29/30；一处 2 像素边缘差异，保持失败记录 |

跳过项是 WebKit 不支持的 Chromium CDP 原生多点触控测试；原有 WebKit 移动点击及面板检查仍执行并通过。

失败与成功日志位于工作区上层，分别保留 `core-round2.log`、`webkit-stages-repeat.log`、`webkit-final.log`、`webkit-stages-final.log`、`linux-final.log`、`linux-visual-final.log`、`responsive-visual-final.log`、`visual-current-fonts.log`。对应截图与 trace 在 `test-results/round2` 中，未删除历史失败。

## 本地体验

- 常规入口：<http://127.0.0.1:5290/#/viewer>
- 5,000 × 10,000 的只读合成数据体验：<http://127.0.0.1:5295/#/results/perf?token=performance-test&tab=alignment>

最终源代码与测试证据均仅保存在本地。正式站点和 GitHub 本轮未更新。
