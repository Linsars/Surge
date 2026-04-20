/******************************
NewAPI 通用签到 - 定时执行脚本
更新时间：2026-04-20
作者：Linsar
*******************************/

// ============================================
// 工具函数
// ============================================
function safeJsonParse(str) {
  try { return JSON.parse(str); } catch (_) { return null; }
}

function parseArgs(str) {
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

function headerKeyForHost(h) {
  return `UniversalCheckin_Headers:${h}`;
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

function originFromHost(host) {
  return `https://${host}`;
}

function refererFromHost(host) {
  return `https://${host}/console/personal`;
}

// ============================================
// 获取保存的站点列表
// ============================================
function getSavedHosts() {
  try {
    const raw = $persistentStore.read("UniversalCheckin_HostsList");
    if (!raw) return [];
    const hosts = safeJsonParse(raw) || [];
    return Array.isArray(hosts) ? hosts.filter(h => h && typeof h === "string") : [];
  } catch (e) {
    console.log("[NewAPI] 获取站点列表失败:", e);
    return [];
  }
}

// ============================================
// 单站点签到
// ============================================
function doCheckin(host) {
  const key = headerKeyForHost(host);
  const raw = $persistentStore.read(key);

  if (!raw) {
    $notification.post(notifyTitleForHost(host), "❌ 缺少参数", "请先抓包保存一次 /api/user/self 的请求头");
    return Promise.resolve({ success: false, host, msg: "缺少参数" });
  }

  const savedHeaders = safeJsonParse(raw);
  if (!savedHeaders) {
    $notification.post(notifyTitleForHost(host), "❌ 参数异常", "已保存的请求头解析失败，请重新抓包");
    return Promise.resolve({ success: false, host, msg: "参数异常" });
  }

  const url = `https://${host}/api/user/checkin`;
  const headers = {
    "Host": savedHeaders.Host || host,
    "User-Agent": savedHeaders["User-Agent"] || "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    "Accept": savedHeaders.Accept || "application/json, text/plain, */*",
    "Accept-Language": savedHeaders["Accept-Language"] || "zh-CN,zh-Hans;q=0.9",
    "Accept-Encoding": savedHeaders["Accept-Encoding"] || "gzip, deflate, br",
    "Origin": savedHeaders.Origin || originFromHost(host),
    "Referer": savedHeaders.Referer || refererFromHost(host),
    "Cookie": savedHeaders.Cookie || "",
    "new-api-user": savedHeaders["new-api-user"] || ""
  };

  return new Promise((resolve) => {
    const startTime = new Date().getTime();
    $httpClient.post({ url, headers, body: "" }, (err, resp, body) => {
      const latency = new Date().getTime() - startTime;
      const title = notifyTitleForHost(host);
      
      if (err) {
        console.log(`[NewAPI] ${title} | ❌ 网络错误 | ${err}`);
        $notification.post(title, "❌ 网络错误", String(err));
        resolve({ success: false, host, msg: `网络错误: ${err}` });
        return;
      }

      const status = resp?.status || 0;
      const bodyStr = body || "";
      console.log(`[NewAPI] ${title} | HTTP ${status} | ${latency}ms`);

      const obj = safeJsonParse(bodyStr) || {};
      const success = Boolean(obj.success);
      const message = obj.message ? String(obj.message) : "";
      const checkinDate = obj?.data?.checkin_date ? String(obj.data.checkin_date) : "";
      const quotaAwarded = obj?.data?.quota_awarded !== undefined ? String(obj.data.quota_awarded) : "";

      // 登录失效
      if (status === 401 || status === 403) {
        $notification.post(title, "❌ 登录失效", `HTTP ${status}，请重新抓包保存 Cookie`);
        resolve({ success: false, host, msg: "登录失效" });
        return;
      }

      // 签到成功
      if (success) {
        const content = `${checkinDate ? `日期：${checkinDate}\n` : ""}${quotaAwarded ? `获得：${quotaAwarded}` : "签到成功"}`;
        console.log(`[NewAPI] ${title} | ✅ 签到成功 | ${content.replace(/\n/g, " | ")}`);
        $notification.post(title, "✅ 签到成功", content);
        resolve({ success: true, host, msg: "签到成功", data: { date: checkinDate, quota: quotaAwarded } });
        return;
      }

      // 失败/已签到/其他
      console.log(`[NewAPI] ${title} | ❌ 签到失败 | ${message || bodyStr}`);
      $notification.post(title, "⚠️ 签到结果", message || "未知响应");
      resolve({ success: false, host, msg: message || "签到失败" });
    });
  });
}

// ============================================
// 主入口
// ============================================
const args = parseArgs(typeof $argument !== "undefined" ? $argument : "");
const onlyHost = (args.host || "").trim();
const hostsToRun = onlyHost ? [onlyHost] : getSavedHosts();

if (!onlyHost && hostsToRun.length === 0) {
  $notification.post("NewAPI 通用签到", "❌ 无可用站点", "请先抓包保存至少一个站点的 /api/user/self 请求头");
  $done();
} else {
  (async () => {
    console.log(`[NewAPI] 开始签到，共 ${hostsToRun.length} 个站点`);
    
    for (const h of hostsToRun) {
      await doCheckin(h);
    }
    
    console.log("[NewAPI] 全部签到完成");
    $done();
  })();
}
