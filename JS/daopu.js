let body = $response.body;
try {
  let obj = JSON.parse(body);
  if (obj && typeof obj === 'object') {
    obj.activated = true;
    obj.activationRequired = false;
    // authorizationExpiresAt 保持服务器原值(null)不动！
    // 实测：改成 ISO 字符串 → App 报"数据格式不正确"；改成数字 → 闪退
    $done({ body: JSON.stringify(obj) });
  } else {
    $done({});
  }
} catch (e) {
  // 非 JSON 或解析失败，原样放行
  $done({});
}
