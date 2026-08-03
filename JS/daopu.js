// 刀铺 App 激活绕过 v3 - 伪造完整激活成功响应
// 根据真实成功响应逆向：accessToken = base64url(payload).签名, device = SHA-256(deviceId)
// authorizationExpiresAt 必须是 10 位秒级时间戳（13位毫秒会导致 App 闪退）

// 纯 JS SHA-256（无外部依赖，Surge JavaScriptCore 环境可用）
function sha256(ascii) {
  function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
  var mathPow = Math.pow;
  var maxWord = mathPow(2, 32);
  var result = '';
  var words = [];
  var asciiBitLength = ascii.length * 8;
  var hash = sha256.h = sha256.h || [];
  var k = sha256.k = sha256.k || [];
  var primeCounter = k.length;
  var isComposite = {};
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (var i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';
  for (var i = 0; i < ascii.length; i++) {
    var j = ascii.charCodeAt(i);
    if (j >> 8) return;
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = ((asciiBitLength / maxWord) | 0);
  words[words.length] = (asciiBitLength);
  for (var j = 0; j < words.length;) {
    var w = words.slice(j, j += 16);
    var oldHash = hash.slice(0, 8);
    for (var i = 0; i < 64; i++) {
      var w15 = w[i - 15], w2 = w[i - 2];
      var a = hash[0], e = hash[4];
      var temp1 = hash[7]
        + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
        + ((e & hash[5]) ^ ((~e) & hash[6]))
        + k[i]
        + (w[i] = (i < 16) ? w[i] : (
            w[i - 16]
            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
            + w[i - 7]
            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
          ) | 0);
      var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
        + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (var i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (var i = 0; i < 8; i++) {
    for (var j = 3; j + 1; j--) {
      var b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? 0 : '') + b.toString(16);
    }
  }
  return result;
}

function b64url(str) {
  return $utils.base64Encode(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randHex(len) {
  var s = '';
  while (s.length < len) s += Math.random().toString(16).slice(2);
  return s.slice(0, len);
}

let body = $response.body;
try {
  let obj = JSON.parse(body);
  if (obj && typeof obj === 'object') {
    // 从请求 body 提取 deviceId
    let deviceId = '';
    try {
      let req = JSON.parse($request.body || '{}');
      deviceId = req.deviceId || '';
    } catch (e) {}

    let now = Math.floor(Date.now() / 1000);
    let expires = 1893456000; // 2030-01-01 00:00 UTC，秒级 10 位（32位安全范围）

    let payload = {
      device: sha256(deviceId),
      issued: now,
      expires: expires,
      cycle: '657ad0b0815e71c29be1206c3f7261b03f6341ff5dd1c1a180247ded76619a92',
      nonce: randHex(24),
      version: 2
    };

    obj.activated = true;
    obj.activationRequired = false;
    obj.accessToken = b64url(JSON.stringify(payload)) + '.wP2Ekzv1EhjBTPPvk77K47ORcVlHa_2E1gwwOwNpRhk';
    obj.authorizationExpiresAt = expires;
    obj.message = '激活成功';

    $done({ body: JSON.stringify(obj) });
  } else {
    $done({});
  }
} catch (e) {
  // 解析失败，原样放行
  $done({});
}
