/******************************
NewAPI 通用签到 - Header抓取脚本
更新时间：2026-04-20
作者：Linsar
*******************************/

const HEADER_KEY_PREFIX = "UniversalCheckin_Headers";
const HOSTS_LIST_KEY = "UniversalCheckin_HostsList";

const NEED_KEYS = [
  "Host", "User-Agent", "Accept", "Accept-Language",
  "Accept-Encoding", "Origin", "Referer", "Cookie", "new-api-user"
];

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch (_) { return null; }
}

function getArgument() {
  if (typeof $argument !== "undefined") return $argument;
  if (typeof $env !== "undefined" && $env._compat && $env._compat.$argument !== undefined) {
    return $env._compat.$argument;
  }
  return "";
}

function parseArgs(str = "") {
  const out = {};
  if (!str) return out;
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === "object" ? parsed : {};
  } catch (_) {
    for (const part of String(str).trim().split(/&|,/)) {
      const seg = part.trim();
      if (!seg) continue;
      const idx = seg.indexOf("=");
      if (idx === -1) {
        out[decodeURIComponent(seg)] = "";
      } else {
        out[decodeURIComponent(seg.slice(0, idx))] = decodeURIComponent(seg.slice(idx + 1));
      }
    }
    return out;
  }
}

function pickNeedHeaders(src = {}) {
  const dst = {}, lowerMap = {};
  for (const k of Object.keys(src || {})) lowerMap[String(k).toLowerCase()] = src[k];
  const get = (name) => src[name] ?? lowerMap[String(name).toLowerCase()];
  for (const k of NEED_KEYS) {
    const v = get(k);
    if (v !== undefined) dst[k] = v;
  }
  return dst;
}

function getHostFromRequest() {
  const h = ($request && $request.headers) || {};
  const host = h.Host || h.host;
  if (host) return String(host).trim();
  try {
    return new URL($request.url).hostname;
  } catch (_) { return ""; }
}

function headerKeyForHost(host) { return `${HEADER_KEY_PREFIX}:${host}`; }

function addHostToList(host) {
  try {
    const raw = $persistentStore.read(HOSTS_LIST_KEY);
    const hosts = safeJsonParse(raw) || [];
    if (!hosts.includes(host)) {
      hosts.push(host);
      $persistentStore.write(JSON.stringify(hosts), HOSTS_LIST_KEY);
      console.log("[NewAPI] 已添加站点:", host);
    }
  } catch (e) {
    console.log("[NewAPI] 添加站点失败:", e);
  }
}

function notifyTitleForHost(host) {
  if (host === "hotaruapi.com") return "HotaruAPI";
  if (host === "kfc-api.sxxe.net") return "KFC-API";
  try {
    let name = host.replace(/^www\./, "").split(".")[0];
    name = name.replace(/[-_]api$/i, "").replace(/[-_]service$/i, "").replace(/^api[-_]/i, "");
    return name.charAt(0).toUpperCase() + name.slice(1) || host;
  } catch (_) { return host; }
}

// 主逻辑
const args = parseArgs(getArgument());
const enableCapture = args.ENABLE_CAPTURE === true || args.ENABLE_CAPTURE === "true";

if (!enableCapture) {
  console.log("[NewAPI] 抓包已关闭，跳过处理");
  $done({});
  return;
}

const allHeaders = $request.headers || {};
const host = getHostFromRequest();
const picked = pickNeedHeaders(allHeaders);

if (!host || !picked.Cookie || !picked["new-api-user"]) {
  console.log("[NewAPI] 抓包失败: 缺少Cookie或new-api-user", JSON.stringify(allHeaders));
  $notification.post("NewAPI 通用签到", "抓包失败", "未获取到 Cookie 或 new-api-user");
  $done({});
  return;
}

const key = headerKeyForHost(host);
const ok = $persistentStore.write(JSON.stringify(picked), key);
if (ok) addHostToList(host);

const title = notifyTitleForHost(host);
console.log(`[NewAPI] ${title} | 参数保存 | 已保存 ${Object.keys(picked).length} 个字段`);

$notification.post(
  ok ? `${title} 参数获取成功` : `${title} 参数保存失败`,
  "",
  ok ? "后续将用于自动签到，请在配置中关闭抓取避免重复提示。" : "写入本地存储失败，请检查配置。"
);
$done({});
