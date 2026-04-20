/******************************
NewAPI 通用签到 - 小组件版
更新时间：2026-04-20
作者：Linsar
说明：支持多站点签到状态展示，systemMedium尺寸最佳
*******************************/

export default async function (ctx) {
  // 配色方案
  const BG_COLOR = { light: '#FFFFFF', dark: '#1C1C1E' };
  const C_TITLE = { light: '#1A1A1A', dark: '#FFD700' };
  const C_SUB = { light: '#666666', dark: '#B0B0B0' };
  const C_MAIN = { light: '#1A1A1A', dark: '#FFFFFF' };
  const C_GREEN = { light: '#32D74B', dark: '#32D74B' };
  const C_YELLOW = { light: '#FFD60A', dark: '#FFD60A' };
  const C_RED = { light: '#FF3B30', dark: '#FF3B30' };
  const C_BLUE = { light: '#007AFF', dark: '#0A84FF' };

  const HEADER_KEY_PREFIX = "UniversalCheckin_Headers";
  const HOSTS_LIST_KEY = "UniversalCheckin_HostsList";

  // 工具函数
  function safeJsonParse(str) {
    try { return JSON.parse(str); } catch (_) { return null; }
  }

  function getSavedHosts() {
    try {
      const raw = ctx.env.get(HOSTS_LIST_KEY);
      if (!raw) return [];
      const hosts = safeJsonParse(raw) || [];
      return Array.isArray(hosts) ? hosts.filter(h => h && typeof h === "string") : [];
    } catch (e) {
      return [];
    }
  }

  function headerKeyForHost(h) {
    return `${HEADER_KEY_PREFIX}:${h}`;
  }

  function notifyTitleForHost(host) {
    if (host === "hotaruapi.com") return "Hotaru";
    if (host === "kfc-api.sxxe.net") return "KFC";
    try {
      let name = host.replace(/^www\./, "").split(".")[0];
      name = name.replace(/[-_]api$/i, "").replace(/[-_]service$/i, "").replace(/^api[-_]/i, "");
      return name.charAt(0).toUpperCase() + name.slice(1) || host;
    } catch (_) { return host; }
  }

  async function doCheckin(host) {
    const key = headerKeyForHost(host);
    const raw = ctx.env.get(key);

    if (!raw) {
      return { host, title: notifyTitleForHost(host), success: false, msg: "未配置" };
    }

    const savedHeaders = safeJsonParse(raw);
    if (!savedHeaders) {
      return { host, title: notifyTitleForHost(host), success: false, msg: "配置错误" };
    }

    const url = `https://${host}/api/user/checkin`;
    const headers = {
      "Host": savedHeaders.Host || host,
      "User-Agent": savedHeaders["User-Agent"] || "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "zh-CN,zh-Hans;q=0.9",
      "Origin": `https://${host}`,
      "Referer": `https://${host}/console/personal`,
      "Cookie": savedHeaders.Cookie || "",
      "new-api-user": savedHeaders["new-api-user"] || ""
    };

    try {
      const res = await ctx.http.post(url, { headers, body: "", timeout: 15000 });
      const body = await res.text();
      const status = res.status;
      const obj = safeJsonParse(body) || {};

      const success = Boolean(obj.success);
      const message = obj.message ? String(obj.message) : "";
      const checkinDate = obj?.data?.checkin_date || "";
      const quotaAwarded = obj?.data?.quota_awarded !== undefined ? String(obj.data.quota_awarded) : "";

      if (status === 401 || status === 403) {
        return { host, title: notifyTitleForHost(host), success: false, msg: "登录失效", detail: message };
      }

      if (success) {
        const display = quotaAwarded ? `+${quotaAwarded}` : "成功";
        return { 
          host, 
          title: notifyTitleForHost(host), 
          success: true, 
          msg: display, 
          date: checkinDate,
          detail: message
        };
      }

      // 可能是已签到或其他失败
      const isAlready = /已签到|already|重复|duplicate/i.test(message);
      return { 
        host, 
        title: notifyTitleForHost(host), 
        success: isAlready, 
        msg: isAlready ? "已签" : "失败", 
        detail: message || body
      };

    } catch (err) {
      return { host, title: notifyTitleForHost(host), success: false, msg: "网络错误", detail: String(err) };
    }
  }

  // 获取站点列表并执行签到
  const hosts = getSavedHosts();
  
  // 如果没有配置站点，显示提示
  if (hosts.length === 0) {
    return {
      type: 'widget',
      padding: 16,
      backgroundColor: BG_COLOR,
      children: [
        {
          type: 'text',
          text: 'NewAPI 签到',
          font: { size: 16, weight: 'bold' },
          textColor: C_TITLE
        },
        {
          type: 'text',
          text: '未配置站点',
          font: { size: 13 },
          textColor: C_SUB
        },
        {
          type: 'text',
          text: '请在脚本中获取Cookie并保存',
          font: { size: 12 },
          textColor: C_SUB
        }
      ]
    };
  }

  // 检查是否需要执行签到（通过点击触发）
  const action = ctx.env.ACTION || "";
  const results = [];
  
  if (action === "checkin") {
    // 执行签到
    for (const h of hosts) {
      const result = await doCheckin(h);
      results.push(result);
    }
    // 保存结果到缓存
    ctx.env.set("LAST_CHECKIN_RESULT", JSON.stringify(results));
    ctx.env.set("LAST_CHECKIN_TIME", new Date().toISOString());
  } else {
    // 读取缓存结果
    const cached = ctx.env.get("LAST_CHECKIN_RESULT");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          results.push(...parsed);
        }
      } catch (_) {}
    }
    // 如果没有缓存，显示状态未知
    if (results.length === 0) {
      for (const h of hosts) {
        results.push({ host: h, title: notifyTitleForHost(h), success: null, msg: "待签到" });
      }
    }
  }

  const lastTime = ctx.env.get("LAST_CHECKIN_TIME") || "";
  const timeStr = lastTime ? new Date(lastTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : "";

  // 构建站点行
  const siteRows = results.map(r => {
    const color = r.success === true ? C_GREEN : (r.success === false ? C_RED : C_YELLOW);
    const statusText = r.msg || (r.success ? "成功" : "失败");
    
    return {
      type: 'stack',
      direction: 'row',
      alignItems: 'center',
      gap: 8,
      children: [
        {
          type: 'text',
          text: r.title,
          font: { size: 13, weight: 'medium' },
          textColor: C_MAIN,
          width: 80
        },
        {
          type: 'text',
          text: statusText,
          font: { size: 13, weight: 'bold' },
          textColor: color
        },
        { type: 'spacer' },
        {
          type: 'text',
          text: r.date || '',
          font: { size: 11 },
          textColor: C_SUB
        }
      ]
    };
  });

  // 根据小组件尺寸返回不同布局
  const family = ctx.widgetFamily || 'systemMedium';

  if (family === 'systemSmall') {
    // 小尺寸：只显示汇总
    const successCount = results.filter(r => r.success === true).length;
    const total = results.length;
    
    return {
      type: 'widget',
      padding: 12,
      backgroundColor: BG_COLOR,
      children: [
        {
          type: 'text',
          text: 'NewAPI',
          font: { size: 14, weight: 'bold' },
          textColor: C_TITLE
        },
        {
          type: 'text',
          text: `${successCount}/${total}`,
          font: { size: 24, weight: 'heavy' },
          textColor: successCount === total ? C_GREEN : C_YELLOW
        },
        {
          type: 'text',
          text: timeStr || '未签到',
          font: { size: 11 },
          textColor: C_SUB
        }
      ]
    };
  }

  // Medium / Large 尺寸
  const maxDisplay = family === 'systemMedium' ? 3 : 6;
  const displayRows = siteRows.slice(0, maxDisplay);
  const hasMore = siteRows.length > maxDisplay;

  const widgetChildren = [
    {
      type: 'stack',
      direction: 'row',
      alignItems: 'center',
      gap: 6,
      children: [
        { type: 'image', src: 'sf-symbol:checkmark.circle.fill', color: C_GREEN, width: 16, height: 16 },
        { type: 'text', text: 'NewAPI 签到', font: { size: 14, weight: 'bold' }, textColor: C_TITLE },
        { type: 'spacer' },
        { type: 'text', text: timeStr, font: { size: 11 }, textColor: C_SUB }
      ]
    }
  ];

  if (action === "checkin") {
    widgetChildren.push({
      type: 'text',
      text: '刚刚完成签到',
      font: { size: 12 },
      textColor: C_BLUE
    });
  }

  widgetChildren.push(...displayRows);

  if (hasMore) {
    widgetChildren.push({
      type: 'text',
      text: `还有 ${siteRows.length - maxDisplay} 个站点...`,
      font: { size: 11 },
      textColor: C_SUB
    });
  }

  // 点击交互提示
  widgetChildren.push({
    type: 'text',
    text: '点击执行签到 →',
    font: { size: 11 },
    textColor: C_BLUE
  });

  return {
    type: 'widget',
    padding: family === 'systemLarge' ? 16 : 12,
    gap: family === 'systemLarge' ? 8 : 6,
    backgroundColor: BG_COLOR,
    children: widgetChildren,
    // 点击时触发action
    onTap: { action: 'checkin' }
  };
}
