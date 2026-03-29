export default async function(ctx) {
  const BG_COLOR = { light: '#FFFFFF', dark: '#2C2C2E' };
  const C_TITLE = { light: '#1A1A1A', dark: '#FFD700' };
  const C_SUB = { light: '#666666', dark: '#B0B0B0' };
  const C_MAIN = { light: '#1A1A1A', dark: '#FFFFFF' };
  const C_GREEN = { light: '#32D74B', dark: '#32D74B' };
  const C_RED = { light: '#FF3B30', dark: '#FF3B30' };
  const C_ICON_LOCAL = { light: '#007AFF', dark: '#0A84FF' };
  const C_ICON_REMOTE = { light: '#5856D6', dark: '#5E5CE6' };

  const fmtISP = (isp) => {
    if (!isp) return "未知";
    const s = String(isp).toLowerCase();
    if (/移动\|mobile\|cmcc/i.test(s)) return "中国移动";
    if (/电信\|telecom\|chinanet/i.test(s)) return "中国电信";
    if (/联通\|unicom/i.test(s)) return "中国联通";
    if (/广电\|broadcast\|cbn/i.test(s)) return "中国广电";
    return isp;
  };

  let lIp = "获取失败", lLoc = "未知位置", lIsp = "未知运营商";
  try {
    const lRes = await ctx.http.get('https://myip.ipip.net/json', { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 4000 });
    const body = JSON.parse(await lRes.text());
    if (body?.data) {
      lIp = body.data.ip || "获取失败";
      const locArr = body.data.location || [];
      lLoc = `🇨 ${locArr[1] || ""} ${locArr[2] || ""}`.trim() || "未知位置";
      lIsp = fmtISP(locArr[4] || locArr[3]);
    }
  } catch (e) {}
  if (lIp === "获取失败" || !lIp) {
    try {
      const res126 = await ctx.http.get('https://ipservice.ws.126.net/locate/api/getLocByIp', { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 4000 });
      const body126 = JSON.parse(await res126.text());
      if (body126?.result) {
        lIp = body126.result.ip;
        lLoc = `🇨 ${body126.result.province || ""} ${body126.result.city || ""}`.trim();
        lIsp = fmtISP(body126.result.operator || body126.result.company);
      }
    } catch (e) {}
  }

  let d = {};
  let nIp = "获取失败";
  let asn = "未知";
  let nLoc = "未知位置";
  let nativeText = "未知";
  let riskTxt = "获取失败";
  let riskCol = C_SUB;
  let riskIc = "questionmark.shield.fill";
  try {
    const res = await ctx.http.get('https://my.ippure.com/v1/info', { timeout: 4000 });
    d = JSON.parse(await res.text());
    nIp = d.ip || "获取失败";
    asn = d.asn ? `AS${d.asn} ${d.asOrganization || ""}`.trim() : "未知";
    let code = d.countryCode || "";
    if (code.toUpperCase() === 'TW') code = 'CN';
    const flag = code ? String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt())) : "🌐";
    nLoc = `${flag} ${d.country || ""} ${d.city || ""}`.trim() || "未知位置";
    nativeText = d.isResidential === true ? "🏠 原生住宅" : (d.isResidential === false ? "🏢 商业机房" : "未知");
    const risk = d.fraudScore;
    if (risk !== undefined) {
      if (risk >= 80) { riskTxt = `极高风险 (${risk})`; riskCol = C_RED; riskIc = "xmark.shield.fill"; }
      else if (risk >= 70) { riskTxt = `高风险 (${risk})`; riskCol = { light: '#FF9500', dark: '#FF9500' }; riskIc = "exclamationmark.shield.fill"; }
      else if (risk >= 40) { riskTxt = `中等风险 (${risk})`; riskCol = { light: '#FFD60A', dark: '#FFD60A' }; riskIc = "exclamationmark.shield.fill"; }
      else { riskTxt = `纯净低危 (${risk})`; riskCol = C_GREEN; riskIc = "checkmark.shield.fill"; }
    }
  } catch (e) {}

  let gpt = "检测中...";
  let gptColor = C_SUB;
  try {
    const url = "https://api.openai.com/v1/models";
    const options = {
      headers: { "Authorization": "Bearer sk-1234567890abcdef1234567890abcdef" },
      timeout: 10000
    };
    const res = await ctx.http.get(url, options);
    const status = res.status || res.statusCode || 0;
    const body = await res.text();
    if (status === 401 || body.includes("invalid_request_error") || body.includes("Incorrect API key")) {
      gpt = "✅ GPT 可用";
      gptColor = C_GREEN;
    } else {
      gpt = "❌ GPT 不可用";
      gptColor = C_RED;
    }
  } catch (e) {
    gpt = "❌ GPT 不可用";
    gptColor = C_RED;
  }

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const Row = (iconName, iconColor, label, value, valueColor) => ({
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 8,
    children: [
      { type: 'image', src: `sf-symbol:${iconName}`, color: iconColor, width: 16, height: 16 },
      { type: 'text', text: label, font: { size: 13 }, textColor: C_SUB },
      { type: 'spacer' },
      { type: 'text', text: value, font: { size: 13, weight: 'bold', family: 'Menlo' }, textColor: valueColor, maxLines: 1, minScale: 0.6 }
    ]
  });

  return {
    type: 'widget',
    padding: 16,
    gap: 12,
    backgroundColor: BG_COLOR,
    children: [
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 8,
        children: [
          { type: 'image', src: 'sf-symbol:paperplane.fill', color: C_TITLE, width: 18, height: 18 },
          { type: 'text', text: '代理 & GPT', font: { size: 16, weight: 'heavy' }, textColor: C_TITLE },
          { type: 'spacer' }
        ]
      },
      {
        type: 'stack',
        direction: 'column',
        gap: 10,
        children: [
          Row("house.fill", C_ICON_LOCAL, "本地 IP", lIp, C_GREEN),
          Row("map.fill", C_ICON_LOCAL, "本地位置", lLoc, C_MAIN),
          Row("antenna.radiowaves.left.and.right", C_ICON_LOCAL, "运营商", lIsp, C_MAIN),
          { type: 'spacer', length: 8 },
          Row("network", C_ICON_REMOTE, "落地 IP", nIp, C_GREEN),
          Row("number.square.fill", C_ICON_REMOTE, "归属网络", asn, C_GREEN),
          Row("mappin.and.ellipse", C_ICON_REMOTE, "落地位置", nLoc, C_MAIN),
          Row("building.2.fill", C_ICON_REMOTE, "原生属性", nativeText, C_SUB),
          Row(riskIc, riskCol, "风险评级", riskTxt, riskCol),
          Row("sparkles", gptColor, "GPT 状态", gpt, gptColor),
          Row("clock.fill", C_GREEN, "执行时间", timeStr, C_GREEN)
        ]
      }
    ]
  };
}​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​
