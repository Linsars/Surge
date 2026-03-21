/**
 * 节点测活 + 真实落地国家重命名 (适配 Surge/Loon 版)
 * 
 * 原脚本：https://raw.githubusercontent.com/xream/scripts/main/surge/modules/sub-store-scripts/check/availability.js
 * 修改说明：
 * 1. 先完整执行原测活逻辑（只保留存活节点）
 * 2. 对每个存活节点，通过真实代理发起 GeoIP 查询，获取落地国家两字母简写（ip-api.com）
 * 3. 去掉原节点名，直接重命名为：国家简写-序号（如 US-01、HK-02、SG-03）
 * 4. 完整保留原脚本所有参数、缓存、Telegram 通知、兼容性处理等逻辑
 * 
 * 使用方法：
 * 在 Sub-Store 中新建脚本操作，粘贴整个代码，参数与原脚本完全一致（可加 show_latency 等）
 * 推荐配合 cache=true 使用，避免重复测活
 */

async function operator(proxies = [], targetPlatform, env) {
  const $ = $substore
  const { isLoon, isSurge } = $.env
  if (!isLoon && !isSurge) throw new Error('仅支持 Loon 和 Surge(ability=http-client-policy)')
  const telegram_chat_id = $arguments.telegram_chat_id
  const telegram_bot_token = $arguments.telegram_bot_token
  const cacheEnabled = $arguments.cache
  const disableFailedCache = $arguments.disable_failed_cache || $arguments.ignore_failed_error
  const cache = scriptResourceCache
  const method = $arguments.method || 'head'
  const keepIncompatible = $arguments.keep_incompatible
  const validStatus = new RegExp($arguments.status || '204')
  const url = decodeURIComponent($arguments.url || 'http://connectivitycheck.platform.hicloud.com/generate_204')
  const ua = decodeURIComponent(
    $arguments.ua ||
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1'
  )
  const target = isLoon ? 'Loon' : isSurge ? 'Surge' : undefined
  const validProxies = []
  const incompatibleProxies = []
  const failedProxies = []
  let name = ''
  for (const [key, value] of Object.entries(env.source)) {
    if (!key.startsWith('_')) {
      name = value.displayName || value.name
      break
    }
  }
  if (!name) {
    const collection = env.source._collection
    name = collection.displayName || collection.name
  }

  const concurrency = parseInt($arguments.concurrency || 10) // 一组并发数
  await executeAsyncTasks(
    proxies.map(proxy => () => check(proxy)),
    { concurrency }
  )

  // ====================== 重命名逻辑（测试存活后统一处理） ======================
  const countryCounter = {}
  for (let i = 0; i < validProxies.length; i++) {
    const proxy = validProxies[i]
    let country = proxy._country || 'XX'
    if (!countryCounter[country]) {
      countryCounter[country] = 0
    }
    countryCounter[country]++
    const seq = String(countryCounter[country]).padStart(2, '0')
    proxy.name = `${country}-${seq}`  // 去掉原节点名，直接用国家-序号
    delete proxy._country  // 清理临时字段
  }
  // ====================== 重命名结束 ======================

  if (telegram_chat_id && telegram_bot_token && failedProxies.length > 0) {
    const text = `\`${name}\` 节点测试:\n${failedProxies
      .map(proxy => `Failed [${proxy.type}] \`${proxy.name}\``)
      .join('\n')}`
    await http({
      method: 'post',
      url: `https://api.telegram.org/bot${telegram_bot_token}/sendMessage`,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chat_id: telegram_chat_id, text, parse_mode: 'MarkdownV2' }),
      retries: 0,
      timeout: 5000,
    })
  }

  return validProxies

  async function check(proxy) {
    const id = cacheEnabled
      ? `availability:${url}:${method}:${validStatus}:${JSON.stringify(
          Object.fromEntries(
            Object.entries(proxy).filter(([key]) => !/^(name|collectionName|subName|id|_.*)$/i.test(key))
          )
        )}`
      : undefined
    try {
      const node = ProxyUtils.produce([proxy], target)
      if (node) {
        const cached = cache.get(id)
        if (cacheEnabled && cached) {
          if (cached.latency) {
            validProxies.push({
              ...proxy,
              name: `${$arguments.show_latency ? `[${cached.latency}] ` : ''}${proxy.name}`,
              _latency: cached.latency,
            })
            $.info(`[${proxy.name}] 使用成功缓存`)
            return
          } else if (disableFailedCache) {
            $.info(`[${proxy.name}] 不使用失败缓存`)
          } else {
            $.info(`[${proxy.name}] 使用失败缓存`)
            return
          }
        }
        // 请求测活
        const startedAt = Date.now()
        const res = await http({
          method,
          headers: {
            'User-Agent': ua,
          },
          url,
          'policy-descriptor': node,
          node,
        })
        const status = parseInt(res.status || res.statusCode || 200)
        let latency = `${Date.now() - startedAt}`
        $.info(`[${proxy.name}] status: ${status}, latency: ${latency}`)
        // 判断响应
        if (validStatus.test(status)) {
          // ====================== 存活后查询真实落地国家 ======================
          let country = 'XX'
          try {
            const geoRes = await http({
              method: 'get',
              url: 'http://ip-api.com/json/?fields=countryCode',
              'policy-descriptor': node,
              node,
              timeout: 5000,
            })
            const geoData = JSON.parse(geoRes.body || '{}')
            if (geoData.countryCode) {
              country = geoData.countryCode.toUpperCase()
            }
          } catch (e) {
            $.error(`[${proxy.name}] GeoIP 查询失败，使用 XX`)
          }
          // ====================== GeoIP 查询结束 ======================
          validProxies.push({
            ...proxy,
            _country: country,   // 临时存国家，用于后续统一重命名
            _latency: latency,
          })
          if (cacheEnabled) {
            $.info(`[${proxy.name}] 设置成功缓存`)
            cache.set(id, { latency })
          }
        } else {
          if (cacheEnabled) {
            $.info(`[${proxy.name}] 设置失败缓存`)
            cache.set(id, {})
          }
          failedProxies.push(proxy)
        }
      } else {
        if (keepIncompatible) {
          validProxies.push(proxy)
        }
        incompatibleProxies.push(proxy)
      }
    } catch (e) {
      $.error(`[${proxy.name}] ${e.message ?? e}`)
      if (cacheEnabled) {
        $.info(`[${proxy.name}] 设置失败缓存`)
        cache.set(id, {})
      }
      failedProxies.push(proxy)
    }
  }

  // ======================http 请求函数======================
  async function http(opt = {}) {
    const METHOD = opt.method || 'get'
    const TIMEOUT = parseFloat(opt.timeout || $arguments.timeout || 5000)
    const RETRIES = parseFloat(opt.retries ?? $arguments.retries ?? 1)
    const RETRY_DELAY = parseFloat(opt.retry_delay ?? $arguments.retry_delay ?? 1000)

    let lastErr
    for (let i = 0; i <= RETRIES; i++) {
      try {
        return await new Promise((resolve, reject) => {
          $httpClient[METHOD]({
            ...opt,
            timeout: TIMEOUT
          }, (err, resp, body) => {
            if (err) {
              reject(err)
            } else {
              resolve({
                status: resp.statusCode || resp.status,
                statusCode: resp.statusCode || resp.status,
                body: body,
                headers: resp.headers
              })
            }
          })
        })
      } catch (e) {
        lastErr = e
        if (i < RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY))
        }
      }
    }
    throw lastErr
  }

  // ======================并发执行辅助函数======================
  async function executeAsyncTasks(tasks, { concurrency = 10 } = {}) {
    return new Promise((resolve) => {
      let index = 0
      const results = new Array(tasks.length)
      const running = new Set()

      const runTask = async () => {
        while (index < tasks.length) {
          const currentIndex = index++
          const task = tasks[currentIndex]
          running.add(currentIndex)
          try {
            results[currentIndex] = await task()
          } catch (e) {
            results[currentIndex] = null
          }
          running.delete(currentIndex)
        }
      }

      const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, runTask)
      Promise.all(workers).then(() => resolve(results))
    })
  }
}
