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
echo "  MD 阅读助手 - 推送代码到 GitHub"
echo "========================================"
echo "项目目录：$PWD"
echo

command -v git >/dev/null 2>&1 || fail "未找到 Git。请先运行：xcode-select --install"
[[ -d .git ]] || fail "当前目录不是 Git 仓库。"

branch="$(git branch --show-current)"
[[ -n "$branch" ]] || fail "当前处于 detached HEAD 状态。"
git remote get-url origin >/dev/null 2>&1 || fail "未配置 origin 远程仓库。"

echo "[1/5] 获取远程状态..."
git fetch --prune origin "$branch" || fail "获取远程状态失败，请检查网络或 GitHub 登录状态。"

if git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
  behind="$(git rev-list --count "HEAD..origin/$branch")" || fail "无法比较本地和远程版本。"
  (( behind == 0 )) || fail "远程比本地多 $behind 个提交。请先运行更新脚本。"
fi

echo "[2/5] 暂存修改..."
git add -A || fail "暂存修改失败。"

if git diff --cached --quiet; then
  echo "[3/5] 没有新的文件修改，跳过提交。"
else
  git diff --cached --check || fail "修改中存在空白错误或冲突标记。"
  echo
  git status --short
  echo
  read -r "message?请输入提交说明："
  [[ -n "${message//[[:space:]]/}" ]] || fail "提交说明不能为空。"
  echo "[3/5] 创建提交..."
  git commit -m "$message" || fail "提交失败。"
fi

echo "[4/5] 推送当前分支 $branch..."
git push -u origin "$branch" || fail "推送失败，请检查网络、权限或 GitHub 登录状态。"

echo "[5/5] 推送完成。"
finish 0
