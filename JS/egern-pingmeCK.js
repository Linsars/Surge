// 2026/04/22 Egern 完整无截断版 - PingMe Token 抓取（适配 query 参数）
/*
@Name：PingMe Token 抓取（Egern 适配）
@Author：Linsar
@Desc：从 URL 参数或 Headers 中提取 token，多账号支持，强日志
*/

const scriptName = 'PingMe';
const storeKey = 'pingme_accounts_v1';

const $ = new Env(scriptName);

$.log(`\n=== ${scriptName} Token 抓取开始 ===`);

const req = $request || {};
$.log(`请求 URL: ${req.url || '无'}`);

const headers = req.headers || {};
$.log(`请求头键名: ${Object.keys(headers).join(', ')}`);

let token = '';
let userId = '';

// 1. 先尝试从 Headers Cookie 中找
let cookie = headers['Cookie'] || headers['cookie'] || headers['COOKIE'] || '';
if (cookie) {
  const tokenMatch = cookie.match(/token=([^;]+)/i);
  if (tokenMatch) token = tokenMatch[1];
}

// 2. 从 URL 查询参数中提取（这是你当前请求的主要方式）
if (!token) {
  const url = req.url || '';
  const tokenMatchUrl = url.match(/token=([^&]+)/i);
  if (tokenMatchUrl) {
    token = tokenMatchUrl[1];
    $.log(`✅ 从 URL 参数中提取到 token`);
  }
}

// 3. 从 URL 中提取其他可能参数（如 callpin 或 sign 相关）
if (!token) {
  const callpinMatch = req.url.match(/callpin=([^&]+)/i);
  if (callpinMatch) {
    $.log(`发现 callpin 参数: ${callpinMatch[1]}`);
    // 如果你的 token 就是 callpin，可以在这里赋值 token = callpinMatch[1];
  }
}

const userIdMatch = req.url.match(/email=([^&]+)/i) || req.url.match(/userId=([^&]+)/i);
if (userIdMatch) userId = decodeURIComponent(userIdMatch[1]);

if (!token) {
  $.log(`❌ 未找到 token`);
  $.log(`当前 URL 参数片段: ${req.url.split('?')[1] ? req.url.split('?')[1].substring(0, 300) : '无参数'}`);
  $.done();
}

$.log(`✅ 提取成功！`);
$.log(`用户标识: ${userId || 'unknown'}`);
$.log(`Token 长度: ${token.length}`);

const account = {
  userId: userId || 'unknown_' + Date.now(),
  token: token,
  ua: (headers['User-Agent'] || '').substring(0, 300),
  time: new Date().toISOString()
};

let accounts = [];
const saved = $.getVal(storeKey);
if (saved) {
  try {
    accounts = JSON.parse(saved);
  } catch (e) {
    accounts = [];
  }
}

accounts = accounts.filter(acc => acc.userId !== account.userId);
accounts.push(account);

$.setVal(storeKey, JSON.stringify(accounts));

$.log(`🎉 保存成功！当前总账号数量: ${accounts.length}`);
$.log(`本次保存用户: ${account.userId}`);

$.done();

function Env(name) {
  const $ = {};
  $.name = name;
  $.log = (msg) => console.log(`[${name}] ${msg}`);

  $.getVal = (key) => {
    if (typeof $prefs !== "undefined") return $prefs.valueForKey(key);
    if (typeof $persistentStore !== "undefined") return $persistentStore.read(key);
    return null;
  };

  $.setVal = (key, val) => {
    if (typeof $prefs !== "undefined") return $prefs.setValueForKey(val, key);
    if (typeof $persistentStore !== "undefined") return $persistentStore.write(val, key);
    return false;
  };

  $.done = (obj = {}) => {
    if (typeof $done !== "undefined") $done(obj);
  };

  return $;
}
