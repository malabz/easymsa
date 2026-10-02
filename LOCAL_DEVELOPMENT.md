# EasyMSA 本地开发

备案期间使用本机前端，通过 SSH 连接现有服务器真实运行比对。

## 日常使用

在本仓库的 Windows 文件夹中（先在 WSL 中安装 Node.js、Python 3 和前端依赖）：

- 双击 `Start-local-dev.cmd`：建立连接、启动前端并打开浏览器。
- 打开 http://localhost:5173/easymsa/ ，进入提交页面，选择“上传文件”，选择 FASTA，提交后等待完成，在结果页下载比对文件。
- 双击 `Reconnect-local-dev.cmd`：网络中断、电脑休眠或服务器短暂不可达后重新连接后端。
- 双击 `Stop-local-dev.cmd`：停止这套本地开发服务。

启动后无需保持启动窗口打开；修改 `src` 下前端代码后，页面会自动更新。关闭电脑、关闭 WSL 或重启后，需要重新双击启动入口。此地址仅用于本机开发。

可使用至少包含两条核酸序列的 FASTA 文件进行开发验收。

默认不填写邮箱即可避免开发任务发送邮件。任务实际存储在服务器，按服务器现有七天保留期清理。停止本地开发不会删除服务器任务。保留页面提供的任务访问凭证，以便在其他浏览器恢复任务；不要把凭证提交进 Git。

## 连接结构

浏览器 → 本机 Vite `/api` 开发代理 → 本机 `127.0.0.1:18000` SSH 隧道 → `47.99.84.159` 的 `127.0.0.1:8000` API → 服务器队列及比对程序。

Windows 启动入口默认使用 `%USERPROFILE%\.ssh\_msa-web.pem`，直接在 WSL 启动时默认使用 `~/.ssh/_msa-web.pem`。临时私钥副本位于 Linux 文件系统，权限为 600，正常停止时删除。首次连接记住服务器主机密钥，后续密钥变更会拒绝连接。

开发脚本默认使用 Ubuntu WSL、前端端口 5173 和隧道端口 18000。若端口被其他进程占用，启动会报错，不会终止其他进程。前端和隧道只监听本机回环地址。

启动入口设置 `EASYMSA_LOCAL_BACKEND=1` 和 `VITE_API_BASE_URL=/api`，仅当前开发进程生效。普通 `npm run build` 仍采用现有 `.env.local` 的生产 API 域名，不启用开发代理。不要将正式 API 地址改成裸 IP 或本机地址。

## 故障检查

- 页面打不开：重新运行启动入口；检查是否有端口占用报错。
- 页面能打开，但提示后端不可用：运行重连入口，等待数秒后刷新页面。
- 启动提示 SSH 失败：检查网络、服务器 SSH、已有密钥文件；不会要求把私钥粘贴到网页。
- 查看状态：在 Ubuntu WSL 中运行 `python3 scripts/local-dev.py status`。
- 开发日志：Ubuntu WSL 中 `/tmp/easymsa-local-dev-<UID>/development.log`。代理错误中的任务 token 会被隐藏。

## 连接参数

启动前可设置以下环境变量；Windows 入口会把连接参数传入 WSL：

| 参数 | 默认值或用途 |
| --- | --- |
| `EASYMSA_WSL_DISTRO` | Windows 入口使用的 WSL 发行版，默认 `Ubuntu` |
| `EASYMSA_SSH_KEY` | 私钥文件路径；Windows 入口接受 Windows 路径并转换为 WSL 路径 |
| `EASYMSA_SSH_KNOWN_HOSTS` | 已知主机文件；默认使用私钥同目录的 `known_hosts` |
| `EASYMSA_SSH_TARGET` | 默认 `root@47.99.84.159`；可改为有权限的 SSH 用户和主机 |
| `EASYMSA_SSH_PORT` | 默认 `22` |

入口从自身所在目录运行，不依赖固定盘符或用户名。参数在启动会话时读取；更改参数需停止并重新启动。不要把私钥内容、任务凭证或受保护配置提交进 Git。

该开发通道不代表公网备案拦截已经解除。备案完成后仍需单独验证生产 HTTPS、跨域与 GitHub Pages 完整用户流程。
