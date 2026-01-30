async function operator(proxies = [], targetPlatform, context) {
  const $ = $substore;
  $.info("=== sub-geoRN.js 已启动 ===");
  $.info(`节点数量: ${proxies.length}`);
  $.info(`环境: Surge=${$.env.isSurge}, Loon=${$.env.isLoon}`);

  for (const proxy of proxies) {
    $.info(`处理节点: ${proxy.name} (${proxy.type || '未知类型'})`);

    // 强制改名测试
    proxy.name = proxy.name + " [测试]";

    try {
      const node = ProxyUtils.produce([proxy], 'Surge');  // 试产生 Surge 格式
      if (node) {
        $.info(`[${proxy.name}] produce 成功`);
      } else {
        $.info(`[${proxy.name}] produce 失败 → 可能是协议不兼容`);
        proxy.name = proxy.name + " [不兼容]";
      }
    } catch (e) {
      $.error(`[${proxy.name}] produce 异常: ${e}`);
      proxy.name = proxy.name + " [异常]";
    }

    // 简单 API 测试（不测真 IP，只看是否能发请求）
    try {
      const res = await $.http.get({ url: 'http://www.gstatic.com/generate_204', timeout: 3000 });
      $.info(`[${proxy.name}] 测试请求成功: status ${res.status || res.statusCode}`);
      proxy.name = proxy.name + " [可连]";
    } catch (e) {
      $.error(`[${proxy.name}] 测试请求失败: ${e}`);
      proxy.name = proxy.name + " [不可连]";
    }
  }

  $.info("=== sub-geoRN.js 执行结束 ===");
  return proxies;
}
