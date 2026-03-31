/**
 * IP multi-source purity check widget + Streaming/AI unlock detection
 * Sources: IPPure / ipapi.is / IP2Location / Scamalytics / DB-IP / ipregistry / ipinfo
 * Unlock: ChatGPT / Gemini / Netflix / TikTok / YouTube Premium
 * Env: POLICY, MARK_IP
 */
export default async function (ctx) {
    var BG_COLOR = { light: '#FFFFFF', dark: '#1C1C1E' };
    var C_TITLE = { light: '#1A1A1A', dark: '#FFD700' };
    var C_SUB = { light: '#666666', dark: '#B0B0B0' };
    var C_MAIN = { light: '#1A1A1A', dark: '#FFFFFF' };
    var C_GREEN = { light: '#32D74B', dark: '#32D74B' };
    var C_YELLOW = { light: '#FFD60A', dark: '#FFD60A' };
    var C_ORANGE = { light: '#FF9500', dark: '#FF9500' };
    var C_RED = { light: '#FF3B30', dark: '#FF3B30' };
    var C_ICON_IP = { light: '#007AFF', dark: '#0A84FF' };
    var C_ICON_LO = { light: '#5856D6', dark: '#5E5CE6' };
    var C_ICON_SC = { light: '#AF52DE', dark: '#BF5AF2' };
    var C_BLUE = { light: '#007AFF', dark: '#0A84FF' };

    var policy = ctx.env.POLICY || "";
    var markIP = (ctx.env.MARK_IP || "").toLowerCase() === "true";

    var BASE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

    var startTime = Date.now();

    async function safe(fn) { try { return await fn(); } catch (e) { return null; } }

    async function get(url, headers) {
        var opts = { timeout: 10000 };
        if (headers) opts.headers = headers;
        if (policy && policy !== "DIRECT") opts.policy = policy;
        var res = await ctx.http.get(url, opts);
        return await res.text();
    }

    async function post(url, body, headers) {
        var opts = { timeout: 10000, body: body };
        if (headers) opts.headers = headers;
        if (policy && policy !== "DIRECT") opts.policy = policy;
        var res = await ctx.http.post(url, opts);
        return await res.text();
    }

    async function getRaw(url, headers, extraOpts) {
        var opts = { timeout: 10000 };
        if (headers) opts.headers = headers;
        if (policy && policy !== "DIRECT") opts.policy = policy;
        if (extraOpts) { for (var k in extraOpts) opts[k] = extraOpts[k]; }
        return await ctx.http.get(url, opts);
    }

    function jp(s) { try { return JSON.parse(s); } catch (e) { return null; } }
    function ti(v) { var n = Number(v); return Number.isFinite(n) ? Math.round(n) : null; }

    function maskIP(ip) {
        if (!ip) return '';
        if (ip.includes('.')) { var p = ip.split('.'); return p[0] + '.' + p[1] + '.*.*'; }
        var p6 = ip.split(':'); return p6[0] + ':' + p6[1] + ':*:*:*:*:*:*';
    }

    function toFlag(code) {
        if (!code) return '\uD83C\uDF10';
        var c = code.toUpperCase();
        if (c === 'TW') c = 'CN';
        if (c.length !== 2) return '\uD83C\uDF10';
        return String.fromCodePoint(c.charCodeAt(0) + 127397, c.charCodeAt(1) + 127397);
    }

    function gradeIppure(score) {
        var s = ti(score); if (s === null) return null;
        if (s >= 80) return { sev: 4, t: 'IPPure: \u6781\u9AD8 (' + s + ')' };
        if (s >= 70) return { sev: 3, t: 'IPPure: \u9AD8\u5371 (' + s + ')' };
        if (s >= 40) return { sev: 1, t: 'IPPure: \u4E2D\u7B49 (' + s + ')' };
        return { sev: 0, t: 'IPPure: \u4F4E\u5371 (' + s + ')' };
    }

    function gradeIpapi(j) {
        if (!j || !j.company || !j.company.abuser_score) return null;
        var m = String(j.company.abuser_score).match(/([0-9.]+)\s*\(([^)]+)\)/);
        if (!m) return null;
        var pct = Math.round(Number(m[1]) * 10000) / 100 + '%';
        var lv = String(m[2]).trim();
        var map = { 'Very Low': 0, 'Low': 0, 'Elevated': 2, 'High': 3, 'Very High': 4 };
        var sev = map[lv] !== undefined ? map[lv] : 2;
        var tags = [];
        if (j.is_vpn) tags.push('VPN');
        if (j.is_proxy) tags.push('Proxy');
        if (j.is_tor) tags.push('Tor');
        if (j.is_abuser) tags.push('Abuser');
        var tagStr = tags.length ? ' ' + tags.join('/') : '';
        return { sev: sev, t: 'ipapi: ' + lv + ' (' + pct + ')' + tagStr };
    }

    function gradeIp2loc(score) {
        var s = ti(score); if (s === null) return null;
        if (s >= 66) return { sev: 3, t: 'IP2Location: \u9AD8\u5371 (' + s + ')' };
        if (s >= 33) return { sev: 1, t: 'IP2Location: \u4E2D\u5371 (' + s + ')' };
        return { sev: 0, t: 'IP2Location: \u4F4E\u5371 (' + s + ')' };
    }

    function gradeScam(html) {
        if (!html) return null;
        var m = html.match(/Fraud\s*Score[:\s]*(\d+)/i) || html.match(/class="score"[^>]*>(\d+)/i);
        var s = m ? ti(m[1]) : null; if (s === null) return null;
        if (s >= 90) return { sev: 4, t: 'Scamalytics: \u6781\u9AD8 (' + s + ')' };
        if (s >= 60) return { sev: 3, t: 'Scamalytics: \u9AD8\u5371 (' + s + ')' };
        if (s >= 20) return { sev: 1, t: 'Scamalytics: \u4E2D\u5371 (' + s + ')' };
        return { sev: 0, t: 'Scamalytics: \u4F4E\u5371 (' + s + ')' };
    }

    function gradeDbip(html) {
        if (!html) return null;
        var m = html.match(/Estimated threat level for this IP address is\s*<span[^>]*>\s*([^<\s]+)\s*</i);
        var lv = (m ? m[1] : '').toLowerCase();
        if (lv === 'high') return { sev: 3, t: 'DB-IP: \u9AD8\u5371' };
        if (lv === 'medium') return { sev: 1, t: 'DB-IP: \u4E2D\u7B49' };
        return { sev: 0, t: 'DB-IP: \u4F4E\u5371' };
    }

    function gradeIpreg(j, ipinfo) {
        if (!j) return null;
        var tags = [];
        if (j.is_vpn) tags.push('VPN');
        if (j.is_proxy) tags.push('Proxy');
        if (j.is_tor) tags.push('Tor');
        if (ipinfo && ipinfo.privacy && ipinfo.privacy.proxy) tags.push('Proxy');
        var tagStr = tags.length ? ' ' + tags.join('/') : '';
        return { sev: tags.length ? 2 : 0, t: 'ipregistry: ' + (tags.length ? tags.join('/') : 'Clean') + tagStr };
    }

    function usageText(t) {
        if (!t) return '';
        var m = { 'isp': 'ISP', 'hosting': 'Hosting', 'business': 'Business', 'education': 'Edu', 'gov': 'Gov', 'military': 'Mil' };
        return m[t] || t;
    }

    function sevIcon(sev) {
        if (sev >= 4) return 'exclamationmark.triangle.fill';
        if (sev >= 3) return 'exclamationmark.circle.fill';
        if (sev >= 2) return 'exclamationmark.circle';
        return 'checkmark.circle.fill';
    }

    function sevColor(sev) {
        if (sev >= 4) return C_RED;
        if (sev >= 3) return C_ORANGE;
        if (sev >= 2) return C_YELLOW;
        return C_GREEN;
    }

    function sevText(sev) {
        if (sev >= 4) return '\u6781\u9AD8\u98CE\u9669';
        if (sev >= 3) return '\u9AD8\u5371';
        if (sev >= 2) return '\u4E2D\u7B49\u98CE\u9669';
        return '\u5B89\u5168';
    }

    function Row(icon, iconColor, label, value, valueColor) {
        return {
            type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
            children: [
                { type: 'image', src: 'sf-symbol:' + icon, color: iconColor, width: 14, height: 14 },
                { type: 'text', text: label, font: { size: 10 }, textColor: C_SUB },
                { type: 'spacer' },
                { type: 'text', text: value, font: { size: 10, weight: 'bold', family: 'Menlo' }, textColor: valueColor, maxLines: 1 }
            ]
        };
    }

    function UnlockRow(title, status, size) {
        var s = size || 13;
        var color = status === "\u2705" ? C_GREEN : C_RED;
        return {
            type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
            children: [
                { type: 'text', text: title, font: { size: s - 1 }, textColor: C_SUB, maxLines: 1 },
                { type: 'spacer' },
                { type: 'text', text: status, font: { size: s, weight: 'bold' }, textColor: color }
            ]
        };
    }

    function ScoreRow(g, size) {
        var s = size || 13;
        return {
            type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
            children: [
                { type: 'text', text: g.t, font: { size: s - 2 }, textColor: C_SUB, maxLines: 1 },
                { type: 'spacer' }
            ]
        };
    }

    // 主逻辑开始
    var ippureScore = null;
    var ip = ctx.ip || (await safe(async () => {
        var res = await get('https://api.ipify.org?format=json');
        var j = jp(res);
        return j ? j.ip : null;
    })) || '获取失败';

    // 并行：数据库查询 + 解锁检测
    var results = await Promise.all([
        safe(function () { return fetchIpapi(ip); }),
        safe(function () { return fetchIp2loc(ip); }),
        safe(function () { return fetchIpinfo(ip); }),
        safe(function () { return fetchDbip(ip); }),
        safe(function () { return fetchScam(ip); }),
        safe(function () { return fetchIpreg(ip); }),
        safe(checkChatGPT),
        safe(checkGemini),
        safe(checkNetflix),
        safe(checkTikTok),
        safe(checkYouTube)
    ]);
    var rIpapi = results[0], rIp2loc = results[1], rIpinfo = results[2];
    var rDbip = results[3], rScam = results[4], rIpreg = results[5];
    var uGPT = results[6] || "\u274C", uGemini = results[7] || "\u274C";
    var uNetflix = results[8] || "\u274C", uTikTok = results[9] || "\u274C";
    var uYouTube = results[10] || "\u274C";

    var execTime = Math.round((Date.now() - startTime) / 1000 * 10) / 10 + 's';

    var ipapiD = rIpapi || {};
    var asnText = (ipapiD.asn && ipapiD.asn.asn) ? ('AS' + ipapiD.asn.asn + ' ' + (ipapiD.asn.org || '')).trim() : '\u672A\u77E5';
    var cc = (ipapiD.location && ipapiD.location.country_code) || '';
    var country = (ipapiD.location && ipapiD.location.country) || '';
    var city = (ipapiD.location && ipapiD.location.city) || '';
    var loc = (toFlag(cc) + ' ' + country + ' ' + city).trim() || '\u672A\u77E5\u4F4D\u7F6E';
    var hosting = usageText(rIp2loc && rIp2loc.usageType);
    var hostingShort = rIp2loc && rIp2loc.usageType ? rIp2loc.usageType : '';

    var grades = [
        gradeIppure(ippureScore),
        gradeIpapi(rIpapi),
        gradeIp2loc(rIp2loc && rIp2loc.fraudScore),
        gradeScam(rScam),
        gradeDbip(rDbip),
        gradeIpreg(rIpreg, rIpinfo),
    ].filter(Boolean);

    var maxSev = 0;
    for (var i = 0; i < grades.length; i++) {
        if (grades[i].sev > maxSev) maxSev = grades[i].sev;
    }
    var showIP = markIP ? maskIP(ip) : ip;
    var ipLabel = ip.includes(':') ? 'IPv6' : 'IP';

    var asnText = '本地IP: ' + showIP + ' 本地位置: ' + loc;

    var family = ctx.widgetFamily || 'systemMedium';

    if (family === 'accessoryRectangular') {
        return {
            type: 'widget', padding: [4, 8], gap: 2,
            children: [
                {
                    type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
                        { type: 'image', src: 'sf-symbol:' + sevIcon(maxSev), width: 12, height: 12 },
                        { type: 'text', text: 'IP\u98CE\u9669: ' + sevText(maxSev), font: { size: 'caption1', weight: 'bold' } },
                    ]
                },
                { type: 'text', text: showIP, font: { size: 'caption2', family: 'Menlo' } },
                { type: 'text', text: loc, font: { size: 'caption2' }, maxLines: 1 },
            ]
        };
    }
    if (family === 'accessoryCircular') {
        return {
            type: 'widget', padding: 4, gap: 2,
            children: [
                { type: 'image', src: 'sf-symbol:' + sevIcon(maxSev), width: 20, height: 20 },
                { type: 'text', text: sevText(maxSev), font: { size: 'caption2', weight: 'bold' }, maxLines: 1, minScale: 0.5 },
            ]
        };
    }
    if (family === 'accessoryInline') {
        return {
            type: 'widget', children: [
                { type: 'text', text: 'IP\u98CE\u9669: ' + sevText(maxSev) + ' | ' + showIP, font: { size: 'caption1' } },
            ]
        };
    }

    if (family === 'systemSmall') {
        return {
            type: 'widget', padding: 12, gap: 6, backgroundColor: BG_COLOR,
            children: [
                {
                    type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
                        { type: 'image', src: 'sf-symbol:shield.lefthalf.filled', color: C_TITLE, width: 14, height: 14 },
                        { type: 'text', text: 'IP \u7EAF\u51C0\u5EA6', font: { size: 13, weight: 'heavy' }, textColor: C_TITLE },
                    ]
                },
                Row(sevIcon(maxSev), sevColor(maxSev), '\u98CE\u9669', sevText(maxSev), sevColor(maxSev)),
                Row('globe', C_ICON_IP, ipLabel, showIP, C_GREEN),
                Row('mappin.and.ellipse', C_ICON_LO, '\u4F4D\u7F6E', loc, C_MAIN),
            ]
        };
    }

    if (family === 'systemMedium') {
        var headerRow = {
            type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
            children: [
                { type: 'image', src: 'sf-symbol:shield.lefthalf.filled', color: C_TITLE, width: 14, height: 14 },
                { type: 'text', text: 'IP检测', font: { size: 10, weight: 'heavy' }, textColor: C_TITLE },
                { type: 'text', text: showIP, font: { size: 10, weight: 'bold', family: 'Menlo' }, textColor: C_GREEN, maxLines: 1 },
                { type: 'spacer' },
            ]
        };
        if (hostingShort) {
            headerRow.children.push({ type: 'text', text: hosting, font: { size: 10, weight: 'bold' }, textColor: C_SUB });
        }
        headerRow.children.push({ type: 'image', src: 'sf-symbol:' + sevIcon(maxSev), color: sevColor(maxSev), width: 12, height: 12 });
        headerRow.children.push({ type: 'text', text: sevText(maxSev), font: { size: 10, weight: 'bold' }, textColor: sevColor(maxSev) });

        var unlockRows = [
            {
                type: 'stack', direction: 'column', gap: 2,
                children: [
                    UnlockRow('GPT', uGPT, 10),
                    UnlockRow('Gemini', uGemini, 10),
                    UnlockRow('YouTube', uYouTube, 10),
                ]
            },
            {
                type: 'stack', direction: 'column', gap: 2,
                children: [
                    UnlockRow('Netflix', uNetflix, 10),
                    UnlockRow('TikTok', uTikTok, 10),
                    {
                        type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
                        children: [
                            { type: 'image', src: 'sf-symbol:clock.fill', color: C_SUB, width: 10, height: 10 },
                            { type: 'text', text: '执行时间', font: { size: 10 }, textColor: C_SUB },
                            { type: 'spacer' },
                            { type: 'text', text: execTime, font: { size: 10, weight: 'bold' }, textColor: C_MAIN, maxLines: 1 },
                        ]
                    }
                ]
            }
        ];

        var scoreRows = [];
        for (var i = 0; i < grades.length; i++) {
            scoreRows.push(ScoreRow(grades[i], 10));
        }

        return {
            type: 'widget', padding: [10, 12], gap: 5, backgroundColor: BG_COLOR,
            children: [
                headerRow,
                Row('number.square.fill', C_ICON_IP, '归属', asnText, C_GREEN),
                Row('mappin.and.ellipse', C_ICON_LO, '位置', loc, C_MAIN),
                {
                    type: 'stack', direction: 'row', gap: 8, flex: 1, children: [
                        { type: 'stack', direction: 'column', gap: 3, flex: 1, children: unlockRows },
                        { type: 'stack', direction: 'column', gap: 3, flex: 1, children: scoreRows },
                    ]
                },
            ]
        };
    }

    var lgUnlockRows = [
        UnlockRow('ChatGPT', uGPT),
        UnlockRow('Gemini', uGemini),
        UnlockRow('Netflix', uNetflix),
        UnlockRow('TikTok', uTikTok),
        {
            type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
            children: [
                { type: 'image', src: 'sf-symbol:clock.fill', color: C_SUB, width: 13, height: 13 },
                { type: 'text', text: '执行时间', font: { size: 13 }, textColor: C_SUB },
                { type: 'spacer' },
                { type: 'text', text: execTime, font: { size: 13, weight: 'bold' }, textColor: C_MAIN, maxLines: 1 },
            ]
        },
        UnlockRow('YouTube', uYouTube),
    ];

    var lgInfoRows = [
        Row('globe', C_ICON_IP, ipLabel, showIP, C_GREEN),
        Row('number.square.fill', C_ICON_IP, '\u5F52\u5C5E', asnText, C_GREEN),
        Row('mappin.and.ellipse', C_ICON_LO, '\u4F4D\u7F6E', loc, C_MAIN),
        Row('building.2', C_ICON_SC, '类型', hosting || '未知', C_MAIN),
    ];

    return {
        type: 'widget', padding: 16, gap: 8, backgroundColor: BG_COLOR,
        children: [
            {
                type: 'stack', direction: 'row', alignItems: 'center', gap: 6,
                children: [
                    { type: 'image', src: 'sf-symbol:shield.lefthalf.filled', color: C_TITLE, width: 18, height: 18 },
                    { type: 'text', text: 'IP检测', font: { size: 15, weight: 'heavy' }, textColor: C_TITLE },
                    { type: 'spacer' },
                    { type: 'image', src: 'sf-symbol:' + sevIcon(maxSev), color: sevColor(maxSev), width: 16, height: 16 },
                    { type: 'text', text: sevText(maxSev), font: { size: 13, weight: 'bold' }, textColor: sevColor(maxSev) },
                ]
            },
            {
                type: 'stack', direction: 'column', gap: 6, children: lgInfoRows
            },
            {
                type: 'stack', direction: 'column', gap: 8, children: lgUnlockRows
            }
        ]
    };
}
​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​​
