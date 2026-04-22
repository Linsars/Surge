// 2026/04/22 Egern 最终稳定版 - PingMe CK 抓取（解决 UNHANDLED ERROR）
/*
@Name：PingMe Token 抓取（Egern 适配）
@Author：Linsar
@Desc：从 URL 参数提取 token，多账号，最大化防崩溃
*/

const scriptName = 'PingMe';
const storeKey = 'pingme_accounts_v1';

const $ = new Env(scriptName);

console.log('\n=== ' + scriptName + ' Token 抓取开始 ===');

const req = $request || {};
console.log('请求 URL: ' + (req.url || '无'));

const headers = req.headers || {};
console.log('请求头键名: ' + Object.keys(headers).join(', '));

let cookie = headers['Cookie'] || headers['cookie'] || headers['COOKIE'] || '';
let ua = headers['User-Agent'] || headers['user-agent'] || '';

console.log('Cookie 原始长度: ' + cookie.length);
console.log('User-Agent 长度: ' + ua.length);

let token = '';
let userId = '';

// 从 URL 提取 token（你的请求主要在这里）
if (req.url) {
  const tokenMatch = req.url.match(/token=([^&]+)/i);
  if (tokenMatch) {
    token = tokenMatch[1];
    console.log('从 URL 参数中提取到 token');
  }
}

// 提取用户标识
if (req.url) {
  const emailMatch = req.url.match(/email=([^&]+)/i);
  if (emailMatch) userId = decodeURIComponent(emailMatch[1]);
}

if (!token) {
  console.log('未找到 token');
  $.done();
}

console.log('提取成功！Token 长度: ' + token.length);
console.log('用户标识: ' + (userId || 'unknown'));

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
    console.log('已存在账号数量: ' + accounts.length);
  } catch (e) {
    console.log('旧数据解析失败，新建列表');
    accounts = [];
  }
} else {
  console.log('首次保存账号');
}

console.log('当前账号数量: ' + (accounts.length || 0));

accounts = accounts.filter(function(acc) {
  return acc && acc.userId !== account.userId;
});
accounts.push(account);

$.setVal(storeKey, JSON.stringify(accounts));

console.log('保存成功！当前总账号数量: ' + accounts.length);
console.log('本次保存用户: ' + account.userId);

$.done();

function Env(name) {
  const $ = {};
  $.name = name;
  $.log = function(msg) { console.log('[' + name + '] ' + msg); };

  $.getVal = function(key) {
    if (typeof $prefs !== "undefined") return $prefs.valueForKey(key);
    if (typeof $persistentStore !== "undefined") return $persistentStore.read(key);
    return null;
  };

  $.setVal = function(key, val) {
    if (typeof $prefs !== "undefined") return $prefs.setValueForKey(val, key);
    if (typeof $persistentStore !== "undefined") return $persistentStore.write(val, key);
    return false;
  };

  $.done = function(obj) {
    if (typeof $done !== "undefined") $done(obj || {});
  };

  return $;
}
