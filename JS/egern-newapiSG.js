/******************************
NewAPI 通用签到 -（已修复 CK 传递）
更新时间：2026-04-19
作者：Linsar
*******************************/

const HEADER_KEY_PREFIX = "UniversalCheckin_Headers";
const HOSTS_LIST_KEY = "UniversalCheckin_HostsList";
const isGetHeader = typeof $request !== "undefined";

const NEED_KEYS = ["Host","User-Agent","Accept","Accept-Language","Accept-Encoding","Origin","Referer","Cookie","new-api-user"];

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch (_) { return null; }
}

function getSavedHosts() {
  try {
    const raw = $persistentStore.read(HOSTS_LIST_KEY);
    console.log("[NewAPI] 读取已保存站点列表:", raw ? raw : "空");
    if (!raw) return [];
    const hosts = safeJsonParse(raw) || [];
    return Array.isArray(hosts) ? hosts.filter(h => typeof h === "string" && h) : [];
  } catch (e) {
    console.log("[NewAPI] 读取站点列表失败:", e);
    return [];
  }
}

function addHostToList(host) {
  try {
    const hosts = getSavedHosts();
    if (!hosts.includes(host)) {
      hosts.push(host);
      const ok = $persistentStore.write(JSON.stringify(hosts), HOSTS_LIST_KEY);
      console.log("[NewAPI] 已添加站点:", host, "写入结果:", ok);
    }
  } catch (e) {
    console.log("[NewAPI] 添加站点失败:", e);
  }
}

function pickNeedHeaders(src = {}) {
  const dst = {}, lowerMap = {};
  for (const k of Object.keys(src || {})) lowerMap[k.toLowerCase()] = src[k];
  const get = (name) => src[name] ?? lowerMap[name.toLowerCase()];
  for (const k of NEED_KEYS) {
    const v = get(k);
    if (v !== undefined) dst[k] = v;
  }
  return dst;
}

function headerKeyForHost(host) { return `${HEADER_KEY_PREFIX}:${host}`; }

function getHostFromRequest() {
  const h = $request?.headers || {};
  let host = h.Host || h.host;
  if (host) return String(host).trim();
  try { return new URL($request.url).hostname; } catch (_) { return ""; }
}

function getArgument() {
  if (typeof $argument !== "undefined") return $argument;
  if (typeof $env !== "undefined" && $env._compat && $env._compat.$argument !== undefined) {
    console.log("[NewAPI] 使用 Egern _compat.$argument");
    return $env._compat.$argument;
  }
  return "";
}

function parseArgs(str = "") {
  const out = {};
  if (!str) return out;
  for (const part of String(str).trim().split("&")) {
    const seg = part.trim();
    if (!seg) continue;
    const idx = seg.indexOf("=");
    if (idx === -1) out[decodeURIComponent(seg)] = "";
    else {
      const k = decodeURIComponent(seg.slice(0, idx));
      const v = decodeURIComponent(seg.slice(idx + 1));
      out[k] = v;
    }
  }
  return out;
}

function notifyTitleForHost(host) {
  if (host === "hotaruapi.com") return "HotaruAPI";
  if (host === "kfc-api.sxxe.net") return "KFC-API";
  try {
    let name = host.replace(/^www\./, "").split(".")[0];
    name = name.replace(/[-_]api$/i,"").replace(/[-_]service$/i,"").replace(/[-_]app$/i,"").replace(/^api[-_]/i,"");
    return name.charAt(0).toUpperCase() + name.slice(1) || host;
  } catch (_) { return host; }
}

if (isGetHeader) {
  const host = getHostFromRequest();
  const picked = pickNeedHeaders($request.headers || {});

  if (!host || !picked.Cookie || !picked["new-api-user"]) {
    $notification.post("通用签到", "抓包失败", "未获取到 Cookie 或 new-api-user");
    $done({});
  }

  const key = headerKeyForHost(host);
  const ok = $persistentStore.write(JSON.stringify(picked), key);
  if (ok) addHostToList(host);

  const title = notifyTitleForHost(host);
  console.log(`[NewAPI] ${title} | Cookie 已保存 |​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​
