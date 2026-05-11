export default async function(ctx) {
  if (!ctx.env) ctx.env = {};
  const widgetFamily = ctx.widgetFamily || 'systemMedium';
  const BG_COLOR = { light: '#FFFFFF', dark: '#1C1C1E' };
  const C_TITLE = { light: '#1A1A1A', dark: '#FFD700' };
  const C_SUB = { light: '#666666', dark: '#B0B0B0' };
  const C_MAIN = { light: '#1A1A1A', dark: '#FFFFFF' };
  const C_GREEN = { light: '#32D74B', dark: '#32D74B' };
  const C_YELLOW = { light: '#FFD60A', dark: '#FFD60A' };
  const C_ORANGE = { light: '#FF9500', dark: '#FF9500' };
  const C_RED = { light: '#FF3B30', dark: '#FF3B30' };
  const C_ICON = { light: '#007AFF', dark: '#0A84FF' };

  if (['systemSmall', 'accessoryCircular', 'accessoryInline', 'accessoryRectangular'].includes(widgetFamily)) {
    return { type: 'widget', padding: 16, backgroundColor: BG_COLOR, children: [{ type: 'text', text: '请使用中号或大号组件', font: { size: 'callout' }, textColor: C_MAIN, textAlign: 'center' }] };
  }

  const policy = (ctx.env && ctx.env.POLICY) ? ctx.env.POLICY : "";
  const BASE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

  async function get(url, headers, timeout) {
    const opts = { timeout: timeout || 8000 };
    if (headers) opts.headers = headers;
    const res = await ctx.http.get(url, opts);
    return await res.text();
  }
  async function post(url, body, headers, timeout) {
    const opts = { timeout: timeout || 8000, body: body };
    if (headers) opts.headers = headers;
    const res = await ctx.http.post(url, opts);
    return await res.text();
  }
  async function getRaw(url, headers, extraOpts) {
    const opts = { timeout: 8000 };
    if (headers) opts.headers = headers;
    if (extraOpts) Object.assign(opts, extraOpts);
    return await ctx.http.get(url, opts);
  }
  function jp(s) { try { return JSON.parse(s); } catch (e) { return null; } }
  function ti(v) { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : null; }

  const fmtFlag = (code) => {
    if (!code || code.length !== 2 || code.toUpperCase() === 'XX') return "🌍";
    return String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
  };
  const fmtISP = (isp) => {
    if (!isp) return "未知";
    const s = String(isp).toLowerCase();
    if (/移动|mobile|cmcc/i.test(s)) return "中国移动";
    if (/电信|telecom|chinanet/i.test(s)) return "中国电信";
    if (/联通|unicom/i.test(s)) return "中国联通";
    if (/广电|broadcast|cbn/i.test(s)) return "中国广电";
    return isp;
  };

  async function checkChatGPT() {
    try {
      const traceTxt = await get("https://chatgpt.com/cdn-cgi/trace", null, 5000);
      const tm = traceTxt ? traceTxt.match(/loc=([A-Z]{2})/) : null;
      const loc = tm && tm[1] ? tm[1] : null;
      try {
        const apiRes = await getRaw("https://chatgpt.com/backend-api/models", { "User-Agent": BASE_UA, "Authorization": "Bearer " });
        if (apiRes && apiRes.status && apiRes.status !== 403) return loc || "OK";
      } catch (e) {}
      if (loc) return loc;
    } catch (e) {}
    try {
      const iosRes = await getRaw("https://ios.chat.openai.com", { "User-Agent": BASE_UA });
      const iosBody = iosRes ? await iosRes.text() : "";
      let cfDetails = "";
      try { cfDetails = jp(iosBody)?.cf_details || ""; } catch (e2) {}
      const appBlocked = !iosBody || iosBody.includes("blocked_why_headline") || iosBody.includes("unsupported_country_region_territory") || cfDetails.includes("(1)") || cfDetails.includes("(2)");
      if (appBlocked) return "Cross";
      return "APP";
    } catch (e) { return "Cross"; }
  }

  async function checkGemini() {
    try {
      const bodyRaw = 'f.req=[["K4WWud","[[0],[\\"en-US\\"]]",null,"generic"]]';
      const txt = await post('https://gemini.google.com/_/BardChatUi/data/batchexecute', bodyRaw, { "User-Agent": BASE_UA, "Accept-Language": "en-US", "Content-Type": "application/x-www-form-urlencoded" });
      if (!txt) return "Cross";
      let m = txt.match(/"countryCode"\s*:\s*"([A-Z]{2})"/i);
      if (m && m[1]) return m[1].toUpperCase();
      m = txt.match(/"requestCountry"\s*:\s*\{[^}]*"id"\s*:\s*"([A-Z]{2})"/i);
      if (m && m[1]) return m[1].toUpperCase();
      m = txt.match(/\[\[\\?"([A-Z]{2})\\?",\\?"S/);
      if (m && m[1]) return m[1].toUpperCase();
      if (txt.includes("Bard isn't currently supported")) return "Cross";
      return "OK";
    } catch (e) { return "Cross"; }
  }

  async function checkYouTube() {
    try {
      const body = await get('https://www.youtube.com/premium', { "User-Agent": BASE_UA, "Accept-Language": "en" });
      if (!body) return "Cross";
      if (body.includes('www.google.cn')) return "CN";
      const isNotAvailable = body.includes('Premium is not available in your country') || body.includes('YouTube Premium is not available');
      const m = body.match(/"contentRegion"\s*:\s*"?([A-Z]{2})"?/);
      const region = m && m[1] ? m[1].toUpperCase() : null;
      const isAvailable = body.includes('ad-free') || body.includes('Ad-free');
      if (isNotAvailable) return "Cross";
      if (isAvailable && region) return region;
      if (isAvailable && !region) return "OK";
      if (region) return region;
      return "Cross";
    } catch (e) { return "Cross"; }
  }

  async function checkNetflix() {
    try {
      const titles = ["https://www.netflix.com/title/81280792", "https://www.netflix.com/title/70143836"];
      const fetchTitle = async (url) => { try { return await get(url, { "User-Agent": BASE_UA }); } catch (e) { return ""; } };
      const bodies = await Promise.all([fetchTitle(titles[0]), fetchTitle(titles[1])]);
      const t1 = bodies[0], t2 = bodies[1];
      if (!t1 && !t2) return "Cross";
      const blocked1 = /oh no!/i.test(t1 || "") || /not available/i.test(t1 || "") || /Sorry/i.test(t1 || "");
      const blocked2 = /oh no!/i.test(t2 || "") || /not available/i.test(t2 || "") || /Sorry/i.test(t2 || "");
      if (blocked1 && blocked2) return "Popcorn";
      for (const b of [t1, t2]) {
        if (!b) continue;
        const rm = b.match(/"countryCode"\s*:\s*"?([A-Z]{2})"?/);
        if (rm && rm[1]) return rm[1];
      }
      return "OK";
    } catch (e) { return "Cross"; }
  }

  async function checkTikTok() {
    try {
      let body1 = await get("https://www.tiktok.com/", { "User-Agent": BASE_UA });
      if (body1 && body1.includes("Please wait...")) {
        try { body1 = await get("https://www.tiktok.com/explore", { "User-Agent": BASE_UA }); } catch (e2) {}
      }
      let m1 = body1 ? body1.match(/"region"\s*:\s*"([A-Z]{2})"/) : null;
      if (m1 && m1[1]) return m1[1];
      const body2 = await get("https://www.tiktok.com/", { "User-Agent": BASE_UA, "Accept-Language": "en" });
      const m2 = body2 ? body2.match(/"region"\s*:\s*"([A-Z]{2})"/) : null;
      if (m2 && m2[1]) return m2[1];
      if (body1 || body2) return "OK";
      return "Cross";
    } catch (e) { return "Cross"; }
  }

  // ── 本地 IP ──
  let lIp = "获取失败", lLoc = "未知位置", lIsp = "未知运营商";
  try {
    const lRes = await ctx.http.get('https://myip.ipip.net/json', { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
    const body = JSON.parse(await lRes.text());
    if (body?.data) {
      lIp = body.data.ip || "获取失败";
      const locArr = body.data.location || [];
      lLoc = `🇨🇳 ${locArr[1] || ""} ${locArr[2] || ""}`.trim() || "未知位置";
      lIsp = fmtISP(locArr[4] || locArr[3]);
    }
  } catch (e) {}
  if (lIp === "获取失败") {
    try {
      const res126 = await ctx.http.get('https://ipservice.ws.126.net/locate/api/getLocByIp', { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
      const body126 = JSON.parse(await res126.text());
      if (body126?.result) {
        lIp = body126.result.ip;
        lLoc = `🇨🇳 ${body126.result.province || ""} ${body126.result.city || ""}`.trim();
        lIsp = fmtISP(body126.result.operator || body126.result.company);
      }
    } catch (e) {}
  }

  // ── 落地 IP ──
  let nIp = "获取失败", nLoc = "未知位置", nativeText = "未知";
  let riskIPPureTxt = "低危 (0)", riskIPPureCol = C_GREEN, ippSev = 0;
  try {
    const res = await ctx.http.get('https://my.ippure.com/v1/info', { timeout: 8000 });
    const d = JSON.parse(await res.text());
    nIp = d.ip || "获取失败";
    let code = d.countryCode || "";
    if (code.toUpperCase() === 'TW') code = 'CN';
    nLoc = `${fmtFlag(code)} ${d.country || ""} ${d.city || ""}`.trim() || "未知位置";
    nativeText = d.isResidential === true ? "🏠 原生住宅" : (d.isResidential === false ? "🏢 商业机房" : "未知");
    const risk = ti(d.fraudScore);
    if (risk !== null) {
      if (risk >= 80) { riskIPPureTxt = `极高 (${risk})`; riskIPPureCol = C_RED; ippSev = 4; }
      else if (risk >= 70) { riskIPPureTxt = `高危 (${risk})`; riskIPPureCol = C_ORANGE; ippSev = 3; }
      else if (risk >= 40) { riskIPPureTxt = `中等 (${risk})`; riskIPPureCol = C_YELLOW; ippSev = 1; }
      else { riskIPPureTxt = `低危 (${risk})`; ippSev = 0; }
    }
  } catch (e) {}
  if (nIp === "获取失败") {
    try {
      const res2 = await ctx.http.get('https://api.ip.sb/geoip', { timeout: 8000 });
      const d2 = JSON.parse(await res2.text());
      if (d2 && d2.ip) {
        nIp = d2.ip;
        let code2 = d2.country_code || "";
        if (code2.toUpperCase() === 'TW') code2 = 'CN';
        nLoc = `${fmtFlag(code2)} ${d2.country || ""} ${d2.city || ""}`.trim();
        nativeText = "未知";
      }
    } catch (e) {}
  }

  // ── 8 源风险检测 ──
  let riskIpapiTxt = "低危 (0%)", riskIpapiCol = C_GREEN, apiSev = 0;
  let riskIP2LTxt = "低危", riskIP2LCol = C_GREEN, ip2lSev = 0;
  let riskDBIPTxt = "低危", riskDBIPCol = C_GREEN, dbipSev = 0;
  let riskIPRegTxt = "未查询", riskIPRegCol = C_SUB, ipregSev = 0;
  let riskScamTxt = "未查询", riskScamCol = C_SUB, scamSev = 0;
  let riskWhoisTxt = "未查询", riskWhoisCol = C_SUB, whoisSev = 0;
  let riskIpdTxt = "未查询", riskIpdCol = C_SUB, ipdSev = 0;

  const ipChecks = nIp !== "获取失败" ? await Promise.allSettled([
    ctx.http.get(`https://api.ipapi.is/?q=${nIp}`, { timeout: 8000 }).then(r => r.text()),
    ctx.http.get(`https://api.ip2location.io/?ip=${nIp}&key=free`, { timeout: 8000 }).then(r => r.text()),
    ctx.http.get(`https://api.db-ip.com/v2/free/${nIp}`, { timeout: 8000 }).then(r => r.text()),
    ctx.http.get(`https://api.ipregistry.co/${nIp}?key=${ctx.env.IPREGISTRY_KEY || 'tryout'}`, { timeout: 8000 }).then(r => r.text()),
    ctx.http.get(`https://api11.scamalytics.com/v3/${ctx.env.SCAMALYTICS_KEY || 'trial'}/?ip=${nIp}`, { timeout: 8000 }).then(r => r.text()),
    ctx.http.get(`https://ipwho.is/${nIp}`, { timeout: 8000 }).then(r => r.text()),
    ctx.http.get(`https://api.ipdata.is/v1/${nIp}?api-key=${ctx.env.IPDATA_KEY || 'free'}`, { timeout: 8000 }).then(r => r.text()),
  ]) : [];

  if (ipChecks[0]?.status === 'fulfilled') {
    const j = jp(ipChecks[0].value);
    if (j?.company?.abuser_score) {
      const m = String(j.company.abuser_score).match(/([0-9.]+)\s*\(([^)]+)\)/);
      if (m) {
        const pct = Math.round(Number(m[1]) * 10000) / 100 + '%';
        const lv = m[2].trim();
        riskIpapiTxt = `${lv} (${pct})`;
        riskIpapiCol = lv.includes('High') || lv.includes('Very High') ? C_ORANGE : (lv.includes('Elevated') ? C_YELLOW : C_GREEN);
        apiSev = lv.includes('High') || lv.includes('Very High') ? 3 : (lv.includes('Elevated') ? 2 : 0);
      }
    }
  }
  if (ipChecks[1]?.status === 'fulfilled') {
    const j = jp(ipChecks[1].value);
    if (j?.is_proxy !== undefined) {
      riskIP2LTxt = j.is_proxy ? "代理" : "正常";
      riskIP2LCol = j.is_proxy ? C_ORANGE : C_GREEN;
      ip2lSev = j.is_proxy ? 3 : 0;
    }
  }
  if (ipChecks[2]?.status === 'fulfilled') {
    const j = jp(ipChecks[2].value);
    if (j?.threatLevel) {
      const lv = j.threatLevel;
      riskDBIPTxt = lv === 'high' ? '高危' : lv === 'medium' ? '中等' : '低危';
      riskDBIPCol = lv === 'high' ? C_ORANGE : lv === 'medium' ? C_YELLOW : C_GREEN;
      dbipSev = lv === 'high' ? 3 : lv === 'medium' ? 2 : 0;
    }
  }
  if (ipChecks[3]?.status === 'fulfilled') {
    const j = jp(ipChecks[3].value);
    if (j?.security) {
      const isP = j.security.is_proxy || j.security.is_webproxy || j.security.is_tor;
      riskIPRegTxt = isP ? "代理" : "正常";
      riskIPRegCol = isP ? C_ORANGE : C_GREEN;
      ipregSev = isP ? 3 : 0;
    }
  }
  if (ipChecks[4]?.status === 'fulfilled') {
    const j = jp(ipChecks[4].value);
    if (j?.risk_score !== undefined) {
      const s = ti(j.risk_score);
      riskScamTxt = s !== null ? `${s}/100` : '未知';
      if (s !== null) {
        riskScamCol = s >= 70 ? C_ORANGE : s >= 40 ? C_YELLOW : C_GREEN;
        scamSev = s >= 70 ? 3 : s >= 40 ? 2 : 0;
      }
    }
  }
  if (ipChecks[5]?.status === 'fulfilled') {
    const j = jp(ipChecks[5].value);
    if (j?.security) {
      const isP = j.security.is_proxy || j.security.is_vpn || j.security.is_tor;
      riskWhoisTxt = isP ? "代理/VPN" : "正常";
      riskWhoisCol = isP ? C_ORANGE : C_GREEN;
      whoisSev = isP ? 3 : 0;
    }
  }
  if (ipChecks[6]?.status === 'fulfilled') {
    const j = jp(ipChecks[6].value);
    if (j?.threat?.is_threat !== undefined) {
      const isT = j.threat.is_threat;
      riskIpdTxt = isT ? "威胁" : "正常";
      riskIpdCol = isT ? C_RED : C_GREEN;
      ipdSev = isT ? 4 : 0;
    }
  }

  // ── 流媒体检测 ──
  const [gptStatus, geminiStatus, youtubeStatus, netflixStatus, tiktokStatus] = await Promise.all([
    checkChatGPT(), checkGemini(), checkYouTube(), checkNetflix(), checkTikTok()
  ]);

  // ── 汇总 ──
  const proxySuccess = nIp !== "获取失败";
  const policyOk = policy && policy !== "DIRECT" && proxySuccess && nIp !== lIp;
  const policyWarn = policy && policy !== "DIRECT" && (!proxySuccess || nIp === lIp);
  const getUnlockColor = (s) => (s === "Cross" || s === "CN") ? C_RED : C_GREEN;
  const getUnlockResult = (s) => s === "Cross" ? "不可用" : s === "CN" ? "CN" : s;

  let riskGrades = [];
  if (proxySuccess) {
    riskGrades.push({ sev: ippSev, t: `IPPure`, v: riskIPPureTxt, col: riskIPPureCol });
    riskGrades.push({ sev: apiSev, t: `ipapi`, v: riskIpapiTxt, col: riskIpapiCol });
    riskGrades.push({ sev: ip2lSev, t: `IP2Location`, v: riskIP2LTxt, col: riskIP2LCol });
    riskGrades.push({ sev: dbipSev, t: `DB-IP`, v: riskDBIPTxt, col: riskDBIPCol });
    riskGrades.push({ sev: ipregSev, t: `ipregistry`, v: riskIPRegTxt, col: riskIPRegCol });
    riskGrades.push({ sev: scamSev, t: `Scamalytics`, v: riskScamTxt, col: riskScamCol });
    riskGrades.push({ sev: whoisSev, t: `IPWhois`, v: riskWhoisTxt, col: riskWhoisCol });
    riskGrades.push({ sev: ipdSev, t: `ipdata`, v: riskIpdTxt, col: riskIpdCol });
  } else {
    riskGrades.push({ sev: 4, t: '获取失败', v: '', col: C_RED });
  }

  let maxSev = 0;
  riskGrades.forEach(g => { if (g.sev > maxSev) maxSev = g.sev; });

  const sevIcon = (s) => s >= 4 ? 'xmark.shield.fill' : s >= 3 ? 'exclamationmark.shield.fill' : s >= 1 ? 'exclamationmark.shield.fill' : 'checkmark.shield.fill';
  const sevText = (s) => s >= 4 ? '极高风险' : s >= 3 ? '高风险' : s >= 2 ? '中等风险' : s >= 1 ? '中低风险' : '纯净低危';
  const sevColor = (s) => s >= 4 ? C_RED : s >= 3 ? C_ORANGE : s >= 1 ? C_YELLOW : C_GREEN;

  const summaryIcon = sevIcon(maxSev);
  const summaryTxt = sevText(maxSev);
  const summaryCol = sevColor(maxSev);
  const FONT = 10;
  const ICON = 12;

  function Row(iconName, label, value, valueCol) {
    return {
      type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
      children: [
        { type: 'image', src: `sf-symbol:${iconName}`, color: C_ICON, width: ICON, height: ICON },
        { type: 'text', text: label, font: { size: FONT, weight: 'medium' }, textColor: C_MAIN, flex: 1 },
        { type: 'spacer' },
        { type: 'text', text: value, font: { size: FONT, weight: 'bold' }, textColor: valueCol || C_MAIN, maxLines: 1, minScale: 0.5, lineBreakMode: 'tail' }
      ]
    };
  }

  function UnlockRow(name, status) {
    const icon = (status === "Cross" || status === "CN") ? "xmark.circle.fill" : "checkmark.circle.fill";
    const col = getUnlockColor(status);
    return Row(icon, name, getUnlockResult(status), col);
  }

  function RiskRow(grade) {
    return Row(sevIcon(grade.sev), grade.t, grade.v, grade.col);
  }

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const isLarge = widgetFamily === 'systemLarge';
  const PAD = isLarge ? [10, 12] : [8, 10];
  const GAP = 2.5;
  const COL_GAP = 12;

  const header = {
    type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
    children: [
      { type: 'text', text: '数据中心(DCH)', font: { size: 13, weight: 'heavy' }, textColor: C_TITLE, flex: 1, maxLines: 1, minScale: 0.7 },
      { type: 'image', src: `sf-symbol:${summaryIcon}`, color: summaryCol, width: 12, height: 12 },
      { type: 'text', text: summaryTxt, font: { size: 10, weight: 'bold' }, textColor: summaryCol },
      { type: 'spacer' },
      ...(policy && policy !== "DIRECT" ? [
        { type: 'image', src: `sf-symbol:${policyOk ? 'checkmark.circle.fill' : (policyWarn ? 'exclamationmark.circle.fill' : 'questionmark.circle.fill')}`, color: policyOk ? C_GREEN : (policyWarn ? C_ORANGE : C_SUB), width: 10, height: 10 },
        { type: 'text', text: policy, font: { size: 10, weight: 'bold' }, textColor: policyOk ? C_GREEN : (policyWarn ? C_ORANGE : C_SUB) },
      ] : []),
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 3, children: [
        { type: 'image', src: 'sf-symbol:arrow.clockwise', color: C_SUB, width: 11, height: 11 },
        { type: 'text', text: timeStr, font: { size: 10 }, textColor: C_SUB }
      ]}
    ]
  };

  const ipInfo = {
    type: 'stack', direction: 'row', gap: COL_GAP,
    children: [
      { type: 'stack', direction: 'column', gap: GAP, flex: 1, children: [
        Row("house.fill", "本地IP", lIp, C_GREEN),
        Row("mappin.and.ellipse", "本地位置", lLoc),
        Row("simcard.fill", "本地运营商", lIsp),
      ]},
      { type: 'stack', direction: 'column', gap: GAP, flex: 1, children: [
        Row("network", "落地IP", nIp, proxySuccess ? C_GREEN : C_RED),
        Row("map.fill", "落地位置", nLoc, proxySuccess ? C_MAIN : C_RED),
        Row("building.2.fill", "原生属性", nativeText, proxySuccess ? C_MAIN : C_RED),
      ]}
    ]
  };

  const riskLeft = { type: 'stack', direction: 'column', gap: GAP, flex: 1,
    children: riskGrades.slice(0, 4).map(g => RiskRow(g))
  };
  const riskRight = { type: 'stack', direction: 'column', gap: GAP, flex: 1,
    children: riskGrades.slice(4, 8).map(g => RiskRow(g))
  };
  const riskSection = { type: 'stack', direction: 'row', gap: COL_GAP, children: [riskLeft, riskRight] };

  const unlockLeftCol = { type: 'stack', direction: 'column', gap: GAP, flex: 1, children: [
    UnlockRow("GPT", gptStatus), UnlockRow("Gemini", geminiStatus), UnlockRow("YouTube", youtubeStatus)
  ]};
  const unlockRightCol = { type: 'stack', direction: 'column', gap: GAP, flex: 1, children: [
    UnlockRow("奈飞", netflixStatus), UnlockRow("TikTok", tiktokStatus)
  ]};
  const unlockSection = { type: 'stack', direction: 'row', gap: COL_GAP, children: [unlockLeftCol, unlockRightCol] };

  const divider = { type: 'stack', height: 0.5, backgroundColor: { light: 'rgba(0,0,0,0.08)', dark: 'rgba(255,255,255,0.12)' } };

  const bottomLeft = { type: 'stack', direction: 'column', gap: GAP, flex: 1, children: [
    UnlockRow("GPT", gptStatus), UnlockRow("Gemini", geminiStatus), UnlockRow("YouTube", youtubeStatus),
    UnlockRow("奈飞", netflixStatus), UnlockRow("TikTok", tiktokStatus)
  ]};
  const bottomRight = { type: 'stack', direction: 'column', gap: GAP, flex: 1,
    children: riskGrades.map(g => RiskRow(g))
  };
  const bottomSection = { type: 'stack', direction: 'row', gap: COL_GAP, children: [bottomLeft, bottomRight] };

  let children;
  if (isLarge) {
    children = [header, ipInfo, divider, unlockSection, divider, riskSection];
  } else {
    children = [header, ipInfo, divider, bottomSection];
  }

  return { type: 'widget', padding: PAD, gap: 3, backgroundColor: BG_COLOR, children };
}
