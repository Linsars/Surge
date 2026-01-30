// ==UserScript==
// @name         节点名后追加参数 - 港台除外 + 无地区加自测（面板参数控制版）
// @description  非港台节点追加自定义 RN，无地区节点追加自定义 no_region
// @author       Grok (优化为参考 geo.js 风格)
// @version      1.9
// ==/UserScript==

async function operator(proxies) {
  // 默认值
  const DEFAULT_RN         = ' | GPT';
  const DEFAULT_NO_REGION  = ' | 自测';

  // 直接用 $arguments.xxx （模仿参考脚本，不加 typeof 判断）
  let RN        = $arguments.RN || $arguments.rn || $arguments.append || $arguments.with_region || DEFAULT_RN;
  let NO_REGION = $arguments.no_region || $arguments.noregion || $arguments.self_test || DEFAULT_NO_REGION;

  // 清理空格（保持原有）
  RN        = String(RN || '').trim();
  NO_REGION = String(NO_REGION || '').trim();

  // 如果为空则 fallback（防止用户写空）
  if (!RN)        RN        = DEFAULT_RN;
  if (!NO_REGION) NO_REGION = DEFAULT_NO_REGION;

  // 调试日志 - 更新订阅后看 Sub-Store 日志确认参数是否到达
  console.log(`[sub-geoRN] $arguments: ${JSON.stringify($arguments || {})}`);
  console.log(`[sub-geoRN] 使用 RN: "${RN}" | NO_REGION: "${NO_REGION}"`);

  // 香港/台湾关键词（命中不动）
  const hkTwKeywords = [
    '香港', '港', 'HK', 'HKG', 'HongKong', 'Hong Kong', 'hk', '港铁', 'HKT', 'PCCW', '香港电讯',
    '台湾', '台灣', '台', 'TW', 'Taiwan', 'Taipei', 'TPE', '中華電信', 'CHT', 'Hinet', '遠傳',
    '新北', '桃园', '高雄', '台中', 'Kaohsiung', '台南', '彰化', '基隆', '新竹', '屏东', '宜兰'
  ];

  // 地区关键词（保持你之前的全面列表，实际用时别删）
  const regionKeywords = [
    '日本', 'jp', 'japan', '东京', '大阪', 'NRT', 'HND', 'KIX',
    '新加坡', 'sg', 'singapore', 'SIN',
    '韩国', 'kr', 'korea', 'ICN',
    '美国', 'us', 'usa', 'LAX', 'JFK', 'ORD', 'SFO',
    '加拿大', 'ca', 'canada', 'YYZ',
    '英国', 'uk', 'LHR',
    '德国', 'de', 'FRA',
    '法国', 'fr', 'CDG',
    '澳大利亚', 'au', 'SYD',
    'AMS', 'FRA', 'LHR', 'CDG', 'SIN', 'NRT', 'ICN', 'BKK', 'KUL', 'DXB', 'JFK', 'LAX', 'SFO'
    // 如果需要完整列表，从你之前版本复制进来
  ];

  const hkTwRegex   = new RegExp(hkTwKeywords.join('|'), 'i');
  const regionRegex = new RegExp(regionKeywords.join('|'), 'i');

  return proxies.map(p => {
    let name = p.name || '';

    if (hkTwRegex.test(name)) return p;  // 港台不动

    if (!regionRegex.test(name)) {
      if (NO_REGION) name += NO_REGION;
    } else {
      if (RN) name += RN;
    }

    p.name = name;
    return p;
  });
}
