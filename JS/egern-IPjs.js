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

    function usageText(t) {
        if (!t) return '';
        var map = {
            'ISP': '家宽', 'BUSINESS': '商宽', 'HOSTING': '服务器', 'CDN': 'CDN',
            'EDU': '教育网', 'GOV': '政府', 'MIL': '军网', 'RESERVED': '保留',
            'UNKNOWN': '未知'
        };
        return map[t] || t;
    }

    function UnlockRow(title, value, gap) {
        var color = value === 'Unlock' ? C_GREEN : (value === 'Cross' ? C_RED : C_YELLOW);
        return {
            type: 'stack', direction: 'row', alignItems: 'center', gap: gap || 6,
            children: [
                { type: 'text', text: title, font: { size: 13 }, textColor: C_SUB, width: 60 },
                { type: 'text', text: value, font: { size: 13, weight: 'semibold' }, textColor: color, maxLines: 1 }
            ]
        };
    }

    var ip = ctx.ip || (await safe(async () => {
        var res = await get('https://api.ipify.org?format=json');
        var j = jp(res);
        return j ? j.ip : null;
    })) || '获取失败';

    var rIpapi = await safe(async () => jp(await get('https://api.ipapi.is/?q=' + ip)));

    var rIp2loc = await safe(async () => jp(await get('https://api.ip2location.io/?key=demo&ip=' + ip)));

    var ipapiD = rIpapi || {};
    var cc = (ipapiD.location && ipapiD.location.country_code) || '';
    var country = (ipapiD.location && ipapiD.location.country) || '';
    var city = (ipapiD.location && ipapiD.location.city) || '';
    var loc = (toFlag(cc) + ' ' + country + ' ' + city).trim() || '未知位置';
    var showIP = markIP ? maskIP(ip) : ip;
    var asnText = '本地IP: ' + showIP + ' 本地位置: ' + loc;
    var hosting = usageText(rIp2loc && rIp2loc.usageType);
    var hostingShort = rIp2loc && rIp2loc.usageType ? rIp2loc.usageType : '';

    var results = await Promise.all([
        safe(() => gradeIppure(rIpapi && rIpapi.threat && rIpapi.threat.ippure_score)),
        safe(() => gradeIpapi(rIpapi)),
        safe(() => gradeIp2loc(rIp2loc && rIp2loc.threatScore)),
        safe(() => gradeScam(await get('https://scamalytics.com/ip/' + ip))),
        safe(() => gradeDbip(await get('https://db-ip.com/' + ip))),
        safe(() => get('https://chat.openai.com/cdn-cgi/trace').then(t => t.includes('cf-ipcountry=') ? 'Unlock' : 'Cross')),
        safe(() => get('https://gemini.google.com/cdn-cgi/trace').then(t => t.includes('cf-ipcountry=') ? 'Unlock' : 'Cross')),
        safe(() => get('https://www.netflix.com/title/80057281').then(t => /netflix/i.test(t) ? 'Unlock' : 'Cross')),
        safe(() => get('https://www.tiktok.com').then(t => /tiktok/i.test(t) ? 'Unlock' : 'Cross')),
        safe(() => get('https://www.youtube.com/premium').then(t => /premium/i.test(t) ? 'Unlock' : 'Cross'))
    ]);

    var uGPT = results[5] || "Cross", uGemini = results[6] || "Cross";
    var uNetflix = results[7] || "Cross", uTikTok = results[8] || "Cross";
    var uYouTube = results[9] || "Cross";

    var execTime = Math.round((Date.now() - startTime) / 1000 * 10) / 10 + 's';

    var family = ctx.widgetFamily || 'systemMedium';

    if (family === 'systemMedium') {
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

        return {
            type: 'widget', padding: [10, 12], gap: 5, backgroundColor: BG_COLOR,
            children: [
                {
                    type: 'stack', direction: 'row', alignItems: 'center', gap: 4,
                    children: [
                        { type: 'image', src: 'sf-symbol:shield.lefthalf.filled', color: C_TITLE, width: 14, height: 14 },
                        { type: 'text', text: 'IP检测', font: { size: 10, weight: 'heavy' }, textColor: C_TITLE },
                        { type: 'text', text: showIP, font: { size: 10, weight: 'bold', family: 'Menlo' }, textColor: C_GREEN },
                        { type: 'spacer' },
                        { type: 'text', text: hosting || '', font: { size: 10, weight: 'bold' }, textColor: C_SUB }
                    ]
                },
                { type: 'text', text: asnText, font: { size: 10, weight: 'bold' }, textColor: C_GREEN, maxLines: 1 },
                {
                    type: 'stack', direction: 'row', gap: 8, flex: 1,
                    children: unlockRows
                }
            ]
        };
    }

    if (family === 'systemLarge' || family === 'systemExtraLarge') {
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
            UnlockRow('YouTube', uYouTube)
        ];

        return {
            type: 'widget', padding: 16, gap: 8, backgroundColor: BG_COLOR,
            children: [
                {
                    type: 'stack', direction: 'row', alignItems: 'center', gap: 6,
                    children: [
                        { type: 'image', src: 'sf-symbol:shield.lefthalf.filled', color: C_TITLE, width: 18, height: 18 },
                        { type: 'text', text: 'IP检测', font: { size: 15, weight: 'heavy' }, textColor: C_TITLE },
                        { type: 'spacer' }
                    ]
                },
                { type: 'text', text: asnText, font: { size: 13, weight: 'bold' }, textColor: C_GREEN, maxLines: 1 },
                { type: 'text', text: loc, font: { size: 13 }, textColor: C_MAIN, maxLines: 1 },
                {
                    type: 'stack', direction: 'column', gap: 6,
                    children: lgUnlockRows
                }
            ]
        };
    }

    return {
        type: 'widget', padding: 12, gap: 6, backgroundColor: BG_COLOR,
        children: [
            { type: 'text', text: 'IP检测', font: { size: 13, weight: 'heavy' }, textColor: C_TITLE },
            { type: 'text', text: asnText, font: { size: 12, weight: 'bold' }, textColor: C_GREEN }
        ]
    };
}
