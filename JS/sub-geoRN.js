// ==UserScript==
// @name         节点名后追加参数 - 港台除外 + 无地区加自测（超全面 + 可面板自定义）
// @description  非香港/台湾节点追加自定义文本，无任何可识别地区/城市/机场代码的追加 | 自测
// @author       Linsar
// @version      1.6
// ==/UserScript==

async function operator(proxies) {
    // ====================== 可在 Sub-Store 面板自定义的参数 ======================
    // 在 Sub-Store 的“脚本” → “参数” 或 “Arguments” 字段填入键值对，例如：
    // with_region= | GPT
    // no_region= | 自测
    // 或直接写：with_region= 0.5x   no_region= ★自选
    // ============================================================================

    // 默认值（如果面板没填参数，就用这些）
    const DEFAULT_WITH_REGION = ' | GPT';
    const DEFAULT_NO_REGION   = ' | 自测';

    // 从环境/参数读取用户自定义值（Sub-Store 支持 $arguments 或类似机制）
    // 如果你的面板用的是 $arguments 对象，这里兼容常见写法
    const args = (typeof $arguments !== 'undefined') ? $arguments : {};

    // 读取自定义追加文本，fallback 到默认值
    const RN       = args.with_region   || args.RN       || DEFAULT_WITH_REGION;
    const NO_REGION = args.no_region    || args.NO_REGION || DEFAULT_NO_REGION;

    // ====================== 香港/台湾关键词（命中这些的节点完全不动） ======================
    const hkTwKeywords = [
        '香港', '港', 'HK', 'HKG', 'HongKong', 'Hong Kong', 'hk', '港铁', 'HKT', 'PCCW', '香港电讯',
        '台湾', '台灣', '台', 'TW', 'Taiwan', 'Taipei', 'TPE', '中華電信', 'CHT', 'Hinet', '遠傳',
        '新北', '桃园', '高雄', '台中', 'Kaohsiung', '台南', '彰化', '基隆', '新竹', '屏东', '宜兰'
    ];

    // 超全面地区关键词（已扩展到极致，基本覆盖所有常见机场命名）
    const regionKeywords = [
        // 亚洲主流（除港台）
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
        '沙特', 'saudi', 'riyadh', 'jeddah', 'RUH', 'JED',

        // 北美
        '美国', '美國', 'us', 'usa', 'united states', '洛杉矶', '纽约', '芝加哥', '西雅图', '旧金山', '达拉斯', '迈阿密', '拉斯维加斯', '休斯顿', '波士顿', '亚特兰大', '凤凰城', '华盛顿', 'LAX', 'JFK', 'EWR', 'ORD', 'SEA', 'SFO', 'DFW', 'MIA', 'LAS', 'IAH', 'BOS', 'ATL', 'PHX', 'IAD', 'DCA',
        '加拿大', 'ca', 'canada', '多伦多', '温哥华', '蒙特利尔', 'YYZ', 'YVR', 'YUL',

        // 欧洲主流
        '英国', '英國', 'uk', 'england', 'london', '曼彻斯特', 'LHR', 'LGW', 'MAN',
        '德国', 'de', 'germany', '法兰克福', '柏林', '慕尼黑', '杜塞尔多夫', 'FRA', 'BER', 'MUC', 'DUS',
        '法国', 'fr', 'france', '巴黎', '马赛', '里昂', 'CDG', 'ORY', 'MRS',
        '荷兰', 'nl', 'netherlands', '阿姆斯特丹', 'AMS',
        '俄罗斯', 'ru', 'russia', '莫斯科', '圣彼得堡', 'SVO', 'DME', 'LED',
        '意大利', 'it', 'italy', '罗马', '米兰', '威尼斯', 'FCO', 'MXP', 'VCE',
        '西班牙', 'es', 'spain', '马德里', '巴塞罗那', 'MAD', 'BCN',
        '瑞典', 'se', 'sweden', '斯德哥尔摩', 'ARN',
        '瑞士', 'ch', 'switzerland', '苏黎世', '日内瓦', 'ZRH', 'GVA',
        '土耳其', 'tr', 'turkey', '伊斯坦布尔', '安卡拉', 'IST', 'SAW', 'ESB',
        '波兰', 'pl', 'poland', '华沙', 'WAW',

        // 大洋洲 & 其他
        '澳大利亚', 'au', 'australia', '悉尼', '墨尔本', '布里斯班', 'SYD', 'MEL', 'BNE',
        '新西兰', 'nz', 'new zealand', '奥克兰', 'AKL',

        // 额外常见机场代码（单独出现也识别）
        'AMS', 'FRA', 'LHR', 'CDG', 'SIN', 'NRT', 'HND', 'KIX', 'ICN', 'BKK', 'KUL', 'MNL', 'CGK', 'DEL', 'YYZ', 'YVR', 'DXB', 'AUH', 'IST', 'JFK', 'LAX', 'SFO', 'SEA', 'ORD', 'MIA'
    ];

    const hkTwRegex     = new RegExp(hkTwKeywords.join('|'), 'i');
    const anyRegionRegex = new RegExp(regionKeywords.join('|'), 'i');

    return proxies.map(p => {
        const name = p.name;

        // 优先：包含港台 → 永久不动
        if (hkTwRegex.test(name)) {
            return p;
        }

        // 无任何地区/城市/机场关键词 → 用自定义的 NO_REGION
        if (!anyRegionRegex.test(name)) {
            p.name = name + NO_REGION;
            return p;
        }

        // 有地区信息，但不是港台 → 用自定义的 RN
        p.name = name + RN;
        return p;
    });
}
