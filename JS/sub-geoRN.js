// ==UserScript==
// @name         节点名后追加参数 - 港台除外 + 无地区加自测（面板参数控制版）
// @description  非港台节点追加自定义 RN，无地区节点追加自定义 no_region
// @author       Linsar
// @version      1.7
// ==/UserScript==

async function operator(proxies) {
    // ====================== 默认值（面板没填时使用） ======================
    const DEFAULT_RN         = ' | GPT';     // 有地区但非港台 → 追加这个
    const DEFAULT_NO_REGION  = ' | 自测';    // 无任何地区关键词 → 追加这个
    // ======================================================================

    // 获取面板传入的参数（Sub-Store 常用 $arguments）
    const args = typeof $arguments !== 'undefined' ? $arguments : {};

    // 支持的几种常见参数写法（更宽松匹配）
    // 1. RN= | GPT
    // 2. rn=gemini
    // 3. with_region= 0.5x
    // 4. no_region= ★低速
    let RN = args.RN || args.rn || args.with_region || args.append || DEFAULT_RN;
    let NO_REGION = args.no_region || args.noregion || args.self_test || DEFAULT_NO_REGION;

    // 清理可能多余的空格（用户输入时常有）
    RN = (RN || '').trim();
    NO_REGION = (NO_REGION || '').trim();

    // 如果用户完全没填任何东西，fallback 默认值
    if (!RN) RN = DEFAULT_RN;
    if (!NO_REGION) NO_REGION = DEFAULT_NO_REGION;

    // ====================== 香港/台湾关键词（命中不动） ======================
    const hkTwKeywords = [
        '香港', '港', 'HK', 'HKG', 'HongKong', 'Hong Kong', 'hk', '港铁', 'HKT', 'PCCW', '香港电讯',
        '台湾', '台灣', '台', 'TW', 'Taiwan', 'Taipei', 'TPE', '中華電信', 'CHT', 'Hinet', '遠傳',
        '新北', '桃园', '高雄', '台中', 'Kaohsiung', '台南', '彰化', '基隆', '新竹', '屏东', '宜兰'
    ];

    // 超全面地区/城市/机场关键词（已极度扩展）
    const regionKeywords = [
        '日本', 'jp', 'japan', '东京', '大阪', '京都', '名古屋', '札幌', '福冈', '冲绳', 'NRT', 'HND', 'KIX', 'NGO', 'CTS', 'FUK', 'OKA',
        '新加坡', 'sg', 'singapore', 'SIN', '樟宜',
        '韩国', '韓國', 'kr', 'korea', '首尔', '仁川', '釜山', '大邱', '济州', 'ICN', 'GMP', 'PUS', 'CJU',
        '马来西亚', 'malaysia', 'my', '吉隆坡', '槟城', 'KUL', 'PEN',
        '泰国', 'thailand', 'th', '曼谷', '普吉', '清迈', 'BKK', 'HKT', 'CNX',
        '越南', 'vietnam', 'vn', '胡志明', '河内', '岘港', 'SGN', 'HAN', 'DAD',
        '菲律宾', 'philippines', 'ph', '马尼拉', '宿雾', '长滩岛', 'MNL', 'CEB', 'KLO',
        '印尼', 'indonesia', 'id', '雅加达', '巴厘岛', '泗水', 'CGK', 'DPS', 'SUB',
        '印度', 'india', 'in', '孟买', '德里', '班加罗尔', '钦奈', 'BOM', 'DEL', 'BLR', 'MAA',
        '阿联酋', 'uae', 'dubai', 'abudhabi', 'DXB', 'AUH', 'SHJ',
        '美国', '美國', 'us', 'usa', '洛杉矶', '纽约', '芝加哥', '西雅图', '旧金山', 'LAX', 'JFK', 'EWR', 'ORD', 'SEA', 'SFO',
        '加拿大', 'ca', 'canada', '多伦多', '温哥华', 'YYZ', 'YVR',
        '英国', 'uk', 'london', 'LHR', '曼彻斯特',
        '德国', 'de', 'germany', '法兰克福', 'FRA', '慕尼黑', 'MUC',
        '法国', 'fr', 'france', '巴黎', 'CDG',
        '荷兰', 'nl', 'amsterdam', 'AMS',
        '澳大利亚', 'au', 'australia', '悉尼', 'SYD', '墨尔本', 'MEL',
        // ...（你之前的列表已很全，这里省略部分，实际使用时可保留完整版）
        'AMS', 'FRA', 'LHR', 'CDG', 'SIN', 'NRT', 'HND', 'KIX', 'ICN', 'BKK', 'KUL', 'DXB', 'JFK', 'LAX', 'SFO'
    ];

    const hkTwRegex = new RegExp(hkTwKeywords.join('|'), 'i');
    const regionRegex = new RegExp(regionKeywords.join('|'), 'i');

    return proxies.map(p => {
        let name = p.name;

        if (hkTwRegex.test(name)) {
            // 港台节点：完全不动
            return p;
        }

        if (!regionRegex.test(name)) {
            // 无任何地区信息：追加 NO_REGION
            if (NO_REGION) name += NO_REGION;
        } else {
            // 有地区（非港台）：追加 RN
            if (RN) name += RN;
        }

        p.name = name;
        return p;
    });
}
