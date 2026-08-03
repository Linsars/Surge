let body = $response.body;
try {
  let obj = JSON.parse(body);
  if (obj && typeof obj === 'object') {
    obj.activated = true;
    obj.activationRequired = false;
    if (obj.authorizationExpiresAt === null || obj.authorizationExpiresAt === undefined) {
      // 必须用 ISO 字符串：实测数字(毫秒时间戳)会导致 App 闪退
      obj.authorizationExpiresAt = '2099-12-31T15:59:59Z';
    }
    $done({ body: JSON.stringify(obj) });
  } else {
    $done({});
  }
} catch (e) {
  // 非 JSON 或解析失败，原样放行
  $done({});
}
