let body = $response.body;
try {
  let obj = JSON.parse(body);
  if (obj && typeof obj === 'object') {
    obj.activated = true;
    obj.activationRequired = false;
    if (obj.authorizationExpiresAt === null || obj.authorizationExpiresAt === undefined) {
      // 授权有效期设到 2099 年；app 若要求毫秒时间戳，改成 4092595200000
      obj.authorizationExpiresAt = 4092595200000;  // 毫秒时间戳形式
    }
    $done({ body: JSON.stringify(obj) });
  } else {
    $done({});
  }
} catch (e) {
  // 非 JSON 或解析失败，原样放行
  $done({});
}
