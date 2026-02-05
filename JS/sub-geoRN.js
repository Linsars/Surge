// ==UserScript==
// @name         智慧重命名 - 支持 GPT 区判断 + GeoIP 查询（完整合并版）
// @version      1.5
// @description  重命名 + 循环命名 + zn追加GPT + geo=1时真实测出口国家判断追加
// @author       Linsar
// @example      #qz=repo&gm=生肖&zn=1&geo=1&znre=|NF+GPT
// ==/UserScript==

const args = $arguments || {};

// 参数大写化
const args_upper = {};
for (const key in args) {
    args_upper[key.toUpperCase()] = args[key];
}

// ── 重命名参数 ────────────────────────────────────────
const PREFIX = args_upper.QZ ? decodeURI(args_upper.QZ) + (args_upper.FGF || "｜") : "";
const SUFFIX = args_upper.HZ ? (args_upper.FGF || "｜") + decodeURI(args_upper.HZ) : "";
const SEP = args_upper.FGF || "｜";

const GM_MODE = args_upper.GM ? decodeURI(args_upper.GM).trim() : "";
const USE_CUSTOM = !!GM_MODE;

// ── 追加控制 ────────────────────────────────────────
const APPEND_ENABLED = (args_upper.ZN === "1" || args_upper.ZN === 1);
const GEO_ENABLED = args_upper.GEO === "1" || args_upper.GEO === 1;  // geo 默认关闭

let APPEND_TEXT = args_upper.ZNRE !== undefined ? decodeURI(args_upper.ZNRE) : " | GPT";
if (APPEND_TEXT.trim() === "") APPEND_TEXT = " | GPT";

// 节点名 fallback 关键词
const hkTwKeywords = ['香港','港','🇭🇰','HK','HKG','Taiwan','TW','台湾','中国','大陆','CN','Russia','RU','伊朗','IR','朝鲜','KP','古巴','CU','叙利亚','SY','阿富汗','AF','白俄罗斯','BY','缅甸','MM'];
const hkTwRegex = new RegExp(hkTwKeywords.join('|'), 'i');

// ── 循环命名数组 ────────────────────────────────────────
const ZODIAC = ["子鼠","丑牛","寅虎","卯兔","辰龙","巳蛇","午马","未羊","申猴","酉鸡","戌狗","亥猪"];
const TAROT_EN = ["Fool","Magician","High Priestess","Empress","Emperor","Hierophant","Lovers","Chariot","Strength","Hermit","Wheel of Fortune","Justice","Hanged Man","Death","Temperance","Devil","Tower","Star","Moon","Sun","Judgement","World"];
const TAROT_CN = ["愚者","魔术师","女祭司","皇后","皇帝","教皇","恋人","战车","力量","隐士","命运之轮","正义","倒吊人","死神","节制","恶魔","塔","星星","月亮","太阳","审判","世界"];
const SINS = ["傲慢","嫉妒","暴怒","懒惰","贪婪","暴食","色欲"];
const ANGELS_EN = ["Michael","Gabriel","Raphael","Uriel","Raguel","Sariel","Remiel","Zadkiel","Jophiel","Chamuel","Haniel","Barachiel"];
const ANGELS_CN = ["米迦勒","加百列","拉斐尔","乌列尔","拉贵尔","萨列尔","雷米尔","扎基尔","约菲尔","卡麦尔","哈尼尔","巴拉基勒"];
const VAMPIRE_RANKS = ["Fledgling","Neonate","Ancilla","Elder","Methuselah","Antediluvian","Baron","Count","Duke","Prince","Archon","Justicar"];
const SOLAR_TERMS = ["立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至","小寒","大寒"];
const TANG_OFFICIALS = ["宰相","尚书","侍郎","郎中","员外郎","御史","太守","刺史","县令","主簿","司空","司徒","司马","太尉","中书令","门下侍中","尚书令","给事中","谏议大夫","大夫","卿","将军","校尉","都督"];
const DOUPO_LEVELS = ["斗之气","斗者","斗师","大斗师","斗灵","斗王","斗皇","斗宗","斗尊","斗圣","斗帝"];
const DOULUO_LEVELS = ["魂士","魂师","大魂师","魂尊","魂宗","魂王","魂帝","魂圣","魂斗罗","封号斗罗","神级"];

