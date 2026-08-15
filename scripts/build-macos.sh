#!/bin/bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "${script_dir}/.." && pwd)"
platform="${1:-darwin/universal}"
if [[ $# -gt 0 ]]; then
  shift
fi
app_name="MD阅读助手.app"

cd "${project_dir}"
wails build -clean -platform "${platform}" -o MDReaderAssistant -trimpath -nocolour "$@"

source_app="$(find build/bin -maxdepth 1 -type d -name '*.app' -print -quit)"
if [[ -z "${source_app}" ]]; then
  find build/bin -maxdepth 3 -print
  echo "The macOS .app bundle was not found in build/bin" >&2
  exit 1
fi

target_app="build/bin/${app_name}"
if [[ "${source_app}" != "${target_app}" ]]; then
  if [[ -e "${target_app}" ]]; then
    echo "Refusing to overwrite existing ${target_app}" >&2
    exit 1
  fi
  mv "${source_app}" "${target_app}"
fi

display_name="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleDisplayName' "${target_app}/Contents/Info.plist")"
if [[ "${display_name}" != "MD阅读助手" ]]; then
  echo "Unexpected macOS display name: ${display_name}" >&2
  exit 1
fi

echo "macOS application ready: ${target_app}"
