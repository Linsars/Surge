// ==UserScript==
// @name         智慧重命名 - 支持 GPT 区判断 + 测落地命名（2026修复版）
// @version      1.9.2
// @description  为substore代理节点重命名，支持循环命名 + 非港台&不支持GPT追加文字 + 测落地（失败显示未知｜）
// @author       Linsar
// ==/UserScript==

const args = $arguments || {};

// 参数 key 转大写
const args_upper = {};
for (const key in args) {
    if (Object.prototype.hasOwnProperty.call(args, key)) {
        args_upper[key.toUpperCase()] = args[key];
    }
}

// ── 基础命名参数 ────────────────────────────────────────
const PREFIX = args_upper.QZ ? decodeURI(args_upper.QZ) + (args_upper.FGF || "｜") : "";
const SUFFIX = args_upper.HZ ? (args_upper.FGF || "｜") + decodeURI(args_upper.HZ) : "";
const SEP    = args_upper.FGF ? decodeURI(args_upper.FGF) : "｜";

const GM_MODE   = args_upper.GM ? decodeURI(args_upper.GM).trim() : "";
const USE_CUSTOM = !!GM_MODE;

// ── GPT 追加 & 测落地总开关 ────────────────────────────────────────
const APPEND_ENABLED = (args_upper.ZN === "1" || args_upper.ZN === 1);

let APPEND_TEXT = " | GPT";
if (APPEND_ENABLED && args_upper.ZNRE !== undefined) {
    const custom = decodeURI(args_upper.ZNRE).trim();
    if (custom) APPEND_TEXT = custom;
}

const GEO_ENABLED   = (args_upper.GEO === "1" || args_upper.GEO === 1);
const USE_INTERNAL  = (args_upper.INTERNAL === "1" || args_upper.INTERNAL === 1);

// 默认 format：国旗 + 两字母代码 + 分隔符 + 原名
const DEFAULT_GEO_FORMAT = "{{api.flag}} {{api.countryCode}}" + SEP + "{{proxy.name}}";
const GEO_FORMAT = args_upper.FORMAT ? decodeURI(args_upper.FORMAT) : DEFAULT_GEO_FORMAT;

// 不支持 GPT 地区关键词（不区分大小写）
const hkTwKeywords = [
    '香港', '港', 'HK', 'HKG', 'HongKong', 'Hong Kong', '九龙', '新界',
    '台湾', '台灣', '台', 'TW', 'Taiwan', 'Taipei', 'TPE', '桃園', '桃园',
    '高雄', 'Kaohsiung', 'KHH', '台中', 'Taichung', 'RMQ', '台南', 'Tainan', 'TNN',
    '中国', '大陆', 'CN', 'China', 'Mainland', '北京', '上海', '广州', '深圳', '成都', '杭州',
    '俄罗斯', '俄国', 'RU', 'Russia', 'Moscow', '莫斯科', '圣彼得堡', 'SPB',
    '伊朗', 'IR', 'Iran', 'Tehran', '德黑兰', '波斯',
    '朝鲜', '北朝鲜', '北韩', 'KP', 'Korea North', 'DPRK', 'Pyongyang', '平壤',
    '古巴', 'Cuba', 'CU', 'Havana', '哈瓦那',
    '叙利亚', 'SY', 'Syria', 'Damascus', '大马士革',
    '阿富汗', 'AF', 'Afghanistan', 'Kabul', '喀布尔',
    '白俄罗斯', '白俄', 'BY', 'Belarus', 'Minsk', '明斯克',
    '缅甸', 'Burma', 'Myanmar', 'MM', 'Yangon', '仰光', '内比都',
    '利比亚', 'LY', 'Libya', 'Tripoli', '的黎波里',
    '也门', 'Yemen', 'YE', 'Sanaa',
    '苏丹', 'Sudan', 'SD', 'Khartoum',
    '厄立特里亚', 'ER', 'Eritrea',
    '中非', 'Central African Republic', 'CF',
    '乍得', 'Chad', 'TD',
    '沙特', 'Saudi Arabia', 'SA', 'Riyadh', '利雅得',
    '埃及', 'Egypt', 'EG', 'Cairo', '开罗',
    '老挝', 'Laos', 'LA', 'Vientiane',
    '哈萨克斯坦', 'Kazakhstan', 'KZ', 'Almaty', '阿拉木图',
    '埃塞俄比亚', 'Ethiopia', 'ET', 'Addis Ababa',
    '委内瑞拉', 'Venezuela', 'VE', 'Caracas',
    '巴林', 'Bahrain', 'BH',
    '吉布提', 'Djibouti',
    '马其顿', 'North Macedonia', 'MK',
    '南苏丹', 'South Sudan', 'SS'
];

