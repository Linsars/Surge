// 2026/04/22-1030
/*
@Name：PingMe Token 抓取
@Author：Linsar
@Desc：从 URL 参数 + Headers 中提取 token，多账号支持，强日志防截断
*/

const scriptName = 'PingMe';
const storeKey = 'pingme_accounts_v1';

const $ = new Env(scriptName);

$.log(`\n=== ${scriptName} Token 抓取开始 ===`);

const req = $request || {};
$.log(`请求 URL: ${req.url || '无URL'}`);

const headers = req.headers || {};
$.log(`请求头键名: ${Object.keys(headers).join(', ')}`);

let token = '';
let userId = '';

// 1. 从 Headers Cookie 尝试提取
let cookie = headers['Cookie'] || headers['cookie'] || headers['COOKIE'] || '';
if (cookie) {
  const tokenMatch = cookie.match(/token=([^;]+)/i);
  if (tokenMatch) {
    token = tokenMatch[1];
    $.log(`从 Cookie 中提取到 token`);
  }
}

// 2. 从 URL 查询参数中提取（你当前请求的主要方式）
if (!token && req.url) {
  const url = req.url;
  const tokenMatch = url.match(/token=([^&]+)/i);
  if (tokenMatch) {
    token = tokenMatch[1];
    $.log(`✅ 从 URL 参数中提取到 token`);
  }
}

// 3. 尝试其他可能参数（callpin、sign 等）
if (!token && req.url) {
  const callpinMatch = req.url.match(/callpin=([^&]+)/i);
  if (callpinMatch) $.log(`发现 callpin: ${callpinMatch[1]}`);
}

const emailMatch = req.url ? req.url.match(/email=([^&]+)/i) : null;
if (emailMatch) userId = decodeURIComponent(emailMatch[1]);

if (!token) {
  $.log(`❌ 未找到 token`);
  $.log(`URL 参数预览: ${req.url && req.url.includes('?') ? req.url.split('?')[1].substring(0, 400) : '无参数'}`);
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
    $.log(`已存在账号数量: ${accounts.length}`);
  } catch (e) {
    $.log(`旧数据解析失败，新建列表`);
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
