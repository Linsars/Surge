/******************************
脚本功能：通用签到（NewAPI）- Egern 适配版
更新时间：2026-04-18
*******************************/

const HEADER_KEY_PREFIX = "UniversalCheckin_Headers";
const HOSTS_LIST_KEY = "UniversalCheckin_HostsList";
const isGetHeader = typeof $request !== "undefined";

const NEED_KEYS = [
  "Host", "User-Agent", "Accept", "Accept-Language", "Accept-Encoding",
  "Origin", "Referer", "Cookie", "new-api-user",
];

function safeJsonParse(str) {
  try { return JSON.parse(str); } catch (_) { return null; }
}

function getSavedHosts() {
  try {
    if (typeof $persistentStore === "undefined") return [];
    const raw = $persistentStore.read(HOSTS_LIST_KEY);
    if (!raw) return [];
    const hosts = safeJsonParse(raw) || [];
    return Array.isArray(hosts) ? hosts.filter(h => h && typeof h === "string") : [];
  } catch (e) {
    console.log("[NewAPI] Error reading saved hosts:", e);
    return [];
  }
}

function addHostToList(host) {
  try {
    if (typeof $persistentStore === "undefined") return;
    const hosts = getSavedHosts();
    if (!hosts.includes(host)) {
      hosts.push(host);
      $persistentStore.write(JSON.stringify(hosts), HOSTS_LIST_KEY);
      console.log("[NewAPI] Updated hosts list:", hosts.join(", "));
    }
  } catch (e) {
    console.log("[NewAPI] Error adding host to list:", e);
  }
}

function pickNeedHeaders(src = {}) {
  const dst = {};
  const lowerMap = {};
  for (const k of Object.keys(src || {})) lowerMap[String(k).toLowerCase()] = src[k];
  const get = (name) => src[name] ?? lowerMap[String(name).toLowerCase()];
  for (const k of NEED_KEYS) {
    const v = get(k);
    if (v !== undefined) dst[k] = v;
  }
  return dst;
}

function headerKeyForHost(host) {
  return `${HEADER_KEY_PREFIX}:${host}`;
}

function getHostFromRequest() {
  const h = ($request && $request.headers) || {};
  const host = h.Host || h.host;
  if (host) return String(host).trim();
  try {
    const u = new URL($request.url);
    return u.hostname;
  } catch (_) { return ""; }
}

function parseArgs(str) {
  const out = {};
  if (!str) return out;
  const s = String(str).trim();
  if (!s) return out;
  for (const part of s.split("&")) {
    const seg = part.trim();
    if (!seg) continue;
    const idx = seg.indexOf("=");
    if (idx === -1) {
      out[decodeURIComponent(seg)] = "";
    } else {
      const k = decodeURIComponent(seg.slice(0, idx));
      const v = decodeURIComponent(seg.slice(idx + 1));
      out[k] = v;
    }
  }
  return out;
}

function originFromHost(host) { return `https://${host}`; }
function refererFromHost(host) { return `https://${host}/console/personal`; }

function notifyTitleForHost(host) {
  if (host === "[hotaruapi.com](http://hotaruapi.com)") return "HotaruAPI";
  if (host === "[kfc-api.sxxe.net](http://kfc-api.sxxe.net)") return "KFC-API";
  try {
    let name = host.replace(/^www\./, "");
    const parts = name.split(".");
    name = parts.length > 1 ? parts[0] : parts[0];
    name = name
      .replace(/[-_]api$/i, "")
      .replace(/[-_]service$/i, "")
      .replace(/[-_]app$/i, "")
      .replace(/^api[-_]/i, "");
    name = name.charAt(0).toUpperCase() + name.slice(1);
    return name || host;
  } catch (_) { return host; }
}

