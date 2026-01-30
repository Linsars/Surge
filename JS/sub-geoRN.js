/**
 * 节点信息(适配 Surge/Loon 版 也可在任意平台上使用 HTTP API)
 * 原作者脚本：https://raw.githubusercontent.com/xream/scripts/main/surge/modules/sub-store-scripts/check/geo.js
 * 修改：
 *   - qk=1：仅保留落地命名，失败节点改为“未知”
 *   - geo=1：才开启 geo 检查；geo=0 或不传则完全跳过 geo 逻辑
 */

async function operator(proxies = [], targetPlatform, context) {
  const $ = $substore
  const { isLoon, isSurge, isNode } = $.env
  const internal = $arguments.internal
  const regex = $arguments.regex
  let format = $arguments.format || '{{api.country}} {{api.isp}} - {{proxy.name}}'
  let url = $arguments.api || 'http://ip-api.com/json?lang=zh-CN'
  
  // qk 参数控制（1 才开启纯落地模式）
  const qk = $arguments.qk === '1' || $arguments.qk === 1
  
  // 新：geo 参数也改成 0/1 控制（1 才真正开启 geo 检查）
  const geoEnabled = $arguments.geo === '1' || $arguments.geo === 1

  if (internal) {
    if (typeof $utils === 'undefined' || typeof $utils.geoip === 'undefined' || typeof $utils.ipaso === 'undefined') {
      $.error(`目前仅支持 Surge/Loon(build >= 692) 等有 $utils.ipaso 和 $utils.geoip API 的 App`)
      throw new Error('不支持使用内部方法获取 IP 信息, 请查看日志')
    }
    format = $arguments.format || `{{api.countryCode}} {{api.aso}} - {{proxy.name}}`
    url = $arguments.api || 'http://checkip.amazonaws.com'
  }

  const surge_http_api = $arguments.surge_http_api
  const surge_http_api_protocol = $arguments.surge_http_api_protocol || 'http'
  const surge_http_api_key = $arguments.surge_http_api_key
  const surge_http_api_enabled = surge_http_api

  if (!surge_http_api_enabled && !isLoon && !isSurge)
    throw new Error('请使用 Loon, Surge(ability=http-client-policy) 或 配置 HTTP API')

  const disableFailedCache = $arguments.disable_failed_cache || $arguments.ignore_failed_error
  const remove_failed = $arguments.remove_failed
  const remove_incompatible = $arguments.remove_incompatible
  const incompatibleEnabled = $arguments.incompatible
  const cacheEnabled = $arguments.cache
  const cache = scriptResourceCache

  const method = $arguments.method || 'get'
  const concurrency = parseInt($arguments.concurrency || 10)

  // 如果 geo 未开启（geo≠1），直接返回原节点，不做任何处理
  if (!geoEnabled) {
    $.info('geo 未开启 (geo≠1)，跳过所有 geo 检查和命名修改')
    return proxies
  }

  // 下面才是真正的 geo 检查逻辑
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

  async function check(proxy) {
    const id = cacheEnabled
      ? `geo:${url}:${format}:${regex}:${internal}:${JSON.stringify(
          Object.fromEntries(Object.entries(proxy).filter(([key]) => !/^(collectionName|subName|id|_.*)$/i.test(key)))
        )}`
      : undefined

    try {
      const node = ProxyUtils.produce([proxy], surge_http_api_enabled ? 'Surge' : (isLoon ? 'Loon' : 'Surge'))
      if (!node) {
        proxy._incompatible = true
        return
      }

      const cached = cache.get(id)
      if (cacheEnabled && cached) {
        if (cached.api) {
          $.info(`[${proxy.name}] 使用成功缓存`)
          applyName(proxy, cached.api)
          proxy._geo = cached.api
          return
        } else if (!disableFailedCache) {
          $.info(`[${proxy.name}] 使用失败缓存`)
          applyName(proxy, null)
          return
        }
      }

      const startedAt = Date.now()
      const res = await http({
        method,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1',
        },
        url,
        'policy-descriptor': node,
        node,
      })

      let api = String(lodash_get(res, 'body') || '')
      const status = parseInt(res.status || res.statusCode || 200)
      const latency = `${Date.now() - startedAt}`

      $.info(`[${proxy.name}] status: ${status}, latency: ${latency}ms`)

      if (internal) {
        const ip = api.trim()
        api = {
          countryCode: $utils.geoip(ip) || '',
          aso: $utils.ipaso(ip) || '',
          asn: $utils.ipasn(ip) || '',
        }
      } else {
        try {
          api = JSON.parse(api)
        } catch (e) {
          api = {}
        }
      }

      $.log(`[${proxy.name}] api: ${JSON.stringify(api, null, 2)}`)

      if (status === 200 && (api.country || api.countryCode || Object.keys(api).length > 0)) {
        applyName(proxy, api)
        proxy._geo = api
        if (cacheEnabled) cache.set(id, { api })
      } else {
        applyName(proxy, null)
        if (cacheEnabled) cache.set(id, {})
      }

    } catch (e) {
      $.error(`[${proxy.name}] ${e.message || e}`)
      applyName(proxy, null)
      if (cacheEnabled) cache.set(id, {})
    }
  }

  function applyName(proxy, api) {
    if (qk) {
      // qk=1 模式：只保留落地信息，失败就“未知”
      if (api) {
        proxy.name = formatter({ proxy, api, format, regex })
      } else {
        proxy.name = '未知'
      }
    } else {
      // 原逻辑：测到就替换/拼接，失败保留原名
      if (api) {
        proxy.name = formatter({ proxy, api, format, regex })
      }
      // 失败时不改名
    }
  }

  // http、lodash_get、formatter 函数保持原样（记得把 http 补完整！）
  async function http(opt = {}) {
    // ... 你之前的 http 函数内容（残缺部分请从原版复制补全） ...
  }

  function lodash_get(source, path, defaultValue = undefined) {
    const paths = path.replace(/\[(\d+)\]/g, '.$1').split('.')
    let result = source
    for (const p of paths) {
      result = Object(result)[p]
      if (result === undefined) return defaultValue
    }
    return result
  }

  function formatter({ proxy = {}, api = {}, format = '', regex = '' }) {
    if (regex) {
      const regexPairs = regex.split(/\s*;\s*/g).filter(Boolean)
      const extracted = {}
      for (const pair of regexPairs) {
        const [key, pattern] = pair.split(/\s*:\s*/g).map(s => s.trim())
        if (key && pattern) {
          try {
            const reg = new RegExp(pattern)
            extracted[key] = (typeof api === 'string' ? api : JSON.stringify(api)).match(reg)?.[1]?.trim()
          } catch (e) {
            $.error(`正则表达式解析错误: ${e.message}`)
          }
        }
      }
      api = { ...api, ...extracted }
    }

    return format.replace(/{{(proxy|api)\.([^}]+)}}/g, (_, type, key) => {
      const obj = type === 'proxy' ? proxy : api
      return lodash_get(obj, key, '')
    })
  }
}
