#!/bin/zsh

set -u
cd "${0:A:h}" || exit 1

finish() {
  local code="$1"
  echo
  [[ -t 0 ]] && read -r "?按回车键关闭窗口..."
  exit "$code"
}

fail() {
  echo "[错误] $1"
  finish 1
}

echo "========================================"
echo "  MD 阅读助手 - 更新并覆盖本地代码"
echo "========================================"
echo "项目目录：$PWD"
echo
echo "警告：此操作将以 GitHub 代码为准，删除未提交修改和未跟踪文件。"
echo "两个 Git 辅助脚本本身会被保留。"
echo

command -v git >/dev/null 2>&1 || fail "未找到 Git。请先运行：xcode-select --install"
[[ -d .git ]] || fail "当前目录不是 Git 仓库。"

branch="$(git branch --show-current)"
[[ -n "$branch" ]] || fail "当前处于 detached HEAD 状态。"
git remote get-url origin >/dev/null 2>&1 || fail "未配置 origin 远程仓库。"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "将被删除的本地内容："
  git status --short
  echo
fi

read -r "confirmation?确认覆盖请输入 OVERWRITE："
[[ "$confirmation" == "OVERWRITE" ]] || fail "输入不匹配，操作已取消。"

echo
echo "[1/4] 获取远程最新代码..."
git fetch --prune origin "$branch" || fail "获取远程代码失败，请检查网络或 GitHub 登录状态。"
git show-ref --verify --quiet "refs/remotes/origin/$branch" || fail "远程不存在 origin/$branch。"

echo "[2/4] 覆盖已跟踪文件..."
git reset --hard "origin/$branch" || fail "重置到远程版本失败。"

echo "[3/4] 删除未跟踪文件..."
git clean -fd -e push-to-github.command -e update-from-github.command || fail "清理未跟踪文件失败。"

echo "[4/4] 更新完成。"
git log -1 --oneline
finish 0
