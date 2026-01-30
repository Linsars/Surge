/**
 * 节点信息(适配 Surge/Loon 版 也可在任意平台上使用 HTTP API)
 * 原脚本：https://raw.githubusercontent.com/xream/scripts/main/surge/modules/sub-store-scripts/check/geo.js
 *
 * 参数
 * - [retries] 重试次数 默认 1
 * - [retry_delay] 重试延时(单位: 毫秒) 默认 1000
 * - [concurrency] 并发数 默认 10
 * - [internal] 使用内部方法获取 IP 信息. 默认 false
 *              (因为懒) 开启后, 将认为远程 API 返回的响应内容为纯文本 IP 地址, 并用于内部方法
 *              目前仅支持 Surge/Loon(build >= 692) 等有 $utils.ipaso,  $utils.ipasn 和 $utils.geoip API 的 App, 数据来自 GeoIP 数据库
 * - [timeout] 请求超时(单位: 毫秒) 默认 5000
 * - [method] 请求方法. 默认 get
 * - [api] 测落地的 API. 默认为 http://ip-api.com/json?lang=zh-CN
 *         当使用 internal 时, 默认为 http://checkip.amazonaws.com
 * - [format] 自定义格式, 从 节点(proxy) 和 落地 API 响应(api)中取数据. 默认为: {{api.country}} {{api.isp}} - {{proxy.name}}
 *            当使用 internal 时, 默认为 {{api.countryCode}} {{api.aso}} - {{proxy.name}}
 * - [regex] 使用正则表达式从落地 API 响应(api)中取数据. 格式为 a:x;b:y 此时将使用正则表达式 x 和 y 来从 api 中取数据, 赋值给 a 和 b. 然后可在 format 中使用 {{api.a}} 和 {{api.b}}
 * - [incompatible] 在节点上附加 _incompatible 字段来标记当前客户端不兼容该协议, 默认不附加
 * - [remove_incompatible] 移除当前客户端不兼容的协议. 默认不移除.
 * - [remove_failed] 移除失败的节点. 默认不移除.
 * - [surge_http_api] 使用另一台设备上的 HTTP API. 设置后, 将不检测当前运行客户端, 并使用另一台设备上的 HTTP API 执行请求. 默认不使用. 例: 192.168.31.5:6171
 * - [surge_http_api_protocol] HTTP API 的 协议. 默认 http
 * - [surge_http_api_key] HTTP API 的 密码
 * - [cache] 使用缓存. 默认不使用缓存
 * - [disable_failed_cache/ignore_failed_error] 禁用失败缓存. 即不缓存失败结果
 * 关于缓存时长
 * 当使用相关脚本时, 若在对应的脚本中使用参数(注意 别忘了这个, 一般为 cache, 值设为 true 即可)开启缓存
 * 可在前端(>=2.16.0) 配置各项缓存的默认时长
 * 持久化缓存数据在 JSON 里
 * 可以在脚本的前面添加一个脚本操作, 实现保留 1 小时的缓存. 这样比较灵活
 * async function operator() {
 *     scriptResourceCache._cleanup(undefined, 1 * 3600 * 1000);
 * }
 */

