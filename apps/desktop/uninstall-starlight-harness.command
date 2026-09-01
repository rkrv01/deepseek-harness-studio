#!/bin/bash
set -euo pipefail

APP_NAME='Starlight AI助手'
APP_ID='ai.starlight.harness.desktop'

printf '卸载并彻底清理 %s？这会删除该应用的配置、缓存、日志和测试运行档案。\n' "$APP_NAME"
read -r -p '输入 YES 继续：' confirmation
if [[ "$confirmation" != 'YES' ]]; then
  printf '已取消。\n'
  exit 0
fi

printf '正在退出应用...\n'
osascript -e 'tell application "Starlight AI助手" to quit' >/dev/null 2>&1 || true
pkill -f '/Starlight AI助手\.app/' >/dev/null 2>&1 || true
sleep 1

printf '正在删除应用和 Starlight AI助手 数据...\n'
rm -rf \
  "/Applications/${APP_NAME}.app" \
  "$HOME/Applications/${APP_NAME}.app" \
  "$HOME/Library/Application Support/${APP_NAME}" \
  "$HOME/Library/Caches/${APP_NAME}" \
  "$HOME/Library/Logs/${APP_NAME}" \
  "$HOME/Library/Saved Application State/${APP_ID}.savedState" \
  "$HOME/.dsh/profiles/web"

defaults delete "$APP_ID" >/dev/null 2>&1 || true

printf '清理完成。DeepSeek Harness 未被修改。\n'
read -r -p '按回车关闭窗口。' _