const SUPER_DIGITS = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};

function toSuperscript(num) {
    if (num <= 0) return '';
    return num.toString().split('').map(c => SUPER_DIGITS[c] || c).join('');
}

// ── GeoIP 部分完整移植（你的原脚本核心） ────────────────────────────────
const $ = $substore || {};  // 兼容 Sub-Store 环境
const { isLoon, isSurge, isNode } = $.env || {};

let format = args_upper.FORMAT || '{{proxy.name}} {{api.countryEmoji}} {{api.countryCode}}';
let apiUrl = args_upper.API || 'https://api.ip.sb/geoip';

const surge_http_api = args_upper.SURGE_HTTP_API;
const surge_http_api_protocol = args_upper.SURGE_HTTP_API_PROTOCOL || 'http';
const surge_http_api_key = args_upper.SURGE_HTTP_API_KEY;
const surge_http_api_enabled = !!surge_http_api;

const internal = args_upper.INTERNAL;
const cacheEnabled = args_upper.CACHE !== '0';
const concurrency = parseInt(args_upper.CONCURRENCY ||50);

const cache = {};  // 简易缓存，实际可用 scriptResourceCache 如果有

// 生成国旗
function getCountryEmoji(cc) {
    if (typeof cc !== 'string' || cc.length !== 2) return '';
    return cc.toUpperCase().replace(/[A-Z]/g, c => String.fromCodePoint(c.charCodeAt(0) + 127397));
}

// lodash_get 简版
function lodash_get(obj, path, def) {
    path = path.replace(/\[(\d+)\]/g, '.$1').split('.');
    let res = obj;
    for (let p of path) {
        res = res?.[p];
        if (res === undefined) return def;
    }
    return res;
}

// formatter 原样
function formatter({ proxy = {}, api = {}, format = '', regex = '' }) {
    if (regex) {
        // regex 提取逻辑原样（省略，如果你不用可删）
    }
    let f = format.replace(/\{\{(.*?)\}\}/g, '${$1}');
    return eval(`\`${f}\``);
}

// 执行并发任务
async function executeAsyncTasks(tasks, { concurrency = 1 } = {}) {
    return new Promise((resolve, reject) => {
        let running = 0, index = 0;
        function next() {
            while (index < tasks.length && running < concurrency) {
                const i = index++;
                running++;
                tasks[i]().finally(() => { running--; next(); });
            }
            if (running === 0) resolve();
        }
        next();
    });
}

// http 请求（关键部分，原样保留 Surge/Loon 兼容写法）
async function http(opt = {}) {
    const METHOD = opt.method || 'get';
    const TIMEOUT = parseFloat(opt.timeout || 5000);
    const RETRIES = parseFloat(opt.retries ?? 1);
    const RETRY_DELAY = parseFloat(opt.retry_delay ?? 1000);

    let count = 0;
    const fn = async () => {
        try {
            if (surge_http_api_enabled) {
                // Surge HTTP API 模式
                const res = await $.http.post({
                    url: `${surge_http_api_protocol}://${surge_http_api}/v1/scripting/evaluate`,
                    timeout: TIMEOUT / 1000,
                    headers: { 'x-key': surge_http_api_key, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        script_text: `$httpClient.get(${JSON.stringify({...opt, timeout: TIMEOUT / 1000})}, (error, response, data) => { $done({ error, response, data }) })`,
                        mock_type: 'cron',
                        timeout: TIMEOUT / 1000,
                    }),
                });
                let body = String(lodash_get(res, 'body'));
                try { body = JSON.parse(body); } catch {}
                const error = lodash_get(body, 'result.error');
                if (error) throw new Error(error);
                let data = String(lodash_get(body, 'result.data'));
                let response = String(lodash_get(body, 'result.response'));
                return { ...response, body: data };
            } else {
                // 标准 $.http
                return await $.http[METHOD]({ ...opt, timeout: TIMEOUT });
            }
        } catch (e) {
            if (count < RETRIES) {
                count++;
                await new Promise(r => setTimeout(r, RETRY_DELAY * count));
                return fn();
            }
            throw e;
        }
    };
    return fn();
}

