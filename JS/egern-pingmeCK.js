// 2026/04/22 Egern 最终修复版 - PingMe CK 抓取（解决 undefined 报错）
/*
@Name：PingMe Cookie/Token 抓取（Egern 适配）
@Author：Linsar
@Desc：从 URL 参数提取 token，多账号，防崩溃强日志
*/

const scriptName = 'PingMe';
const storeKey = 'pingme_accounts_v1';

const $ = new Env(scriptName);

$.log(`\n=== ${scriptName} Cookie/Token 抓取开始 ===`);

const req = $request || {};
$.log(`请求 URL: ${req.url || '无'}`);

const headers = req.headers || {};
$.log(`请求头键名: ${Object.keys(headers).join(', ')}`);

let cookie = headers['Cookie'] || headers['cookie'] || headers['COOKIE'] || '';
let ua = headers['User-Agent'] || headers['user-agent'] || '';

$.log(`Cookie 原始长度: ${cookie.length}`);
$.log(`User-Agent 长度: ${ua.length}`);

let token = '';
let userId = '';

// 从 Cookie 提取
if (cookie) {
  const tokenMatch = cookie.match(/token=([^;]+)/i);
  if (tokenMatch) token = tokenMatch[1];
}

// 从 URL 参数提取
if (!token && req.url) {
  const url = req.url;
  const tokenMatch = url.match(/token=([^&]+)/i);
  if (tokenMatch) {
    token = tokenMatch[1];
    $.log(`从 URL 参数中提取到 token`);
  }
}

// 提取用户标识
if (req.url) {
  const emailMatch = req.url.match(/email=([^&]+)/i);
  if (emailMatch) userId = decodeURIComponent(emailMatch[1]);
  const uidMatch = req.url.match(/userId=([^&]+)/i) || req.url.match(/uid=([^&]+)/i);
  if (uidMatch && !userId) userId = uidMatch[1];
}

if (!token) {
  $.log(`未找到 token`);
  $.log(`建议检查 MITM 和 rewrite 规则`);
  $.done();
}

$.log(`提取成功！Token 长度: ${token.length}`);
$.log(`用户标识: ${userId || 'unknown'}`);

const account = {
  userId: userId || 'unknown_' + Date.now(),
  token: token,
  ua: ua.substring(0, 300),
  time: new Date().toISOString()
};

let accounts = [];
const saved = $.getVal(storeKey);
if (saved) {
  try {
    accounts = JSON.parse(saved);
  } catch (e) {
    $.log(`旧数据解析失败，新建列表`);
    accounts = [];
  }
} else {
  $.log(`首次保存账号`);
}

$.log(`当前账号数量: ${accounts.length || 0}`);

accounts = accounts.filter(acc => acc && acc.userId !== account.userId);
accounts.push(account);

$.setVal(storeKey, JSON.stringify(accounts));

$.log(`保存成功！当前总账号数量: ${accounts.length}`);
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
