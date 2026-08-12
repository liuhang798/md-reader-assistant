# MD阅读助手：Windows 应用内自更新修复全记录

- 日期：2026-08-12
- 涉及版本：v2.3.5 → v2.3.13
- 主题：应用内自更新（"下载并更新"）三次实测失败 → 根因定位 → Go helper 进程方案重写
- 结论：**Windows 下 cmd.exe 无法处理非 ASCII（中文）路径**，且运行中的 helper 不能覆盖自身 exe；最终改为复制到独立临时 exe 的纯 Go 辅助进程完成替换与重启，v2.3.12 完成修复。

## 2026-08-12 追加：v2.3.11 的残余文件锁问题

v2.3.10/2.3.11 的 Go helper 虽然绕过了 `cmd.exe` 的中文路径问题，但 helper 仍通过安装目录中的主程序 exe 启动。主进程退出后，helper 自己继续占用同一个 exe，Windows 因而拒绝覆盖该文件。旧端到端测试使用了与测试进程不同的目标文件，没有模拟“helper 与待替换目标来自同一 exe”，因此出现了误判。

v2.3.12 将当前程序先复制为更新目录中的独立 `apply-update-helper-<pid>.exe`，再从该副本启动 helper。主程序退出后，安装目录 exe 不再被任何更新进程占用，可以正常覆盖并重启。新增真实回归测试会从一个模拟安装目录 exe 发起更新，验证该 exe 被替换且新版本确实重新运行；同时补充失败原因日志。v2.3.13 作为公开构建与应用内升级验证目标，包含相同修复代码。

---

## 一、背景

MD阅读助手（Wails 2.13 + Go 1.25 + 原生 HTML/CSS/JS）提供"下载并更新"功能：客户端检查 GitHub Release，下载新版本二进制，校验 SHA-256 digest，然后退出、替换自身可执行文件并重启。

自更新的替换逻辑存在平台差异：

| 平台 | 原方案 |
|---|---|
| macOS | 分离 shell 脚本（`/bin/sh`），替换 .app 内可执行文件后 `open` 重启 |
| Windows | **bat 脚本**（本次修复对象） |
| Linux | 不支持应用内更新（保留手动下载） |

Windows 上早期逻辑下载的是 **NSIS 安装包**（`-windows-amd64.exe`），通过 `/S` 静默安装完成升级；后续改为下载**便携 `.bin` 可执行文件**，直接替换正在运行的 exe，使安装版与便携版都能自更新。

## 二、三次实测失败记录

### 第 1 次：2.3.5 → 2.3.6（旧逻辑：NSIS /S 静默安装）

- 现象：点"下载并更新" → 进度条走完 → 应用关闭，**不再自动打开**；下次打开仍是旧版，继续提示更新。
- 原因：便携/直接运行时，静默安装的是**另一个位置的副本**（`%LOCALAPPDATA%\Programs\...`），当前运行的 exe 从未被替换；且 `timeout` 等在 GUI 进程下不可靠。

### 第 2 次：2.3.7 → 2.3.8（新逻辑 v1：bat 自替换脚本）

- 现象：同上（关闭、不重启、未升级、无日志）。
- 代码生成 bat 内容（2.3.7 时代）：

```bat
@echo off
rem In-app updater: wait for the old process, replace it, restart.
set /a tries=0
:loop
tasklist /FI "IMAGENAME eq md-reader-assistant.exe" 2>nul | find /I "md-reader-assistant.exe" >nul
if errorlevel 1 goto copy
set /a tries+=1
if %tries% geq 90 (
  echo [apply-update] timed out waiting for "md-reader-assistant.exe" to exit >> "C:\Users\柳航\AppData\Roaming\MD阅读助手\update\apply-update.log"
  exit /b 1
)
timeout /t 1 /nobreak >nul
goto loop
:copy
echo [apply-update] replacing d:\Users\柳航\AppData\Local\Programs\MD阅读助手\md-reader-assistant.exe with C:\Users\柳航\AppData\Roaming\MD阅读助手\update\md-reader-assistant-2.3.9-windows-amd64.bin >> "..."
copy /Y "C:\Users\柳航\...\update\md-reader-assistant-2.3.9-windows-amd64.bin" "d:\Users\柳航\...\md-reader-assistant.exe" >> "..." 2>&1
...
start "" "d:\Users\柳航\AppData\Local\Programs\MD阅读助手\md-reader-assistant.exe"
```

- 暴露的问题点：
  1. `timeout /t 1` 在 GUI 应用（stdin 无效）下立即失败，等待循环失去延迟，90 次重试**瞬间耗尽**，脚本在应用退出前就超时退出；
  2. Go 写入的 bat 是 **UTF-8** 编码，cmd.exe 按系统代码页（GBK）解析 → 路径中的中文（`柳航`、`MD阅读助手`）**全部乱码** → copy 找不到文件、日志写不进；
  3. update 目录里**没有 apply-update.log**（乱码路径写失败），排查无据。

### 第 3 次：2.3.9（bat 修复版：纯 ASCII + 环境变量 + ping）

- 修复内容：bat 改为全 ASCII，路径经环境变量传递（Windows 环境变量内部为 UTF-16，无乱码）；`timeout` 换成 `ping -n 2 127.0.0.1`。
- 结果：**仍然失败**。update 目录同样无日志。

## 三、根因定位（关键实验）