if (isGetHeader) {
  const allHeaders = $request.headers || {};
  const host = getHostFromRequest();
  const picked = pickNeedHeaders(allHeaders);

  if (!host || !picked || !picked.Cookie || !picked["new-api-user"]) {
    console.log("[NewAPI] header capture failed:", JSON.stringify(allHeaders));
    $notification.post("通用签到", "未抓到关键信息", "请在触发 /api/user/self 请求时抓包（需要包含 Cookie 和 new-api-user）。");
    $done({});
  }

  const key = headerKeyForHost(host);
  const ok = $persistentStore.write(JSON.stringify(picked), key);
  if (ok) addHostToList(host);

  const title = notifyTitleForHost(host);
  console.log(`[NewAPI] ${title} | 参数保存 | 已保存 ${Object.keys(picked).length} 个字段`);

  $notification.post(
    ok ? `${title} 参数获取成功` : `${title} 参数保存失败`,
    "",
    ok ? "后续将用于自动签到。" : "写入本地存储失败，请检查 Egern 配置。"
  );
  $done({});
} else {
  const args = parseArgs(typeof $argument !== "undefined" ? $argument : "");
  const onlyHost = (args.host || args.hostname || "").trim();
  const hostsToRun = onlyHost ? [onlyHost] : getSavedHosts();

  if (!onlyHost && hostsToRun.length === 0) {
    console.log("[NewAPI] No saved hosts found. Please capture /api/user/self first.");
    $notification.post("通用签到", "无可用站点", "请先抓包保存至少一个站点的 /api/user/self 请求头。");
    $done();
  }

  const doCheckin = (host) => {
    const key = headerKeyForHost(host);
    const raw = $persistentStore.read(key);
    if (!raw) {
      $notification.post(notifyTitleForHost(host), "缺少参数", "请先抓包保存一次 /api/user/self 的请求头。");
      return Promise.resolve();
    }

    const savedHeaders = safeJsonParse(raw);
    if (!savedHeaders) {
      $notification.post(notifyTitleForHost(host), "参数异常", "已保存的请求头解析失败，请重新抓包保存。");
      return Promise.resolve();
    }

    const url = `https://${host}/api/user/checkin`;

    const headers = {
      Host: savedHeaders.Host || host,
      Accept: savedHeaders.Accept || "application/json, text/plain, */*",
      "Accept-Language": savedHeaders["Accept-Language"] || "zh-CN,zh-Hans;q=0.9",
      "Accept-Encoding": savedHeaders["Accept-Encoding"] || "gzip, deflate, br",
      Origin: savedHeaders.Origin || originFromHost(host),
      Referer: savedHeaders.Referer || refererFromHost(host),
      "User-Agent": savedHeaders["User-Agent"] || "Egern",
      Cookie: savedHeaders.Cookie || "",
      "new-api-user": savedHeaders["new-api-user"] || "",
    };

    const myRequest = { url, headers, body: "" };

    return new Promise((resolve) => {
      $httpClient.post(myRequest, (error, response, body) => {
        if (error) {
          const err = String(error || "");
          const title = notifyTitleForHost(host);
          console.log(`[NewAPI] ${title} | 网络错误 | ${err}`);
          $notification.post(title, "网络错误", err);
          resolve();
          return;
        }

        const status = response ? response.statusCode : 0;
        const bodyStr = body || "";
        const obj = safeJsonParse(bodyStr) || {};
        const success = Boolean(obj.success);
        const message = obj.message ? String(obj.message) : "";
        const checkinDate = obj?.data?.checkin_date ? String(obj.data.checkin_date) : "";
        const quotaAwarded = obj?.data?.quota_awarded !== undefined ? String(obj.data.quota_awarded) : "";

        const title = notifyTitleForHost(host);
        const statusText = success ? "✓成功" : status >= 200 && status < 300 ? "✗失败" : `✗异常(${status})`;
        console.log(`[NewAPI] ${title} | ${statusText} | ${checkinDate ? `${checkinDate}` : ""}${quotaAwarded ? ` | 获得:${quotaAwarded}` : ""}${message ? ` | ${message}` : ""}`.trim());

        if (status === 401 || status === 403) {
          $notification.post(title, "登录失效", `HTTP ${status}，请重新抓包保存 Cookie。\n${message || bodyStr}`);
        } else if (status >= 200 && status < 300) {
          if (success) {
            const content = `${checkinDate ? `日期：${checkinDate}\n` : ""}${quotaAwarded ? `获得：${quotaAwarded}` : "签到成功"}`;
            $notification.post(title, "签到成功", content);
          } else {
            $notification.post(title, "签到失败", message || bodyStr || `HTTP ${status}`);
          }
        } else {
          $notification.post(title, `接口异常 ${status}`, message || bodyStr);
        }
        resolve();
      });
    });
  };

  (async () => {
    for (const h of hostsToRun) {
      await doCheckin(h);
    }
    $done();
  })();
}
