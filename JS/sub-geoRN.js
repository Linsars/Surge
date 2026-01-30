// ==UserScript==
// @name         节点名后追加参数 - 港台除外 + 无地区加自测（面板参数控制版）
// @description  非港台节点追加自定义 RN，无地区节点追加自定义 no_region
// @author       Linsar
// @version      1.8
// ==/UserScript==

async function operator(proxies) {
  // 默认值
  const DEFAULT_RN        = ' | GPT';
  const DEFAULT_NO_REGION = ' | 自测';
  const args = $arguments || {};

  // 支持多种写法：RN=xxx、rn=xxx、append=xxx 等
  let RN = args.RN || args.rn || args.append || args.with_region || DEFAULT_RN;
  let NO_REGION = args.no_region || args.noregion || args.self_test || DEFAULT_NO_REGION;

  // 清理前后空格（用户输入常带空格）
  RN = String(RN).trim();
  NO_REGION = String(NO_REGION).trim();

  // 如果为空字符串，也 fallback 默认（避免用户写空值）
  if (!RN) RN = DEFAULT_RN;
  if (!NO_REGION) NO_REGION = DEFAULT_NO_REGION;

  // 调试日志（上线后可删除或注释）
  console.log(`[DEBUG] Received $arguments: ${JSON.stringify(args)}`);
  console.log(`[DEBUG] Final RN: "${RN}" | NO_REGION: "${NO_REGION}"`);

  // 香港/台湾关键词（命中不动）
  const hkTwKeywords = [
    '香港', '港', 'HK', 'HKG', 'HongKong', 'Hong Kong', 'hk', '港铁', 'HKT', 'PCCW', '香港电讯',
    '台湾', '台灣', '台', 'TW', 'Taiwan', 'Taipei', 'TPE', '中華電信', 'CHT', 'Hinet', '遠傳',
    '新北', '桃园', '高雄', '台中', 'Kaohsiung', '台南', '彰化', '基隆', '新竹', '屏东', '宜兰'
  ];

  // 地区关键词（超全面）
  const regionKeywords = [
    // ... 你之前的完整列表，省略以节省空间，实际使用请复制完整版
    '日本', 'jp', 'japan', '东京', 'NRT', 'HND', 'KIX',
    '新加坡', 'sg', 'singapore', 'SIN',
    '韩国', 'kr', 'korea', 'ICN', 'PUS',
    '美国', 'us', 'usa', 'LAX', 'JFK', 'ORD', 'SFO',
    '加拿大', 'ca', 'canada', 'YYZ', 'YVR',
    '英国', 'uk', 'LHR', 'MAN',
    '德国', 'de', 'FRA', 'MUC',
    '法国', 'fr', 'CDG',
    '澳大利亚', 'au', 'SYD', 'MEL',
    // 机场代码补充
    'AMS', 'FRA', 'LHR', 'CDG', 'SIN', 'NRT', 'ICN', 'BKK', 'KUL', 'DXB', 'JFK', 'LAX'
  ];

  const hkTwRegex = new RegExp(hkTwKeywords.join('|'), 'i');
  const regionRegex = new RegExp(regionKeywords.join('|'), 'i');

  return proxies.map(p => {
    let name = p.name || '';

    if (hkTwRegex.test(name)) {
      // 港台不动
      return p;
    }

    if (!regionRegex.test(name)) {
      // 无地区 → 加 NO_REGION
      if (NO_REGION) name += NO_REGION;
    } else {
      // 有地区（非港台） → 加 RN
      if (RN) name += RN;
    }

    p.name = name;
    return p;
  });
}