用户提供了 `%APPDATA%\MD阅读助手\update\` 目录内容：旧版 `apply-update.bat` + 已下载校验通过的 `md-reader-assistant-2.3.9-windows-amd64.bin`。**下载与校验链路正常**，问题只在脚本执行环节。

用 node/Go 在本机（中文用户名 `柳航`）做了一组对照实验：

| 调用方式 | 结果 |
|---|---|
| `cmd /C <中文路径.bat>` | ❌ 报 "系统找不到指定的路径"（GBK 乱码显示） |
| `cmd /C "<中文路径.bat>"`（加引号） | ❌ 失败 |
| `cmd /C start /wait <中文路径.bat>` | ❌ 失败 |
| 直接 `exec.Command(<中文路径.bat>)` | ❌ 失败（最终仍由 cmd 解析） |
| `powershell -Command "& '<中文路径.bat>'"` | ❌ 失败 |
| `cmd /C <ASCII 路径.bat>`（`C:\ProgramData\...`） | ✅ 执行成功 |
| **Go `exec.Command(<中文路径.exe>)`** | ✅ **成功**（CreateProcessW UTF-16） |
| `cmd` 内 `start "" <中文路径.exe>` | ❌ 失败 |

**结论：cmd.exe 对非 ASCII 路径的解析存在根本缺陷**（内部按 ANSI/OEM 代码页处理），凡经过 cmd 的路径都不可靠；而 Go 的 `os/exec` 走 `CreateProcessW`（UTF-16），中文路径完全正常。`cmd /C` 执行 ASCII 路径成功则证明问题不在 bat 内容，而在"路径解析"这一环。

## 四、最终修复：Go helper 进程方案（v2.3.10）

彻底抛弃 cmd/bat，替换与重启全部在 Go 内完成：

### 设计

1. 应用（主进程）下载并校验新 `.bin` 后，用 `os.Executable()` 以 **`--apply-update` 参数启动自身的一个隐藏实例**（helper）；
2. helper 不初始化 GUI，直接进入更新流程：
   - **等待旧进程退出**：`tasklist /FI "PID eq <parentPid>"` 轮询（最长 90 秒），确保单实例锁释放；
   - **替换**：`os.ReadFile` + `os.WriteFile` 用新二进制覆盖当前 exe；
   - **重启**：`exec.Command(oldExecutable).Start()` 启动新版本；
   - **全程写日志**到 `apply-update.log`，便于定位。

### 关键代码（updater_windows.go）

```go
func applyUpdate(downloadPath string) error {
	executable, err := os.Executable()
	if err != nil {
		return err
	}
	command := exec.Command(executable, "--apply-update", downloadPath, executable, strconv.Itoa(os.Getpid()))
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	return command.Start()
}
```

- `main.go` 在 Wails 启动前调用 `runUpdateHelperIfRequested()`；检测到 `--apply-update` 参数即进入 helper 流程并 `os.Exit`，不创建单实例锁、不弹窗。
- `updater_darwin.go` / `updater_other.go` 提供 no-op 实现（macOS 保留 shell 方案，Linux 不支持）。

### 测试

- `TestReplaceFileWithChinesePaths`：中文路径下替换文件内容正确；
- `TestProcessAlive`：tasklist PID 存活检测；
- `TestRunUpdateHelperEndToEnd`：编译真实 helper 二进制，模拟"旧进程退出 → 替换 → 自动重启新版 → 日志完整"全链路（本地实际运行通过，约 3.2s）。

## 五、验证与发布

- **v2.3.10**：修复版客户端（Go helper 方案）。本地 `wails build` 生成安装包：`build/releases-for-testing/md-reader-assistant-2.3.10-windows-amd64.exe`；GitHub Release 含 `-windows-amd64.bin`（带 sha256 digest）。
- **v2.3.11**：空版本，作为**更新验证目标**（自更新逻辑来自"当前运行的老版本"，必须装上新修复客户端才能测新代码）。
- 三平台 CI 构建均 success。

### 用户实测步骤

1. **手动安装 v2.3.10**（本地 `build/releases-for-testing/` 或 GitHub Release 下载安装包）；
2. 启动 → 自动检查提示 v2.3.11 → 点"下载并更新"；
3. 预期：进度条 → 应用关闭 → **自动重新打开 v2.3.11** → 不再提示；
4. 若仍失败，提供 `%APPDATA%\MD阅读助手\update\apply-update.log` 内容定位。

## 六、关键经验教训

1. **自更新是"鸡生蛋"问题**：修复逻辑必须随新客户端安装后才生效，验证时需要"先手动装修复版 → 再更新到下一个版本"。
2. **Windows cmd 无法处理非 ASCII 路径**：中文用户名/目录下，任何经 cmd（bat、start、文件关联）的脚本都不可靠；优先使用 Go 原生 `os/exec`（UTF-16 API）。
3. **`timeout` 在 GUI 进程下失效**（stdin 无效），等待延迟需用不依赖 stdin 的方式。
4. **日志先行**：更新脚本每步写日志，失败时才有据可查；本次前两轮失败正是因为没有日志而盲猜。
5. **升级安装需等待旧进程完全退出**（单实例锁），替换前必须确认进程终止。

## 七、相关文件

| 文件 | 说明 |
|---|---|
| `updater_windows.go` | Windows 更新替换逻辑（applyUpdate / runUpdateHelper / processAlive / replaceFile） |
| `updater_windows_test.go` | Windows 更新逻辑测试（含端到端） |
| `updater_darwin.go` | macOS shell 脚本方案（保留） |
| `updater_other.go` | 其他平台 no-op |
| `updates.go` | 更新检查、digest 校验、资产选择 |
| `main.go` | `runUpdateHelperIfRequested()` 入口 |
| `frontend/src/renderer.js` | 前端更新弹窗、进度、`downloadAndApplyUpdate` 调用 |
| `build/releases-for-testing/` | 本地构建的测试安装包 |