const hkTwRegex = new RegExp(hkTwKeywords.join('|'), 'i');

// ── 循环命名数组 ────────────────────────────────────────
const ZODIAC = [
    "子鼠", "丑牛", "寅虎", "卯兔", "辰龙", "巳蛇",
    "午马", "未羊", "申猴", "酉鸡", "戌狗", "亥猪"
];

const TAROT_EN = [
    "Fool", "Magician", "High Priestess", "Empress", "Emperor", "Hierophant",
    "Lovers", "Chariot", "Strength", "Hermit", "Wheel of Fortune", "Justice",
    "Hanged Man", "Death", "Temperance", "Devil", "Tower", "Star",
    "Moon", "Sun", "Judgement", "World"
];

const TAROT_CN = [
    "愚者", "魔术师", "女祭司", "皇后", "皇帝", "教皇",
    "恋人", "战车", "力量", "隐士", "命运之轮", "正义",
    "倒吊人", "死神", "节制", "恶魔", "塔", "星星",
    "月亮", "太阳", "审判", "世界"
];

const SINS = [
    "傲慢", "嫉妒", "暴怒", "懒惰", "贪婪", "暴食", "色欲"
];

const ANGELS_EN = [
    "Michael", "Gabriel", "Raphael", "Uriel", "Raguel", "Sariel",
    "Remiel", "Zadkiel", "Jophiel", "Chamuel", "Haniel", "Barachiel"
];

const ANGELS_CN = [
    "米迦勒", "加百列", "拉斐尔", "乌列尔", "拉贵尔", "萨列尔",
    "雷米尔", "扎基尔", "约菲尔", "卡麦尔", "哈尼尔", "巴拉基勒"
];

const VAMPIRE_RANKS = [
    "Fledgling", "Neonate", "Ancilla", "Elder", "Methuselah", "Antediluvian",
    "Baron", "Count", "Duke", "Prince", "Archon", "Justicar"
];

const SOLAR_TERMS = [
    "立春", "雨水", "惊蛰", "春分", "清明", "谷雨",
    "立夏", "小满", "芒种", "夏至", "小暑", "大暑",
    "立秋", "处暑", "白露", "秋分", "寒露", "霜降",
    "立冬", "小雪", "大雪", "冬至", "小寒", "大寒"
];

const TANG_OFFICIALS = [
    "宰相", "尚书", "侍郎", "郎中", "员外郎", "御史", "太守", "刺史",
    "县令", "主簿", "司空", "司徒", "司马", "太尉", "中书令", "门下侍中",
    "尚书令", "给事中", "谏议大夫", "大夫", "卿", "将军", "校尉", "都督"
];

const DOUPO_LEVELS = [
    "斗之气", "斗者", "斗师", "大斗师", "斗灵", "斗王",
    "斗皇", "斗宗", "斗尊", "斗圣", "斗帝"
];

const DOULUO_LEVELS = [
    "魂士", "魂师", "大魂师", "魂尊", "魂宗", "魂王",
    "魂帝", "魂圣", "魂斗罗", "封号斗罗", "神级"
];

const SUPER_DIGITS = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
};

function toSuperscript(num) {
    if (num <= 0) return '';
    const str = num.toString();
    let result = '';
    for (let char of str) {
        result += SUPER_DIGITS[char] || char;
    }
    return result;
}

function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return "??";
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0) - 65);
    return String.fromCodePoint(...codePoints);
}

