// 2026/04/22 正确版 - 提取 callpin 而不是 token
/*
@Name：PingMe 参数抓取（Egern 适配）
@Author：Linsar
@Desc：从 URL 参数提取 callpin、sign、signDate，多账号
*/

const scriptName = 'PingMe';
const storeKey = 'pingme_accounts_v1';

const $ = new Env(scriptName);

console.log('\n=== ' + scriptName + ' 参数抓取开始 ===');

const req = $request || {};
const url = req.url || '';
console.log('请求 URL: ' + url.substring(0, 100) + '...');

const headers = req.headers || {};
let ua = headers['User-Agent'] || headers['user-agent'] || '';

console.log('User-Agent 长度: ' + ua.length);

// 从 URL 提取参数
function getParam(url, key) {
  const match = url.match(new RegExp('[?&]' + key + '=([^&]+)'));
  return match ? decodeURIComponent(match[1]) : '';
}

const callpin = getParam(url, 'callpin');
const sign = getParam(url, 'sign');
const signDate = getParam(url, 'signDate');
const email = getParam(url, 'email');

console.log('提取到 callpin: ' + (callpin ? '✅' : '❌'));
console.log('提取到 sign: ' + (sign ? '✅' : '❌'));
console.log('提取到 signDate: ' + (signDate ? '✅' : '❌'));
console.log('提取到 email: ' + (email ? '✅' : '❌'));

if (!callpin || !sign) {
  console.log('❌ 缺少必要参数 (callpin 或 sign)');
  $.done();
  return;
}

const account = {
  userId: email || 'unknown_' + Date.now(),
  callpin: callpin,
  sign: sign,
  signDate: signDate,
  ua: ua.substring(0, 300),
  url: url,
  time: new Date().toISOString()
};

let accounts = [];
const saved = $.getVal(storeKey);
if (saved) {
  try {
    const parsed = JSON.parse(saved);
    accounts = Array.isArray(parsed) ? parsed : [];
    console.log('已存在账号数量: ' + accounts.length);
  } catch (e) {
    console.log('旧数据解析失败，新建列表');
    accounts = [];
  }
} else {
  console.log('首次保存账号');
}

// 去重：如果 callpin 已存在则更新，否则新增
accounts = accounts.filter(function(acc) {
  return acc && acc.callpin !== account.callpin;
});
accounts.push(account);

// 写入存储
const writeSuccess = $.setVal(storeKey, JSON.stringify(accounts));

if (writeSuccess) {
  console.log('✅ 保存成功！当前总账号数量: ' + accounts.length);
  console.log('本次保存用户: ' + account.userId);
} else {
  console.log('❌ 保存失败！$persistentStore.write() 返回 false');
}

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
