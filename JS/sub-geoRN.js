/**
 * 极简版：仅测落地 IP 并覆盖节点名
 * 失败/超时/非200 → 节点名改为 “未知”
 * 原脚本精简自 xream 的 geo.js
 */

async function operator(proxies = [], targetPlatform, context) {
  const $ = $substore;
  if (!proxies.length) return proxies;

  const format = $arguments.format || '{{api.country}} {{api.isp}} - {{proxy.name}}';
  const apiUrl = $arguments.api || 'http://ip-api.com/json?lang=zh-CN';
  const timeout = parseInt($arguments.timeout || 5000);
  const retries = parseInt($arguments.retries || 1);
  const retryDelay = parseInt($arguments.retry_delay || 1000);

  $.info(`开始测落地，共 ${proxies.length} 个节点 | format: ${format} | api: ${apiUrl}`);

  for (const proxy of proxies) {
    const originalName = proxy.name;
    try {
      const node = ProxyUtils.produce([proxy], 'Surge');  // 强制转 Surge 格式发请求
      if (!node) {
        proxy.name = '未知';
        $.error(`[${originalName}] produce 失败（协议不支持或转换错误）`);
        continue;
      }

      let success = false;
      let res;
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          res = await $.http.get({
            url: apiUrl,
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
            },
            'policy-descriptor': node,
            timeout: timeout
          });
          const status = res.status || res.statusCode || 0;
          if (status === 200) {
            success = true;
            break;
          }
          $.warn(`[${originalName}] 第 ${attempt} 次 status: ${status}`);
          if (attempt < retries) await $.wait(retryDelay);
        } catch (err) {
          $.warn(`[${originalName}] 第 ${attempt} 次请求异常: ${err.message || err}`);
          if (attempt < retries) await $.wait(retryDelay);
        }
      }

      if (!success) {
        proxy.name = '未知';
        $.error(`[${originalName}] 所有重试失败`);
        continue;
      }

      let apiData;
      try {
        apiData = JSON.parse(res.body);
      } catch (e) {
        proxy.name = '未知';
        $.error(`[${originalName}] JSON 解析失败: ${e}`);
        continue;
      }

      proxy.name = format.replace(/{{([^{}]+)}}/g, (_, key) => {
        const [obj, prop] = key.split('.');
        if (obj === 'api') return apiData[prop] ?? '';
        if (obj === 'proxy') return proxy[prop] ?? '';
        return '';
      });

      $.info(`[${originalName}] → [${proxy.name}] 成功`);

    } catch (e) {
      proxy.name = '未知';
      $.error(`[${originalName}] 整体异常: ${e.message || e}`);
    }
  }

  $.info('测落地覆盖节点名完成');
  return proxies;
}
