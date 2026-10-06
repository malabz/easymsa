# EasyMSA 查看器工作台改版验收记录

实施日期：2026-10-05–06。范围：本地前端；未提交、推送、发布或重新部署后端。

## 使用入口

- 普通示例全屏：[打开工作台](http://localhost:5173/easymsa/#/examples/alignment-small?tab=alignment)
- 重比对示例：[切换结果版本](http://localhost:5173/easymsa/#/examples/realignment-small?tab=alignment&stage=refined)
- 独立查看器：[载入文件、粘贴或示例](http://localhost:5173/easymsa/#/viewer)

## 实现结果

| 需求 | 完成情况 |
| --- | --- |
| 任务与示例全屏直达 | 比对标签直接打开网页内全屏，保留来源、规模、版本和返回结果；加载与错误状态保留返回入口。 |
| 独立查看器 | 载入后使用紧凑信息栏；绿色全屏按钮；同一实例切换，文件无需重新解析。 |
| 矩阵面积 | 全屏在 1280×720、1280×800、1440×900 均达到 75%；1440×900 实测矩阵区 738.3 px，即 82.0%。普通模式在桌面达到 55%，1280×720 实测约 58.9%。 |
| 默认字块 | 桌面默认碱基块仍为 20×24 px；原有字体、间距和触控适配保持。 |
| 精简工具 | 搜索模式合并；视图、分析、导出分组；默认关闭面板；行操作收进更多菜单；批量按钮只在选中行后显示。 |
| 操作与状态 | 选择、键盘、搜索不自动打开分析；返回、刷新、前进后退保留位置与选区。任务与阶段各自保存状态。 |
| 工作区兼容 | 旧文件可导入；缩放、筛选、选区、参考、注释继续恢复，旧缓存的面板展开标记不恢复。 |
| 移动端与键盘 | 视图/分析使用底部面板；Esc 按菜单、面板、全屏顺序退出；保留焦点管理。 |
| 下载与统计 | 原有计算和导出数据逻辑保留，完整任务结果使用现有下载接口。 |

## 自动化验收

- 单元与状态测试：**294 项通过，0 失败**，包含新增加载/错误返回、临时面板状态、快速离开保存、任务/阶段隔离测试。
- 完整查看器浏览器验收：**42 项通过，1 项预期跳过，0 失败，0 flaky**。
- 浏览器：Chromium、Firefox、WebKit；移动 Chrome 与 iPhone/WebKit 仿真。
- 布局：360、390、768、1280、1920 px 宽度；另覆盖 1280×720、1280×800、1440×900 全屏高度目标。
- 无障碍：输入、矩阵、Canvas、设置、分析、QC、导出、全屏；强制颜色、减少动态效果、200% 文本缩放、320/360 px 重排。
- Safari 跳过项为仅支持 CDP 的多触点手势测试；对应测试已在 Chromium 通过。Safari 的点击、矩阵浏览和底部面板检查通过。未将浏览器仿真表述为实体手机验收。
- 已更新 17 张查看器视觉基线，并执行比对。
- TypeScript 与生产构建通过；差异空白检查通过。
- 最后的小幅调整：单结果任务不显示版本选择器；英文搜索框为下拉箭头保留空间。
- 最终留白调整后的布局与视觉复验：**15 项全部通过**，报告为 `C:/mnt/d/code/easymsa-ux-20261005/viewer-final-layout.json`。

报告文件：
- [单元测试 JSON](C:/mnt/d/code/easymsa-ux-20261005/viewer-unit.json)
- [浏览器测试 JSON](C:/mnt/d/code/easymsa-ux-20261005/viewer-e2e.json)
- [真实任务检查 JSON](C:/mnt/d/code/easymsa-ux-20261005/viewer-live-check.json)

## 真实后台流程

使用公开合成示例，通过真实文件控件上传，选择 MiniPOA、Audit，不填写邮箱。

结果：服务器完成比对；全屏进入、返回、再进入和刷新恢复通过；从下载页面取得 gzip FASTA，解压校验通过。

- 20 条序列，515 个比对列。
- ID、序列数、等长检查通过。
- 逐条去 gap 后与对应有效输入一致。
- 下载 SHA256：`eee74221e977152c03dcee011010a6ca01dd39d034e240c0ecab6c0d0cac3630`。
- [下载验收产物](C:/mnt/d/code/easymsa-ux-20261005/viewer-live-alignment.fasta.gz)
- 验收报告及截图不含任务 token。测试任务沿用现有七天保留规则。

第一轮真实流程脚本未等待历史返回完成便点击下个标签，导致检查超时；加入对概览选中状态的等待后，完整流程通过。服务器计算在两轮均完成。

## 设计对照与截图

截图目录：`C:/mnt/d/code/easymsa-ux-20261005/`。

| 状态 | 截图 |
| --- | --- |
| 用户提供的旧任务查看器 | [67-before-task-viewer.png](C:/mnt/d/code/easymsa-ux-20261005/67-before-task-viewer.png) |
| 用户提供的旧独立查看器 | [68-before-standalone-viewer.png](C:/mnt/d/code/easymsa-ux-20261005/68-before-standalone-viewer.png) |
| 新普通模式 | [59-viewer-embedded-1280.png](C:/mnt/d/code/easymsa-ux-20261005/59-viewer-embedded-1280.png) |
| 新全屏示例 | [69-final-example-workspace.png](C:/mnt/d/code/easymsa-ux-20261005/69-final-example-workspace.png) |
| 分析侧栏 | [61-viewer-analysis-1280.png](C:/mnt/d/code/easymsa-ux-20261005/61-viewer-analysis-1280.png) |
| 视图设置 | [65-viewer-view-panel.png](C:/mnt/d/code/easymsa-ux-20261005/65-viewer-view-panel.png) |
| 手机普通模式 | [62-viewer-mobile-390.png](C:/mnt/d/code/easymsa-ux-20261005/62-viewer-mobile-390.png) |
| 手机底部面板 | [63-viewer-mobile-analysis.png](C:/mnt/d/code/easymsa-ux-20261005/63-viewer-mobile-analysis.png) |

## 本地运行

前端继续运行于 5173，通过现有 SSH 隧道连接服务器。后端健康状态在本轮复核可用。公网发布与备案流程不属于本轮操作。
