#!/bin/bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "${script_dir}/.." && pwd)"
platform="${1:-darwin/universal}"
if [[ $# -gt 0 ]]; then
  shift
fi
app_name="轻阅 Markdown.app"

cd "${project_dir}"
wails build -clean -platform "${platform}" -o QuilliteMarkdown -trimpath -nocolour "$@"

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
if [[ "${display_name}" != "轻阅 Markdown" ]]; then
  echo "Unexpected macOS display name: ${display_name}" >&2
  exit 1
fi

# Apple Silicon executables and their enclosing application bundle must keep a
# coherent code signature. The open-source build uses an ad-hoc identity so it
# does not require a paid Developer ID, but signing the complete bundle is still
# essential: the in-app updater verifies and replaces this bundle as one unit.
/usr/bin/codesign --force --deep --sign - --timestamp=none "${target_app}"
/usr/bin/codesign --verify --deep --strict --verbose=2 "${target_app}"

echo "macOS application ready: ${target_app}"
