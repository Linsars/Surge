export default async function(ctx) {
  const BG_COLOR = { light: '#FFFFFF', dark: '#2C2C2E' };
  const C_TITLE = { light: '#1A1A1A', dark: '#FFD700' };
  const C_SUB = { light: '#666666', dark: '#B0B0B0' };
  const C_MAIN = { light: '#1A1A1A', dark: '#FFFFFF' };
  const C_GREEN = { light: '#32D74B', dark: '#32D74B' };
  const C_RED = { light: '#FF3B30', dark: '#FF3B30' };
  const C_ICON_REMOTE = { light: '#5856D6', dark: '#5E5CE6' };

  let gpt = "检测中...";
  let gptColor = C_SUB;
  let nIp = "获取失败";
  let nLoc = "未知位置";

  try {
    const nRes = await ctx.http.get('http://ip-api.com/json/?lang=zh-CN', { timeout: 4000 });
    const nData = JSON.parse(await nRes.text());
    nIp = nData.query || "获取失败";
    let code = nData.countryCode || "";
    if (code.toUpperCase() === 'TW') code = 'CN';
    const flag = code ? String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt())) : "🌐";
    nLoc = `${flag} ${nData.country || ""} ${nData.city || ""}`.trim();
  } catch (e) {}

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
    gap: 6,
    children: [
      { type: 'image', src: `sf-symbol:${iconName}`, color: iconColor, width: 13, height: 13 },
      { type: 'text', text: label, font: { size: 11 }, textColor: C_SUB },
      { type: 'spacer' },
      { 
        type: 'text', 
        text: value, 
        font: { size: 17, weight: 'bold', family: 'Menlo' }, 
        textColor: valueColor, 
        maxLines: 1, 
        minScale: 0.5,
        lineBreakMode: 'tail',
        textAlign: 'right'
      }
    ]
  });

  return {
    type: 'widget',
    padding: 14,
    gap: 8,
    backgroundColor: BG_COLOR,
    children: [
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 6,
        children: [
          { type: 'image', src: 'sf-symbol:sparkles', color: C_TITLE, width: 16, height: 16 },
          { type: 'text', text: 'GPT 检测', font: { size: 14, weight: 'heavy' }, textColor: C_TITLE },
          { type: 'spacer' }
        ]
      },
      {
        type: 'stack',
        direction: 'column',
        gap: 6,
        children: [
          Row("network", C_ICON_REMOTE, "落地 IP", nIp, C_MAIN),
          Row("mappin.and.ellipse", C_ICON_REMOTE, "落地位置", nLoc, C_MAIN),
          Row("sparkles", gptColor, "GPT 状态", gpt, gptColor),
          Row("clock.fill", C_GREEN, "执行时间", timeStr, C_GREEN)
        ]
      }
    ]
  };
}
