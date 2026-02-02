// ==UserScript==
// @name         智慧重命名 - 支持 GPT 区判断 + 测落地命名（失败显示未知｜）
// @version      1.8
// @description  为substore代理节点重命名，支持循环命名 + 非港台&不支持GPT追加文字 + 可选测真实落地（仅当zn=1且geo=1时生效）
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

// 当 zn≠1 时，geo 和 znre 完全不生效
if (!APPEND_ENABLED) {
    async function operator(proxies) {
        if (!proxies?.length) return proxies;
        let result = [];

        if (!USE_CUSTOM) {
            proxies.forEach(proxy => {
                proxy.name = PREFIX + proxy.name.trim() + SUFFIX;
                result.push(proxy);
            });
        } else {
            // 循环命名逻辑（生肖、塔罗等）保持原样，此处省略具体实现
            // ... getBaseName、nameGroups 处理 ...
        }

        return result;
    }
} else {
    // zn=1 时，才处理 znre、geo 等后续逻辑
    const DEFAULT_APPEND = " | GPT";
    let APPEND_TEXT = DEFAULT_APPEND;
    if (args_upper.ZNRE !== undefined) {
        const custom = decodeURI(args_upper.ZNRE).trim();
        if (custom) APPEND_TEXT = custom;
    }

    const GEO_ENABLED   = (args_upper.GEO === "1" || args_upper.GEO === 1);
    const USE_INTERNAL  = (args_upper.INTERNAL === "1" || args_upper.INTERNAL === 1);

    // 默认 format：成功时用国旗 + 代码 + ｜，失败时强制 "未知｜"
    const DEFAULT_GEO_FORMAT = "{{api.flag}} {{api.countryCode}}" + SEP + "{{proxy.name}}";
    const GEO_FORMAT = args_upper.FORMAT ? decodeURI(args_upper.FORMAT) : DEFAULT_GEO_FORMAT;

    // 不支持 GPT 地区关键词
    const hkTwKeywords = [
        '香港', '港', 'HK', 'HKG', 'HongKong', 'Hong Kong', '九龙', '新界',
        '台湾', '台灣', '台', 'TW', 'Taiwan', 'Taipei', 'TPE', '桃園', '桃园',
        '中国', '大陆', 'CN', 'China', '北京', '上海', '广州', '深圳',
        '俄罗斯', 'RU', 'Russia', '伊朗', 'IR', 'Iran', '朝鲜', '北韩', 'KP',
        '古巴', 'Cuba', '叙利亚', 'SY', 'Syria', '阿富汗', 'AF', '白俄罗斯', 'BY',
    ];
    const hkTwRegex = new RegExp(hkTwKeywords.join('|'), 'i');

    // 循环命名数组（请补全 ZODIAC、TAROT_EN 等，此处省略）
    // const ZODIAC = [...];
    // const SUPER_DIGITS = {...};

    function toSuperscript(num) {
        if (num <= 0) return '';
        return num.toString().split('').map(c => SUPER_DIGITS[c] || c).join('');
    }

    function getFlagEmoji(cc) {
        if (!cc || cc.length !== 2) return "?";
        const offset = 127397;
        return String.fromCodePoint(...cc.toUpperCase().split('').map(c => offset + c.charCodeAt(0) - 65));
    }

    async function operator(proxies) {
        if (!proxies?.length) return proxies;

        let result = [];

        // 第一阶段：基础重命名
        if (!USE_CUSTOM) {
            proxies.forEach(proxy => {
                proxy.name = PREFIX + proxy.name.trim() + SUFFIX;
                result.push(proxy);
            });
        } else {
            let getBaseName = (idx) => {
                if (GM_MODE.toLowerCase() === "生肖") {
                    const z = ZODIAC[idx % 12];
                    const cycle = Math.floor(idx / 12);
                    return cycle > 0 ? z + cycle : z;
                }
                // ... 其他模式判断
                else {
                    return GM_MODE;
                }
            };

            const nameGroups = {};
            proxies.forEach((proxy, idx) => {
                const base = getBaseName(idx);
                if (!nameGroups[base]) nameGroups[base] = [];
                nameGroups[base].push(proxy);
            });

            Object.entries(nameGroups).forEach(([base, nodes]) => {
                const count = nodes.length;
                nodes.forEach((node, i) => {
                    let part = base;
                    if (count > 1) part += toSuperscript(i + 1);
                    node.name = PREFIX + part + SUFFIX;
                    result.push(node);
                });
            });
        }

        // 第二阶段：geo=1 时测落地
        if (GEO_ENABLED) {
            await Promise.allSettled(result.map(async proxy => {
                let apiData = { flag: "", countryCode: "未知" }; // 失败默认只设 countryCode 为“未知”

                try {
                    const url = USE_INTERNAL ? "http://checkip.amazonaws.com" : "http://ip-api.com/json?lang=zh-CN";
                    const res = await $http.get({
                        url,
                        "policy-descriptor": proxy,
                        timeout: 8000,
                    });

                    if (USE_INTERNAL) {
                        const ip = (res.body || "").trim();
                        const cc = $utils?.geoip?.(ip) || "未知";
                        apiData = {
                            countryCode: cc,
                            flag: getFlagEmoji(cc),
                            aso: $utils?.ipaso?.(ip) || ""
                        };
                    } else {
                        const json = JSON.parse(res.body || "{}");
                        const cc = json.countryCode || "未知";
                        apiData = {
                            ...json,
                            countryCode: cc,
                            flag: getFlagEmoji(cc)
                        };
                    }

                    proxy._geo = apiData;
                } catch (e) {
                    proxy._geo = { error: true };
                    // 失败时 apiData 保持 {flag: "", countryCode: "未知"}
                }

                // 统一替换命名
                let formattedName = GEO_FORMAT.replace(/\{\{proxy\.name\}\}/g, proxy.name)
                                             .replace(/\{\{api\.([^\}]+)\}\}/g, (_, k) => apiData[k] || "");

                // 如果测失败（_geo 有 error），强制覆盖为 “未知｜原名”
                if (proxy._geo?.error) {
                    formattedName = `未知${SEP}${proxy.name}`;
                }

                proxy.name = formattedName;
            }));
        }

        // 第三阶段：追加 APPEND_TEXT
        result = result.map(proxy => {
            let shouldAppend = false;

            const useGeo = GEO_ENABLED && proxy._geo && !proxy._geo.error;

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

            return proxy;
        });

        return result;
    }
}
