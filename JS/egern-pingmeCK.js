/*
 * PingMe 获取参数脚本（Egern 专用）
 * 打开 PingMe App 任意页面即可自动抓取
 */

const $ = new Env('PingMe获取参数');

if ($request && $request.url.includes("/app/queryBalanceAndBonus")) {
    const capture = {
        url: $request.url,
        paramsRaw: parseRawQuery($request.url),
        headers: normalizeHeaderNameMap($request.headers || {})
    };

    const arg = $argument ? JSON.parse($argument) : {};
    const ENABLE_CAPTURE = arg.ENABLE_CAPTURE !== false;

    if (ENABLE_CAPTURE) {
        $.setdata(JSON.stringify(capture), 'pingme_capture_v3');
        $.msg('🎉 PingMe 获取参数成功', '已保存最新请求头和参数', '现在可以运行签到脚本了！\n建议关闭抓取开关');
        console.log('✅ PingMe 参数已保存到 pingme_capture_v3');
    } else {
        console.log('抓取开关已关闭，跳过保存');
    }
}

$.done();

function parseRawQuery(url) {
    const query = (url.split('?')[1] || '').split('#')[0];
    const rawMap = {};
    query.split('&').forEach(pair => {
        if (!pair) return;
        const idx = pair.indexOf('=');
        if (idx < 0) return;
        rawMap[pair.slice(0, idx)] = pair.slice(idx + 1);
    });
    return rawMap;
}

function normalizeHeaderNameMap(headers) {
    const out = {};
    Object.keys(headers).forEach(k => out[k] = headers[k]);
    return out;
}

function Env(name) {
    return new class {
        setdata(val, key) {
            if (typeof $persistentStore !== 'undefined') $persistentStore.write(val, key);
            else if (typeof $prefs !== 'undefined') $prefs.setValueForKey(val, key);
        }
        msg(title, subtitle, body) {
            if (typeof $notification !== 'undefined') $notification.post(title, subtitle, body);
            else if (typeof $notify !== 'undefined') $notify(title, subtitle, body);
            else console.log(`${title}\n${subtitle}\n${body}`);
        }
        done() { if (typeof $done !== 'undefined') $done(); }
    }();
}
