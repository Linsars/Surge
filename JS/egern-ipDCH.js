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

  const policy = String((ctx.env && ctx.env.POLICY) ? ctx.env.POLICY : "").trim();
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

  async function checkChatGPT() {
    try {
      const traceTxt = await get("https://chatgpt.com/cdn-cgi/trace", null, 5000);
      const tm = traceTxt ? traceTxt.match(/loc=([A-Z]{2})/) : null;
      if (tm && tm[1]) {
        try {
          const apiRes = await getRaw("https://chatgpt.com/backend-api/models", { "User-Agent": BASE_UA, "Authorization": "Bearer " });
          if (apiRes && apiRes.status && apiRes.status !== 403) return tm[1];
        } catch (e) {}
        return tm[1];
      }
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
      const allBodies = [t1, t2];
      for (let b of allBodies) {
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

  async function checkClaude() {
    const restricted = { CN: true, HK: true, MO: true, RU: true, KP: true, IR: true, SY: true, CU: true, BY: true, VE: true };
    try {
      const traceTxt = await get("https://claude.ai/cdn-cgi/trace", { "User-Agent": BASE_UA }, 6000);
      const ipMatch = traceTxt ? traceTxt.match(/(?:^|\n)ip=([^\n]+)/) : null;
      const locMatch = traceTxt ? traceTxt.match(/(?:^|\n)loc=([A-Z]{2})/) : null;
      const cIp = ipMatch && ipMatch[1] ? ipMatch[1].trim() : "";
      const cc = locMatch && locMatch[1] ? locMatch[1].toUpperCase() : "";
      if (cc && restricted[cc]) return "受限";
      if (cIp) {
        try {
          const riskTxt = await get(`https://ip.net.coffee/api/iprisk/${encodeURIComponent(cIp)}`, null, 4000);
          const r = JSON.parse(riskTxt);
          const score = ti(r && r.trust_score);
          if (score !== null && score < 50) return "风险";
        } catch (e2) {}
      }
      return cc || "OK";
    } catch (e) { return "Cross"; }
  }

  const fmtISP = (isp) => {
    if (!isp) return "未知";
    const s = String(isp).toLowerCase();
    if (/移动|mobile|cmcc/i.test(s)) return "中国移动";
    if (/电信|telecom|chinanet/i.test(s)) return "中国电信";
    if (/联通|unicom/i.test(s)) return "中国联通";
    if (/广电|broadcast|cbn/i.test(s)) return "中国广电";
    return isp;
  };

  const fmtFlag = (code) => {
    if (!code || code.length !== 2 || code.toUpperCase() === 'XX') return "🌍";
    return String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
  };

  function hasCjk(s) { return /[\u4e00-\u9fff]/.test(String(s || "")); }
  function cnGeoScore(g) {
    if (!g) return -1;
    const text = [g.country, g.region, g.city].filter(Boolean).join(' ');
    if (!hasCjk(text)) return -1;
    let score = text.length;
    if (/区|县|旗|镇|街道|乡/.test(text)) score += 100;
    return score;
  }
  function pickBestCnGeo(list) {
    let best = null, bestScore = -1;
    (list || []).forEach(g => {
      const score = cnGeoScore(g);
      if (score > bestScore) { best = g; bestScore = score; }
    });
    return bestScore >= 0 ? best : null;
  }
  function buildGeoLoc(g, fallbackCode) {
    if (!g) return "";
    const code = g.country_code || g.countryCode || fallbackCode || "";
    const parts = [g.country, g.region, g.city].filter(Boolean);
    if (!parts.length) return "";
    return `${fmtFlag(code)} ${parts.join(' ')}`.replace(/\s+/g, ' ').trim();
  }

  function stripIspFromGeo(geo) {
    return String(geo || '')
      .replace(/\s*(电信|联通|移动|广电|铁通|教育网|长城宽带|鹏博士|China\s*Telecom|China\s*Unicom|China\s*Mobile|Chinanet)\s*$/i, '')
      .trim();
  }

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
  async function getLocalCnGeo() {
    const fetchIP138 = async () => {
      try {
        const html = await get('https://2026.ip138.com/', { 'User-Agent': BASE_UA }, 8000);
        const ipMatch = html && html.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
        const geoMatch = html && html.match(/来自：([^<\n]+)/);
        if (ipMatch) return { ip: ipMatch[1], geo: geoMatch ? geoMatch[1].replace(/<[^>]+>/g, '').trim() : '' };
      } catch (e) {}
      return null;
    };
    const fetchIPCN = async () => {
      try {
        const text = await get('https://my.ip.cn/', { 'User-Agent': BASE_UA }, 8000);
        const ipMatch = text && text.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
        const geoMatch = text && text.match(/归属地：(.+)/);
        if (ipMatch) return { ip: ipMatch[1], geo: geoMatch ? geoMatch[1].replace(/<[^>]+>/g, '').trim() : '' };
      } catch (e) {}
      return null;
    };
    const rs = await Promise.all([fetchIP138(), fetchIPCN()]);
    const valid = rs.filter(r => r && r.ip);
    if (!valid.length) return null;
    const sameIp = valid.find(r => r.ip === lIp) || valid[0];
    const candidates = valid.filter(r => r.ip === sameIp.ip && r.geo);
    const picked = candidates.reduce((a, b) => (a.geo.length >= b.geo.length ? a : b), { geo: '' });
    return { ip: sameIp.ip, geo: stripIspFromGeo(picked.geo || sameIp.geo || '') };
  }

  if (lIp !== "获取失败") {
    try {
      const cnGeo = await getLocalCnGeo();
      if (cnGeo && cnGeo.geo) {
        lIp = cnGeo.ip || lIp;
        lLoc = cnGeo.geo;
      }
    } catch (e) {}
  }
  if (lIp !== "获取失败") {
    try {
      const lcRes = await ctx.http.get(`https://ip.net.coffee/api/ip/lookup/${encodeURIComponent(lIp)}`, { timeout: 8000 });
      const lc = JSON.parse(await lcRes.text());
      if (lc) {
        let lcCode = lc.countryCode || lc.country_code || "";
        if (lcCode.toUpperCase() === 'TW') lcCode = 'CN';
        const geoList = Array.isArray(lc.geo_sources) ? lc.geo_sources : [];
        const mainGeo = { country: lc.country, region: lc.region, city: lc.city, country_code: lcCode };
        const cnGeo = pickBestCnGeo([mainGeo].concat(geoList));
        const detailLoc = cnGeo ? buildGeoLoc(cnGeo, lcCode) : "";
        if (detailLoc && detailLoc !== "🌍") lLoc = detailLoc;
        if (lc.isp || lc.asOrganization || lc.company_name) lIsp = fmtISP(lc.isp || lc.asOrganization || lc.company_name);
      }
    } catch (e) {}
  }

  let nIp = "获取失败", nLoc = "未知位置", nativeText = "未知";
  let riskIPPureTxt = "—", ippSev = -1;

  try {
    const res = await ctx.http.get('https://my.ippure.com/v1/info', { timeout: 8000 });
    const d = JSON.parse(await res.text());
    nIp = d.ip || "获取失败";
    let code = d.countryCode || "";
    if (code.toUpperCase() === 'TW') code = 'CN';
    const flag = fmtFlag(code);
    nLoc = `${flag} ${d.country || ""} ${d.city || ""}`.trim() || "未知位置";
    nativeText = d.isResidential === true ? "🏠 原生住宅" : (d.isResidential === false ? "🏢 商业机房" : "未知");
    const risk = ti(d.fraudScore);
    if (risk !== null) {
      if (risk >= 80) { riskIPPureTxt = `极高 (${risk})`; ippSev = 4; }
      else if (risk >= 70) { riskIPPureTxt = `高危 (${risk})`; ippSev = 3; }
      else if (risk >= 40) { riskIPPureTxt = `中等 (${risk})`; ippSev = 1; }
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

  let riskIpapiTxt = "—", apiSev = -1;
  if (nIp !== "获取失败") {
    try {
      const apiRes = await ctx.http.get(`https://api.ipapi.is/?q=${nIp}`, { timeout: 8000 });
      const j = JSON.parse(await apiRes.text());
      if (j && j.company && j.company.abuser_score) {
        const m = String(j.company.abuser_score).match(/([0-9.]+)\s*\(([^)]+)\)/);
        if (m) {
          const pct = Math.round(Number(m[1]) * 10000) / 100 + '%';
          const lv = m[2].trim();
          riskIpapiTxt = `${lv} (${pct}) Abuser`;
          if (lv.includes('Very High')) apiSev = 4;
          else if (lv.includes('High')) apiSev = 3;
          else if (lv.includes('Elevated')) apiSev = 2;
          else apiSev = 0;
        }
      }
    } catch (e) {}
  }

  let riskCoffeeTxt = "—", coffeeSev = -1;
  if (nIp !== "获取失败") {
    try {
      const coffeeRes = await ctx.http.get(`https://ip.net.coffee/api/ip/lookup/${encodeURIComponent(nIp)}`, { timeout: 8000 });
      const cj = JSON.parse(await coffeeRes.text());
      if (cj) {
        const score = ti(cj.trust_score);
        if (score !== null) {
          if (score < 30) { riskCoffeeTxt = `极高 (${score})`; coffeeSev = 4; }
          else if (score < 45) { riskCoffeeTxt = `高危 (${score})`; coffeeSev = 3; }
          else if (score < 60) { riskCoffeeTxt = `中等 (${score})`; coffeeSev = 2; }
          else if (score < 75) { riskCoffeeTxt = `中低 (${score})`; coffeeSev = 1; }
          else { riskCoffeeTxt = `低危 (${score})`; coffeeSev = 0; }
        } else {
          const hits = ['is_proxy','is_vpn','is_tor','is_abuser','is_bogon','is_crawler'].filter(k => cj[k]).length;
          riskCoffeeTxt = `${hits}`;
          coffeeSev = hits >= 3 ? 4 : hits >= 2 ? 3 : hits >= 1 ? 2 : 0;
        }
      }
    } catch (e) {}
  }

  const [gptStatus, geminiStatus, youtubeStatus, netflixStatus, tiktokStatus, claudeStatus] = await Promise.all([
    checkChatGPT(),
    checkGemini(),
    checkYouTube(),
    checkNetflix(),
    checkTikTok(),
    checkClaude()
  ]);

  const proxySuccess = nIp !== "获取失败";
  const isDirectPolicy = !policy || policy.toUpperCase() === "DIRECT";
  const policyOk = !isDirectPolicy && proxySuccess && nIp !== lIp;
  const policyWarn = !isDirectPolicy && (!proxySuccess || nIp === lIp);
  const getUnlockColor = (status) => (status === "Cross" || status === "CN" || status === "受限" || status === "风险") ? C_RED : C_GREEN;
  const getUnlockResult = (status) => {
    if (status === "Cross") return "不可用";
    if (status === "Popcorn") return "仅自制";
    if (status === "CN") return "CN";
    return status;
  };

  let riskGrades = [];
  if (proxySuccess) {
    riskGrades.push({ sev: ippSev, t: `IPPure: ${riskIPPureTxt}` });
    riskGrades.push({ sev: apiSev, t: `ipapi: ${riskIpapiTxt}` });
    riskGrades.push({ sev: coffeeSev, t: `NetCoffee: ${riskCoffeeTxt}` });
  } else {
    riskGrades.push({ sev: 4, t: '获取失败' });
  }

  let maxSev = -1;
  riskGrades.forEach(g => { if (g.sev > maxSev) maxSev = g.sev; });

  function sevIcon(sev) {
    if (sev < 0) return 'questionmark.shield.fill';
    if (sev >= 4) return 'xmark.shield.fill';
    if (sev >= 3) return 'exclamationmark.shield.fill';
    if (sev >= 1) return 'exclamationmark.shield.fill';
    return 'checkmark.shield.fill';
  }
  function sevText(sev) {
    if (sev < 0) return '风险未知';
    if (sev >= 4) return '极高风险';
    if (sev >= 3) return '高风险';
    if (sev >= 2) return '中等风险';
    if (sev >= 1) return '中低风险';
    return '纯净低危';
  }
  function sevColor(sev) {
    if (sev < 0) return C_SUB;
    if (sev >= 4) return C_RED;
    if (sev >= 3) return C_ORANGE;
    if (sev >= 1) return C_YELLOW;
    return C_GREEN;
  }

  const summaryIcon = sevIcon(maxSev);
  const summaryTxt = sevText(maxSev);
  const summaryCol = sevColor(maxSev);
  const SMALL_FONT = 9.5;
  const SMALL_ICON = 11;

  function smallInfoRow(iconName, label, value, valueCol = C_MAIN) {
    return {
      type: 'stack', direction: 'row', alignItems: 'center', gap: 5,
      children: [
        { type: 'image', src: `sf-symbol:${iconName}`, color: C_ICON, width: SMALL_ICON, height: SMALL_ICON },
        { type: 'text', text: label, font: { size: SMALL_FONT }, textColor: C_SUB },
        { type: 'spacer' },
        { type: 'text', text: value, font: { size: SMALL_FONT, weight: 'bold', family: 'Menlo' }, textColor: valueCol, maxLines: 1, minScale: 0.5, lineBreakMode: 'tail' }
      ]
    };
  }

  function UnlockRow(name, status) {
    const iconName = (status === "Cross" || status === "CN") ? "xmark.circle.fill" : "checkmark.circle.fill";
    const iconCol = getUnlockColor(status);
    const result = getUnlockResult(status);
    return {
      type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
      children: [
        { type: 'image', src: `sf-symbol:${iconName}`, color: iconCol, width: SMALL_ICON, height: SMALL_ICON },
        { type: 'text', text: name, font: { size: SMALL_FONT, weight: 'medium' }, textColor: C_MAIN, flex: 1 },
        { type: 'spacer' },
        { type: 'text', text: result, font: { size: SMALL_FONT, weight: 'bold' }, textColor: iconCol, maxLines: 1 }
      ]
    };
  }

  function ScoreRow(grade) {
    const col = sevColor(grade.sev);
    const parts = grade.t.split(': ');
    const src = parts[0] || grade.t;
    const val = parts[1] || '';
    return {
      type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
      children: [
        { type: 'image', src: `sf-symbol:${sevIcon(grade.sev)}`, color: col, width: SMALL_ICON, height: SMALL_ICON },
        { type: 'text', text: src, font: { size: SMALL_FONT }, textColor: C_SUB },
        { type: 'spacer' },
        { type: 'text', text: val, font: { size: SMALL_FONT, weight: 'bold', family: 'Menlo' }, textColor: col, maxLines: 1, minScale: 0.5, lineBreakMode: 'tail' }
      ]
    };
  }

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const isLarge = widgetFamily === 'systemLarge';
  const WIDGET_PADDING = isLarge ? [10, 12] : [8, 10];
  const HEADER_FONT = 13;
  const HEADER_ICON = 11;
  const HEADER_TIME_FONT = 10;
  const HEADER_GAP = 4;
  const TOP_GAP = 3;
  const INFO_GAP = 2.5;
  const BOTTOM_GAP_LEFT = 3;
  const BOTTOM_GAP_RIGHT = 2;
  const COL_GAP = 12;

  const leftColumn = {
    type: 'stack', direction: 'column', gap: INFO_GAP, flex: 1,
    children: [
      smallInfoRow("house.fill", "本地IP：", lIp, C_GREEN),
      smallInfoRow("mappin.and.ellipse", "本地位置：", lLoc),
      smallInfoRow("simcard.fill", "本地运营商：", lIsp)
    ]
  };

  const rightColumn = {
    type: 'stack', direction: 'column', gap: INFO_GAP, flex: 1,
    children: [
      smallInfoRow("network", "落地IP：", nIp, proxySuccess ? C_GREEN : C_RED),
      smallInfoRow("map.fill", "落地位置：", nLoc, proxySuccess ? C_MAIN : C_RED),
      smallInfoRow("building.2.fill", "原生属性：", nativeText, proxySuccess ? C_MAIN : C_RED)
    ]
  };

  const unlockLeft = {
    type: 'stack', direction: 'column', gap: BOTTOM_GAP_LEFT,
    children: [
      UnlockRow("GPT", gptStatus),
      UnlockRow("Claude", claudeStatus),
      UnlockRow("Gemini", geminiStatus),
      UnlockRow("YouTube", youtubeStatus),
      UnlockRow("奈飞", netflixStatus),
      UnlockRow("TikTok", tiktokStatus)
    ]
  };

  const unlockRight = {
    type: 'stack', direction: 'column', gap: BOTTOM_GAP_RIGHT,
    children: riskGrades.map(g => ScoreRow(g))
  };

  const unlockSection = {
    type: 'stack', direction: 'row', gap: COL_GAP,
    children: [unlockLeft, unlockRight]
  };

  return {
    type: 'widget',
    padding: WIDGET_PADDING,
    gap: TOP_GAP,
    backgroundColor: BG_COLOR,
    children: [
      {
        type: 'stack', direction: 'row', alignItems: 'center', gap: HEADER_GAP,
        children: [
          { type: 'text', text: '数据中心(DCH)', font: { size: HEADER_FONT, weight: 'heavy' }, textColor: C_TITLE, flex: 1, maxLines: 1, minScale: 0.7 },
          { type: 'image', src: `sf-symbol:${summaryIcon}`, color: summaryCol, width: 12, height: 12 },
          { type: 'text', text: summaryTxt, font: { size: 10, weight: 'bold' }, textColor: summaryCol },
          { type: 'spacer' },
          ...(!isDirectPolicy ? [
            { type: 'image', src: `sf-symbol:${policyOk ? 'checkmark.circle.fill' : (policyWarn ? 'exclamationmark.circle.fill' : 'questionmark.circle.fill')}`, color: policyOk ? C_GREEN : (policyWarn ? C_ORANGE : C_SUB), width: 10, height: 10 },
            { type: 'text', text: policy, font: { size: 10, weight: 'bold' }, textColor: policyOk ? C_GREEN : (policyWarn ? C_ORANGE : C_SUB) },
          ] : []),
          {
            type: 'stack', direction: 'row', alignItems: 'center', gap: 3,
            children: [
              { type: 'image', src: 'sf-symbol:arrow.clockwise', color: C_SUB, width: HEADER_ICON, height: HEADER_ICON },
              { type: 'text', text: timeStr, font: { size: HEADER_TIME_FONT }, textColor: C_SUB }
            ]
          }
        ]
      },
      {
        type: 'stack', direction: 'row', gap: COL_GAP,
        children: [leftColumn, rightColumn]
      },
      { type: 'stack', height: 0.5, backgroundColor: { light: 'rgba(0,0,0,0.08)', dark: 'rgba(255,255,255,0.12)' } },
      unlockSection
    ]
  };
}