async function operator(proxies = [], targetPlatform, context) {
  const $ = $substore
  const { isLoon, isSurge, isNode } = $.env
  const internal = $arguments.internal
  const regex = $arguments.regex
  let format = $arguments.format || '{{api.country}} {{api.isp}} - {{proxy.name}}'
  let url = $arguments.api || 'http://ip-api.com/json?lang=zh-CN'
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

  const target = isLoon ? 'Loon' : isSurge ? 'Surge' : undefined
  const concurrency = parseInt($arguments.concurrency || 10)

  await executeAsyncTasks(
    proxies.map(proxy => () => check(proxy)),
    { concurrency }
  )

  if (remove_incompatible || remove_failed) {
    proxies = proxies.filter(p => {
      if (remove_incompatible && p._incompatible) {
        return false
      } else if (remove_failed && !p._geo) {
        return !remove_incompatible && p._incompatible
      }
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
      const node = ProxyUtils.produce([proxy], surge_http_api_enabled ? 'Surge' : target)
      if (node) {
        const cached = cache.get(id)
        if (cacheEnabled && cached) {
          if (cached.api) {
            $.info(`[${proxy.name}] 使用成功缓存`)
            $.log(`[${proxy.name}] api: ${JSON.stringify(cached.api, null, 2)}`)
            proxy.name = formatter({ proxy, api: cached.api, format, regex })
            proxy._geo = cached.api
            return
          } else {
            if (disableFailedCache) {
              $.info(`[${proxy.name}] 不使用失败缓存`)
            } else {
              $.info(`[${proxy.name}] 使用失败缓存`)
              proxy.name = '未知'  // 失败缓存也改成未知
              return
            }
          }
        }
        const startedAt = Date.now()
        const res = await http({
          method,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1',
          },
          url,
          'policy-descriptor': node,
          node,
        })
        let api = String(lodash_get(res, 'body'))
        const status = parseInt(res.status || res.statusCode || 200)
        let latency = ''
        latency = `${Date.now() - startedAt}`
        $.info(`[${proxy.name}] status: ${status}, latency: ${latency}`)
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
          } catch (e) {}
        }

        $.log(`[${proxy.name}] api: ${JSON.stringify(api, null, 2)}`)
        if (status == 200) {
          proxy.name = formatter({ proxy, api, format, regex })   // 成功 → 覆盖名字
          proxy._geo = api
          if (cacheEnabled) {
            $.info(`[${proxy.name}] 设置成功缓存`)
            cache.set(id, { api })
          }
        } else {
          proxy.name = '未知'  // 非 200 → 改成未知
          if (cacheEnabled) {
            $.info(`[${proxy.name}] 设置失败缓存`)
            cache.set(id, {})
          }
        }
      } else {
        proxy._incompatible = true
      }
    } catch (e) {
      $.error(`[${proxy.name}] ${e.message ?? e}`)
      proxy.name = '未知'  // 异常 → 改成未知
      if (cacheEnabled) {
        $.info(`[${proxy.name}] 设置失败缓存`)
        cache.set(id, {})
      }
    }
  }

  async function http(opt = {}) {
    const METHOD = opt.method || 'get'
    const TIMEOUT = parseFloat(opt.timeout || $arguments.timeout || 5000)
    const RETRIES = parseFloat(opt.retries ?? $arguments.retries ?? 1)
    const RETRY_DELAY = parseFloat(opt.retry_delay ?? $arguments.retry_delay ?? 1000)

    let count = 0
    const fn = async () => {
      try {
        if (surge_http_api_enabled) {
          const res = await $.http.post({
            url: `${surge_http_api_protocol}://${surge_http_api}/v1/scripting/evaluate`,
            timeout: TIMEOUT,
            headers: { 'x-key': surge_http_api_key, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              script_text: `$httpClient.get(${JSON.stringify({
                ...opt,
                timeout: TIMEOUT / 1000,
              })}, (error, response, data) => {  $done({ error, response, data }) }) `,
              mock_type: 'cron',
              timeout: TIMEOUT / 1000,
            }),
          })
          let body = String(lodash_get(res, 'body'))
          try {
            body = JSON.parse(body)
          } catch (e) {}
          const error = lodash_get(body, 'result.error')
          if (error) throw new Error(error)
          let data = String(lodash_get(body, 'result.data'))
          let response = String(lodash_get(body, 'result.response'))
          return { ...response, body: data }
        } else {
          return await $.http[METHOD]({ ...opt, timeout: TIMEOUT })
        }
      } catch (e) {
        if (count < RETRIES) {
          count++
          const delay = RETRY_DELAY * count
          await $.wait(delay)
          return await fn()
        } else {
          throw e
        }
      }
    }
    return await fn()
  }

  function lodash_get(source, path, defaultValue = undefined) {
    const paths = path.replace(/\[(\d+)\]/g, '.$1').split('.')
    let result = source
    for (const p of paths) {
      result = Object(result)[p]
      if (result === undefined) {
        return defaultValue
      }
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
    return format.replace(/{{([^{}]+)}}/g, (_, key) => {
      const [obj, prop] = key.split('.')
      if (obj === 'proxy') return proxy[prop] ?? ''
      if (obj === 'api') return api[prop] ?? ''
      return ''
    })
  }
}
