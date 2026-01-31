// ==UserScript==
// @name         节点名后追加参数 - 港台除外 + 无地区加改名
// @description  非香港/台湾节点追加 | GPT，无任何地区信息追加 | 改名
// @author       Linsar
// @version      2.0
// ==/UserScript==

async function operator(proxies) {
    const APPEND_WITH_REGION = ' | GPT';   // 有地区但非港台 → 追加这个
    const APPEND_NO_REGION   = ' | 改名'; // 完全没地区关键词 → 追加这个

    // 香港/台湾关键词（命中这些的不动）
    const hkTwKeywords = [
        '香港', '港', 'HK', 'HKG', 'HongKong', 'Hong Kong', 'hk', '港铁', 'HKT', 'PCCW', '香港电讯',
        '台湾', '台灣', '台', 'TW', 'Taiwan', 'Taipei', 'TPE', '中華電信', 'CHT', 'Hinet', '遠傳',
        '新北', '桃园', '高雄', '台中', 'Kaohsiung', '台南', '彰化', '基隆', '新竹', '屏东', '宜兰'
    ];

    // 地区关键词（全面覆盖常见国家/城市/机场代码）
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

        // 大洋洲 & 其他热门
        '澳大利亚', 'au', 'australia', '悉尼', '墨尔本', '布里斯班', 'SYD', 'MEL', 'BNE',
        '新西兰', 'nz', 'new zealand', '奥克兰', 'AKL',

        // 常见机场代码（单独出现也识别）
        'AMS', 'FRA', 'LHR', 'CDG', 'SIN', 'NRT', 'HND', 'KIX', 'ICN', 'BKK', 'KUL', 'MNL', 'CGK', 'DEL', 'YYZ', 'YVR', 'DXB', 'AUH', 'IST', 'JFK', 'LAX', 'SFO', 'SEA', 'ORD', 'MIA'
    ];

    const hkTwRegex   = new RegExp(hkTwKeywords.join('|'), 'i');
    const regionRegex = new RegExp(regionKeywords.join('|'), 'i');

    return proxies.map(p => {
        let name = p.name || '';

        // 港台节点：不动
        if (hkTwRegex.test(name)) {
            return p;
        }

        // 无任何地区关键词：追加 | 改名
        if (!regionRegex.test(name)) {
            name += APPEND_NO_REGION;
        } 
        // 有地区（非港台）：追加 | GPT
        else {
            name += APPEND_WITH_REGION;
        }

        p.name = name;
        return p;
    });
}
