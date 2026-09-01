# Starlight AI助手 网页联调约定

## 拉起地址

网页端按钮点击时跳转到以下地址：

```ts
window.location.href = 'starlight-ai://open?source=business-xmzn'
```

协议只负责启动或聚焦已安装的 Starlight AI助手，不会自动打开开发者配置，也不会执行网页传入的命令或文件路径。

## 安装检测

浏览器不能枚举本机应用，网页端使用窗口失焦和页面可见性变化做近似判断：

```ts
export function launchStarlightAi(timeout = 2500): Promise<boolean> {
  return new Promise(resolve => {
    let settled = false
    const finish = (opened: boolean) => {
      if (settled) return
      settled = true
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.clearTimeout(timer)
      resolve(opened)
    }
    const onBlur = () => finish(true)
    const onVisibilityChange = () => {
      if (document.hidden) finish(true)
    }
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibilityChange)
    const timer = window.setTimeout(() => finish(false), timeout)
    window.location.href = 'starlight-ai://open?source=business-xmzn'
  })
}
```

`true` 表示浏览器观察到可能的应用拉起，`false` 表示超时未观察到失焦。浏览器协议确认弹窗、应用启动较慢、用户切换窗口都可能造成误判，因此失败时应展示下载提示，不能把结果当成绝对的安装状态。

## 联调检查

1. 安装应用后，在浏览器地址栏直接输入 `starlight-ai://open?source=business-xmzn`，允许浏览器打开外部应用。
2. 应用未启动时点击网页按钮，应用应启动并显示主窗口。
3. 应用已启动或位于后台时点击网页按钮，不应产生第二个应用进程，只应唤醒已有窗口。
4. 未安装应用时，协议跳转不会启动本地程序，网页应在超时后展示下载入口。
5. 网页自身的路由应使用网页项目已注册的路径；协议事件不会替网页执行 `router.push()`。

## 兼容说明

旧的 `starlight-harness://` 不再作为本版本协议入口。网页发布前必须改为 `starlight-ai://`，并清理旧前端缓存或 Service Worker，避免继续使用旧协议地址。
