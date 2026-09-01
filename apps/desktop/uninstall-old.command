#!/bin/bash
set -euo pipefail

LEGACY_APP_NAME='Starlight Harness'
LEGACY_APP_PATHS=(
  "/Applications/${LEGACY_APP_NAME}.app"
  "$HOME/Applications/${LEGACY_APP_NAME}.app"
)

printf 'This removes the legacy %s application only.\n' "$LEGACY_APP_NAME"
printf 'The current Starlight AI助手 application and data will not be touched.\n\n'
read -r -p '输入 YES 继续：' confirmation
if [[ "$confirmation" != 'YES' ]]; then
  printf '已取消。\n'
  exit 0
fi

printf '正在退出旧版应用...\n'
osascript -e "tell application \"${LEGACY_APP_NAME}\" to quit" >/dev/null 2>&1 || true
pkill -f "/${LEGACY_APP_NAME}\\.app/" >/dev/null 2>&1 || true
sleep 1

printf '正在运行旧版卸载程序...\n'
for app_path in "${LEGACY_APP_PATHS[@]}"; do
  uninstaller="$app_path/Contents/Resources/Uninstall ${LEGACY_APP_NAME}.app"
  if [[ -x "$uninstaller" ]]; then
    "$uninstaller" >/dev/null 2>&1 || true
  fi
done

printf '正在删除旧版应用和旧版数据...\n'
for app_path in "${LEGACY_APP_PATHS[@]}"; do
  rm -rf "$app_path"
done
rm -rf \
  "$HOME/Library/Application Support/${LEGACY_APP_NAME}" \
  "$HOME/Library/Caches/${LEGACY_APP_NAME}" \
  "$HOME/Library/Logs/${LEGACY_APP_NAME}"

printf '旧版 Starlight Harness 清理完成，当前 Starlight AI助手 未被修改。\n'
read -r -p '按回车关闭窗口。' _