async function operator(proxies) {
    if (!proxies?.length) return proxies;

    // 第一阶段：基础重命名（前缀 + 循环/序号 + 后缀）
    if (USE_CUSTOM) {
        const nameCount = {};
        proxies.forEach((proxy, idx) => {
            let base = GM_MODE;
            const mode = GM_MODE.toLowerCase();

            if (mode === "生肖") {
                base = ZODIAC[idx % 12];
                const cycle = Math.floor(idx / 12);
                if (cycle > 0) base += cycle;
            } else if (mode === "塔罗") {
                base = TAROT_EN[idx % 22];
                const cycle = Math.floor(idx / 22);
                if (cycle > 0) base += cycle;
            } else if (mode === "塔罗x") {
                base = TAROT_CN[idx % 22];
                const cycle = Math.floor(idx / 22);
                if (cycle > 0) base += cycle;
            } else if (mode === "罪") {
                base = SINS[idx % 7];
                const cycle = Math.floor(idx / 7);
                if (cycle > 0) base += cycle;
            } else if (mode === "天使") {
                base = ANGELS_EN[idx % 12];
                const cycle = Math.floor(idx / 12);
                if (cycle > 0) base += cycle;
            } else if (mode === "天使x") {
                base = ANGELS_CN[idx % 12];
                const cycle = Math.floor(idx / 12);
                if (cycle > 0) base += cycle;
            } else if (mode === "血族") {
                base = VAMPIRE_RANKS[idx % VAMPIRE_RANKS.length];
                const cycle = Math.floor(idx / VAMPIRE_RANKS.length);
                if (cycle > 0) base += cycle;
            } else if (mode === "节气") {
                base = SOLAR_TERMS[idx % SOLAR_TERMS.length];
                const cycle = Math.floor(idx / SOLAR_TERMS.length);
                if (cycle > 0) base += cycle;
            } else if (mode === "唐朝") {
                base = TANG_OFFICIALS[idx % TANG_OFFICIALS.length];
                const cycle = Math.floor(idx / TANG_OFFICIALS.length);
                if (cycle > 0) base += cycle;
            } else if (mode === "斗罗") {
                base = DOULUO_LEVELS[idx % DOULUO_LEVELS.length];
                const cycle = Math.floor(idx / DOULUO_LEVELS.length);
                if (cycle > 0) base += cycle;
            } else if (mode === "斗破") {
                base = DOUPO_LEVELS[idx % DOUPO_LEVELS.length];
                const cycle = Math.floor(idx / DOUPO_LEVELS.length);
                if (cycle > 0) base += cycle;
            }

            nameCount[base] = (nameCount[base] || 0) + 1;
            let name = base;
            if (nameCount[base] > 1) name += toSuperscript(nameCount[base]);
            proxy.name = PREFIX + name + SUFFIX;
        });
    } else {
        proxies.forEach(proxy => {
            proxy.name = PREFIX + proxy.name.trim() + SUFFIX;
        });
    }

    // 如果 zn != 1，结束
    if (!APPEND_ENABLED) return proxies;

    // 第二阶段：geo=1 时测落地（使用 internal 模式优先）
    if (GEO_ENABLED) {
        const apiUrl = USE_INTERNAL ? "http://checkip.amazonaws.com" : "http://ip-api.com/json?lang=zh-CN";

        await Promise.allSettled(proxies.map(async proxy => {
            let apiData = { flag: "", countryCode: "未知" };

            try {
                const res = await $http.get({
                    url: apiUrl,
                    timeout: 8000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Sub-Store Geo Test)' }
                });

                if (USE_INTERNAL) {
                    const ip = (res.body || "").trim();
                    const cc = $utils?.geoip?.(ip) || "未知";
                    apiData = {
                        countryCode: cc,
                        flag: getFlagEmoji(cc)
                    };
                } else {
                    const json = JSON.parse(res.body || "{}");
                    if (json.status === "success" || json.countryCode) {
                        const cc = json.countryCode || "未知";
                        apiData = {
                            ...json,
                            countryCode: cc,
                            flag: getFlagEmoji(cc)
                        };
                    }
                }
            } catch (e) {
                // 失败保持未知
            }

            // 命名处理
            let newName = GEO_FORMAT.replace(/\{\{proxy\.name\}\}/g, proxy.name)
                                    .replace(/\{\{api\.([^\}]+)\}\}/g, (_, k) => apiData[k] || "");

            if (apiData.countryCode === "未知") {
                newName = `未知${SEP}${proxy.name}`;
            }

            proxy.name = newName;
            proxy._geo = apiData;
        }));
    }

    // 第三阶段：追加 APPEND_TEXT
    proxies.forEach(proxy => {
        let shouldAppend = false;

        const useGeo = GEO_ENABLED && proxy._geo && proxy._geo.countryCode !== "未知";

        if (useGeo) {
            const geoStr = [
                proxy._geo.country || '',
                proxy._geo.countryCode || '',
                proxy._geo.regionName || '',
                proxy._geo.city || '',
                proxy._geo.isp || '',
                proxy._geo.aso || ''
            ].join(" ").toUpperCase();

            shouldAppend = !hkTwRegex.test(geoStr);
        } else {
            shouldAppend = !hkTwRegex.test(proxy.name);
        }

        if (shouldAppend) {
            proxy.name += APPEND_TEXT;
        }
    });

    return proxies;
}