async function operator(proxies = []) {
    if (!proxies?.length) return proxies;

    let result = [];

    // 第一阶段：你的智慧重命名逻辑
    if (!USE_CUSTOM) {
        proxies.forEach(proxy => {
            proxy.name = PREFIX + proxy.name.trim() + SUFFIX;
            result.push(proxy);
        });
    } else {
        let getBaseName;

        if (GM_MODE === "生肖") {
            getBaseName = (index) => {
                const zIdx = index % 12;
                const cycle = Math.floor(index / 12);
                let z = ZODIAC[zIdx];
                if (cycle > 0) z += cycle;
                return z;
            };
        }
        else if (GM_MODE === "塔罗") {
            getBaseName = (index) => {
                const tIdx = index % 22;
                const cycle = Math.floor(index / 22);
                let card = TAROT_EN[tIdx];
                if (cycle > 0) card += cycle;
                return card;
            };
        }
        else if (GM_MODE === "塔罗X") {
            getBaseName = (index) => {
                const tIdx = index % 22;
                const cycle = Math.floor(index / 22);
                let card = TAROT_CN[tIdx];
                if (cycle > 0) card += cycle;
                return card;
            };
        }
        else if (GM_MODE === "罪") {
            getBaseName = (index) => {
                const sIdx = index % 7;
                const cycle = Math.floor(index / 7);
                let sin = SINS[sIdx];
                if (cycle > 0) sin += cycle;
                return sin;
            };
        }
        else if (GM_MODE === "天使") {
            getBaseName = (index) => {
                const aIdx = index % 12;
                const cycle = Math.floor(index / 12);
                let angel = ANGELS_EN[aIdx];
                if (cycle > 0) angel += cycle;
                return angel;
            };
        }
        else if (GM_MODE === "天使X") {
            getBaseName = (index) => {
                const aIdx = index % 12;
                const cycle = Math.floor(index / 12);
                let angel = ANGELS_CN[aIdx];
                if (cycle > 0) angel += cycle;
                return angel;
            };
        }
        else if (GM_MODE === "血族") {
            getBaseName = (index) => {
                const vIdx = index % VAMPIRE_RANKS.length;
                const cycle = Math.floor(index / VAMPIRE_RANKS.length);
                let rank = VAMPIRE_RANKS[vIdx];
                if (cycle > 0) rank += cycle;
                return rank;
            };
        }
        else if (GM_MODE === "节气") {
            getBaseName = (index) => {
                const sIdx = index % SOLAR_TERMS.length;
                const cycle = Math.floor(index / SOLAR_TERMS.length);
                let term = SOLAR_TERMS[sIdx];
                if (cycle > 0) term += cycle;
                return term;
            };
        }
        else if (GM_MODE === "唐朝") {
            getBaseName = (index) => {
                const oIdx = index % TANG_OFFICIALS.length;
                const cycle = Math.floor(index / TANG_OFFICIALS.length);
                let official = TANG_OFFICIALS[oIdx];
                if (cycle > 0) official += cycle;
                return official;
            };
        }
        else if (GM_MODE === "斗罗") {
            getBaseName = (index) => {
                const dIdx = index % DOUPO_LEVELS.length;
                const cycle = Math.floor(index / DOUPO_LEVELS.length);
                let level = DOUPO_LEVELS[dIdx];
                if (cycle > 0) level += cycle;
                return level;
            };
        }
        else if (GM_MODE === "斗破") {
            getBaseName = (index) => {
                const dIdx = index % DOULUO_LEVELS.length;
                const cycle = Math.floor(index / DOULUO_LEVELS.length);
                let level = DOULUO_LEVELS[dIdx];
                if (cycle > 0) level += cycle;
                return level;
            };
        }
        else {
            getBaseName = () => GM_MODE;
        }

        const nameGroups = {};
        proxies.forEach((proxy, idx) => {
            const base = getBaseName(idx);
            proxy._base = base;
            if (!nameGroups[base]) nameGroups[base] = [];
            nameGroups[base].push(proxy);
        });

        Object.keys(nameGroups).forEach(base => {
            const nodes = nameGroups[base];
            const count = nodes.length;

            nodes.forEach((node, i) => {
                let part = base;
                if (count > 1) {
                    const sup = toSuperscript(i + 1);
                    part += sup;
                }
                node.name = PREFIX + part + SUFFIX;
                delete node._base;
                result.push(node);
            });
        });
    }

    // 保存原始名字，用于 znre fallback
    result.forEach(p => {
        p.original_name = p.name;
    });

    // 第二阶段：如果 geo=1，跑 GeoIP 查询并改名
    if (GEO_ENABLED) {
        await executeAsyncTasks(
            result.map(proxy => async () => {
                const id = cacheEnabled ? `geo:${apiUrl}:${format}:${JSON.stringify(proxy.server || proxy)}` : undefined;
                const cached = cacheEnabled ? cache[id] : null;

                if (cached) {
                    if (cached.api) {
                        proxy.name = formatter({ proxy, api: cached.api, format });
                        proxy._geo = cached.api;
                        return;
                    }
                }

                try {
                    const node = ProxyUtils?.produce?.([proxy], isSurge ? 'Surge' : isLoon ? 'Loon' : undefined);  // 假设有 ProxyUtils
                    if (!node) return;

                    // 加 fallback：主 ip.sb，失败切 ip-api.com
                    const geoApis = [
                        'https://api.ip.sb/geoip',
                        'http://ip-api.com/json?lang=zh-CN'
                    ];
                    let apiData = null;

                    for (const url of geoApis) {
                        try {
                            const res = await http({
                                method: 'get',
                                url: url,
                                'policy-descriptor': node,
                                node,
                                timeout: 9000,
                                headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }
                            });

                            let body = String(res.body || '');
                            try { apiData = JSON.parse(body); } catch {}

                            // 统一字段
                            if (apiData.country_code || apiData.countryCode) {
                                apiData.countryCode = apiData.country_code || apiData.countryCode || '';
                                apiData.countryEmoji = getCountryEmoji(apiData.countryCode);
                                proxy.name = formatter({ proxy, api: apiData, format });
                                proxy._geo = apiData;
                                if (cacheEnabled) cache[id] = { api: apiData };
                                return;  // 成功就直接返回，不再试下一个
                            }
                        } catch (e) {
                            // 这个 url 失败，继续下一个
                        }
                    }

                    // 所有 fallback 都失败
                    if (cacheEnabled) cache[id] = {};

                } catch (e) {
                    if (cacheEnabled) cache[id] = {};
                }
            }),
            { concurrency }
        );
    }

    // 第三阶段：追加 GPT 文本（zn=1）
    if (APPEND_ENABLED) {
        result = result.map(p => {
            let append = APPEND_TEXT;
            let isSupported = false;

            if (GEO_ENABLED && p._geo?.countryCode) {
                // geo 开了，用测出来的 countryCode 判断
                // 只要有 countryCode 且不是空字符串，就算支持（相当于“已成功测到归属地”）
                if (p._geo.countryCode.trim() !== '') {
                    isSupported = true;
                }
            } else {
                // geo 没开，回退用节点名关键词判断
                if (hkTwRegex.test(p.name)) {
                    isSupported = true;
                }
            }

            if (!isSupported) {
                if (GEO_ENABLED && !p._geo?.countryCode) {
                    append = " | 未知" + append;
                }
                p.name += append;
            }

            return p;
        });
    }

    return result;
}
