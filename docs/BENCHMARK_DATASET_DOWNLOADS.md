# Benchmark 数据集下载

“下载数据”提供实际参评的未比对 FASTA，不导出成绩。

- 数据集详情和对比示例：下载当前数据集的 `.fasta`。
- 总览：从当前筛选的目录中选择一组下载，或下载全部 26 组 FASTA 的 ZIP。
- “导出成绩”单独提供 CSV／JSON；公开成绩的入口放在实验详情内，对比页保留独立的成绩导出入口。

文件采用 `frozen-colon-n-20261027` 数据版本，与现有成绩对应。三个线粒体用例使用冒号替换为 N 后的文件。
下载不包含用户比对结果、任务日志或服务器配置。FASTA 文件保留原字节、标题和记录顺序。

## 文件准备

使用 Python 3.9 或以上的标准库，在仓库外生成下载文件：

```bash
python scripts/prepare-benchmark-downloads.py --source /path/to/frozen-data --output /path/to/downloads
python scripts/test_prepare_benchmark_downloads.py
```

源目录提供已有的 `manifest.json` 和其中列出的输入文件。脚本先核对全部输入的 SHA-256，再生成文件，
拒绝覆盖已有版本目录。输出目录为 `downloads/frozen-colon-n-20261027/`，包含 26 个 FASTA、
`all-inputs.zip` 和仅包含公开文件信息的 `manifest.json`。

发布时将完整版本目录放到前端静态文件的 `benchmark/datasets/` 下：

```text
dist/benchmark/datasets/frozen-colon-n-20261027/
  dna_16s_100.fasta
  ...
  rna_8191.fasta
  all-inputs.zip
  manifest.json
```

大文件保存在独立数据目录，不提交到 Git。仓库中的 `public/benchmark/datasets-manifest.json` 保存公开校验清单，
浏览器下载测试独立检查文件名、SHA-256、序列数量和 ZIP 校验值。

## 运行条件展示

实验详情合并展示当前 Benchmark 的资源上限。当前目录的最高内存限额为 32 GiB，页面不再展开旧批次资源说明。
方法版本、参数、科学指标以及逐条结果的原始来源和实际资源条件仍保留在原报告及成绩导出中。
展示层的合并不改写这些记录。

## 验证

- `DatasetDownloads.test.tsx`：文件链接、筛选、数据版本、成绩导出入口与资源说明。
- `benchmark-datasets.spec.ts`：真实 FASTA／ZIP 下载、校验值、记录数，以及公开页和示例页的说明。
- 既有表格、图表和 CSV／JSON 一致性检查继续执行。

### 本轮验收（2026-11-04）

- Benchmark 单元测试 18 个文件、277 项通过；数据打包脚本的 3 项测试通过。
- 桌面与手机完整浏览器回归 82 项通过，无失败、跳过或重试；菜单关闭交互完善后，6 项下载专项再次通过。
- 全部 26 组 FASTA 的校验值、序列数量与冻结输入和公开目录一致；实际下载的 FASTA 与 ZIP 通过独立校验。
- 公开六方法 156 个组合、1,092 项原始指标，以及示例 182 个组合、1,274 项指标继续通过表格、图表和成绩下载核对。
- 类型检查与构建通过。三个科学成绩 JSON 与 Git HEAD 的解析内容一致。

本地预览：`http://127.0.0.1:5266/#/benchmark`。
验收记录：`D:/code/easymsa-dataset-downloads-20261104/validation.json`。
下载文件保存在本地独立目录及服务器数据目录，发布时与前端版本一同部署。
上线检查应核对版本标识、实验详情资源上限，以及实际下载的 FASTA／ZIP 文件校验值。
