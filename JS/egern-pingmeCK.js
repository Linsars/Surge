// 2026/04/22 Egern 最终完整版 - PingMe CK 抓取（解决 Cookie 长度0 + UNHANDLED ERROR）
/*
@Name：PingMe Cookie/Token 抓取（Egern 适配）
@Author：Linsar
@Desc：从 Headers + URL 参数提取，多账号，强日志，防截断
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

// 从 URL 参数提取（你的 queryBalanceAndBonus 请求主要在这里）
if (!token && req.url) {
  const url = req.url;
  const tokenMatch = url.match(/token=([^&]+)/i);
  if (tokenMatch) {
    token = tokenMatch[1];
    $.log(`✅ 从 URL 参数中提取到 token`);
  }
}

// 其他参数
if (req.url) {
  const emailMatch = req.url.match(/email=([^&]+)/i);
  if (emailMatch) userId = decodeURIComponent(emailMatch[1]);
  const uidMatch = req.url.match(/userId=([^&]+)/i) || req.url.match(/uid=([^&]+)/i);
  if (uidMatch && !userId) userId = uidMatch[1];
}

if (!token) {
  $.log(`❌ 未找到 token`);
  $.log(`建议：1. 确认 MITM 已添加 api.pingmeapp.net`);
  $.log(`2. rewrite 规则加上 requires-body=1`);
  $.log(`3. 重新登录 App 并进入余额/首页触发请求`);
  $.log(`URL 参数预览: ${req.url && req.url.includes('?') ? req.url.split('?')[1].substring(0, 300) : '无'}`);
  $.done();
}

$.log(`✅ 提取成功！Token 长度: ${token.length}`);
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
