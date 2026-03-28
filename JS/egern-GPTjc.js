export default async function(ctx) {
  const BG_COLOR = { light: '#FFFFFF', dark: '#2C2C2E' };
  const C_TITLE = { light: '#1A1A1A', dark: '#FFD700' };
  const C_SUB   = { light: '#666666', dark: '#B0B0B0' };
  const C_MAIN  = { light: '#1A1A1A', dark: '#FFFFFF' };
  const C_GREEN = { light: '#32D74B', dark: '#32D74B' };
  const C_RED   = { light: '#FF3B30', dark: '#FF3B30' };
  const C_ICON_IP = { light: '#007AFF', dark: '#0A84FF' };
  const C_ICON_LOC = { light: '#5856D6', dark: '#5E5CE6' };

  let d = {};
  let ip = "获取失败";
  let ipLabel = "IPv4";
  let asn = "未知";
  let loc = "未知位置";
  let nativeText = "未知";
  let riskTxt = "获取失败";
  let riskCol = C_SUB;
  let riskIc = "questionmark.shield.fill";

  try {
    const res = await ctx.http.get('https://my.ippure.com/v1/info', { timeout: 4000 });
    d = JSON.parse(await res.text());
    ip = d.ip || "获取失败";
    ipLabel = ip.includes(':') ? "IPv6" : "IPv4";
    asn = d.asn ? `AS${d.asn} ${d.asOrganization || ""}`.trim() : "未知";
    let code = d.countryCode || "";
    if (code.toUpperCase() === 'TW') code = 'CN';
    const flag = code ? String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt())) : "🌐";
    loc = `${flag} ${d.country || ""} ${d.city || ""}`.trim() || "未知位置";
    nativeText = d.isResidential === true ? "🏠 原生住宅" : (d.isResidential === false ? "🏢 商业机房" : "未知");
    const risk = d.fraudScore;
    if (risk !== undefined) {
      if (risk >= 80) { 
        riskTxt = `极高风险 (${risk})`; 
        riskCol = C_RED; 
        riskIc = "xmark.shield.fill"; 
      }
      else if (risk >= 70) { 
        riskTxt = `高风险 (${risk})`; 
        riskCol = { light: '#FF9500', dark: '#FF9500' }; 
        riskIc = "exclamationmark.shield.fill"; 
      }
      else if (risk >= 40) { 
        riskTxt = `中等风险 (${risk})`; 
        riskCol = { light: '#FFD60A', dark: '#FFD60A' }; 
        riskIc = "exclamationmark.shield.fill"; 
      }
      else { 
        riskTxt = `纯净低危 (${risk})`; 
        riskCol = C_GREEN; 
        riskIc = "checkmark.shield.fill"; 
      }
    }
  } catch (e) {}

  let gpt = "检测中...";
  let gptColor = C_SUB;
  try {
    const url = "https://api.openai.com/v1/models";
    const options = {
      headers: {
        "Authorization": "Bearer sk-1234567890abcdef1234567890abcdef"
      },
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
          { type: 'image', src: 'sf-symbol:sparkles', color: C_TITLE, width: 18, height: 18 },
          { type: 'text', text: 'GPT & IP 纯净', font: { size: 16, weight: 'heavy' }, textColor: C_TITLE },
          { type: 'spacer' },
        ]
      },
      {
        type: 'stack',
        direction: 'column',
        gap: 10,
        children: [
          Row("globe", C_ICON_IP, ipLabel, ip, C_GREEN),
          Row("number.square.fill", C_ICON_IP, "归属网络", asn, C_GREEN),
          Row("mappin.and.ellipse", C_ICON_LOC, "位置", loc, C_MAIN),
          Row("building.2.fill", C_ICON_LOC, "原生属性", nativeText, C_SUB),
          Row(riskIc, riskCol, "风险评级", riskTxt, riskCol),
          Row("sparkles", gptColor, "GPT 状态", gpt, gptColor),
          Row("clock.fill", C_GREEN, "执行时间", timeStr, C_GREEN)
        ]
      }
    ]
  };
}
