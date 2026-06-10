/******************************
GLaDOS Cookie 手动导入工具
用法：
  1. 把下方 domain 和 cookie 值改成你的
  2. 在 Egern 中运行此脚本
  3. 运行成功后删掉本文件（cookie 已写入持久存储）
*******************************/

var domain = "glados.network";    // ← 改成你抓包的域名
var cookie = "koa:sess=eyJ1c2VySWQiOjcyMTUyNiwiX2V4cGlyZSI6MTgwNjI0NjQ5MzYxNiwiX21heEFnZSI6MjU5MjAwMDAwMDB9; koa:sess.sig=Y0mHkYbuXwjcAkTf1BCZ9se92AM";  // ← 改成你的完整 cookie

// ========== 适配层 ==========
var isQX = typeof $task !== "undefined";
var isLoon = typeof $loon !== "undefined";
var isSurge = typeof $httpClient !== "undefined" && !isLoon;
var isEgern = !isQX && !isLoon && !isSurge;  // Egern 兼容 Surge API

var $store = {
  read: function (key) { return isQX ? $prefs.valueForKey(key) : $persistentStore.read(key); },
  write: function (val, key) { return isQX ? $prefs.setValueForKey(val, key) : $persistentStore.write(val, key); }
};

// ========== 主逻辑 ==========
var COOKIES_KEY_PREFIX = "GLaDOS_Cookies";
var DOMAINS_LIST_KEY = "GLaDOS_Domains";

function saveCookie(domain, cookieStr) {
  var key = COOKIES_KEY_PREFIX + ":" + domain;
  var raw = $store.read(key);
  var list = [];
  try { list = JSON.parse(raw) || []; } catch(e) { list = []; }
  if (!Array.isArray(list)) list = [];

  var idx = list.indexOf(cookieStr);
  if (idx !== -1) {
    console.log("⚠️ 该 Cookie 已存在，位置: #" + (idx + 1));
    return false;
  }

  list.push(cookieStr);
  $store.write(JSON.stringify(list), key);

  // 同时注册域名
  var domainsRaw = $store.read(DOMAINS_LIST_KEY);
  var domains = [];
  try { domains = JSON.parse(domainsRaw) || []; } catch(e) { domains = []; }
  if (!Array.isArray(domains)) domains = [];
  if (domains.indexOf(domain) === -1) {
    domains.push(domain);
    $store.write(JSON.stringify(domains), DOMAINS_LIST_KEY);
  }

  console.log("✅ Cookie 已保存到 " + key + "，账号 #" + list.length);
  return true;
}

console.log("🚀 GLaDOS Cookie 手动导入");
console.log("Domain : " + domain);
console.log("Cookie : " + (cookie ? cookie.substring(0, 60) + "..." : "空"));
console.log("------------------------------------");

if (!domain || !cookie) {
  console.log("❌ 请先设置 domain 和 cookie 变量");
  $done();
} else {
  saveCookie(domain, cookie);
  console.log("🎯 完成，现在可以运行 GLaDOS 签到脚本了");
  $done();
}
