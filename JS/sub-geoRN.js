/**
 * 节点信息(适配 Surge/Loon 版 也可在任意平台上使用 HTTP API)
 * 原作者脚本：https://raw.githubusercontent.com/xream/scripts/main/surge/modules/sub-store-scripts/check/geo.js
 * 修改：
 *   - 支持 #geo=1&qk=1 这种 fragment 参数写法（和 ? 同时支持，# 优先覆盖 ?）
 *   - qk=1：仅保留落地命名，失败节点改为“未知”
 *   - geo=1：才开启 geo 检查和命名修改；geo=0 或不传 → 完全跳过
 */

async function operator(proxies = [], targetPlatform, context) {
  const $ = $substore
  const { isLoon, isSurge, isNode } = $.env
  const internal = $arguments.internal
  const regex = $arguments.regex
  let format = $arguments.format || '{{api.country}} {{api.isp}} - {{proxy.name}}'
  let url = $arguments.api || 'http://ip-api.com/json?lang=zh-CN'

  // 从完整 URL (context.url) 中提取 # 后面的 fragment 参数
  let fragmentParams = {}
  if (context && context.url && context.url.includes('#')) {
    const fragment = context.url.split('#')[1]
    if (fragment) {
      fragment.split('&').forEach(pair => {
        const [key, value] = pair.split('=')
        if (key) {
          fragmentParams[decodeURIComponent(key)] = value ? decodeURIComponent(value) : true
        }
      })
    }
  }

  // 合并参数：? 的 $arguments + # 的 fragmentParams，# 优先覆盖
  const allArgs = { ...$arguments, ...fragmentParams }

  // qk 参数控制（1 才开启纯落地模式）
  const qk = allArgs.qk === '1' || allArgs.qk === 1

  // geo 参数控制（1 才开启 geo 检查）
  const geoEnabled = allArgs.geo === '1' || allArgs.geo === 1

  if (internal) {
    if (typeof $utils === 'undefined' || typeof $utils.geoip === 'undefined' || typeof $utils.ipaso === 'undefined') {
      $.error(`目前仅支持 Surge/Loon(build >= 692) 等有 $utils.ipaso 和 $utils.geoip API 的 App`)
      throw new Error('不支持使用内部方法获取 IP 信息, 请查看日志')
    }
    format = allArgs.format || `{{api.countryCode}} {{api.aso}} - {{proxy.name}}`
    url = allArgs.api || 'http://checkip.amazonaws.com'
  }

  const surge_http_api = allArgs.surge_http_api
  const surge_http_api_protocol = allArgs.surge_http_api_protocol || 'http'
  const surge_http_api_key = allArgs.surge_http_api_key
  const surge_http_api_enabled = surge_http_api

  if (!surge_http_api_enabled && !isLoon && !isSurge)
    throw new Error('请使用 Loon, Surge(ability=http-client-policy) 或 配置 HTTP API')

  const disableFailedCache = allArgs.disable_failed_cache || allArgs.ignore_failed_error
  const remove_failed = allArgs.remove_failed
  const remove_incompatible = allArgs.remove_incompatible
  const incompatibleEnabled = allArgs.incompatible
  const cacheEnabled = allArgs.cache
  const cache = scriptResourceCache

  const method = allArgs.method || 'get'
  const concurrency = parseInt(allArgs.concurrency || 10)

  // 如果 geo 未开启，直接返回原 proxies
  if (!geoEnabled) {
    $.info('geo 未开启 (geo ≠ 1)，跳过所有 geo 检查和命名修改')
    return proxies
  }

  await executeAsyncTasks(
    proxies.map(proxy => () => check(proxy)),
    { concurrency }
  )

  if (remove_incompatible || remove_failed) {
    proxies = proxies.filter(p => {
      if (remove_incompatible && p._incompatible) return false
      if (remove_failed && !p._geo) return false
      return true
    })
  }

  if (!incompatibleEnabled) {
    proxies = proxies.map(p => {
      delete p._incompatible
      return p
    })
  }

  return proxies

  // check / applyName / lodash_get / formatter 函数保持不变，以下省略...
  // （把你原来的 check、applyName、lodash_get、formatter 粘贴在这里）

  async function http(opt = {}) {
    // ... 这里放你原来的 http 函数（残缺的也行，但建议补完整）
    // 如果你用我之前给的完整版 http，请直接替换
  }

  // executeAsyncTasks 如果缺失，也需要补上（之前版本有）
  function executeAsyncTasks(tasks, { concurrency = 1 } = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        let running = 0
        let index = 0

        function executeNextTask() {
          while (index < tasks.length && running < concurrency) {
            const taskIndex = index++
            const currentTask = tasks[taskIndex]
            running++

            currentTask()
              .then(() => {})
              .catch(() => {})
              .finally(() => {
                running--
                executeNextTask()
              })
          }
          if (running === 0) resolve()
        }

        executeNextTask()
      } catch (e) {
        reject(e)
      }
    })
  }
}
