/*
@Name：PingMe 自动化签到+视频奖励
@Author：怎么肥事 https://raw.githubusercontent.com/ZenmoFeiShi/Qx/refs/heads/main/PingMe.js
@modify Linsar 完全重构
@date 2026-04-20 12:00:00
// ================= 全局参数解析区 =================
let checkinCookie = "";
let tgToken = "";
let tgUserId = "";
let notifyOnlyFail = false;
let enableCapture = true;
const COOKIE_CACHE_KEY = "pingme_capture_v3";

if (typeof $argument !== "undefined" && $argument) {
    try {
        let arg = typeof $argument === "string" ? JSON.parse($argument) : $argument;
        const isValid = (val) => val && val.trim() !== "xxx" && val.trim() !== "无" && val.trim().toLowerCase() !== "none";
        checkinCookie = isValid(arg.PM_COOKIE) ? String(arg.PM_COOKIE) : "";
        tgToken = isValid(arg.TG_BOT_TOKEN) ? String(arg.TG_BOT_TOKEN) : "";
        tgUserId = isValid(arg.TG_USER_ID) ? String(arg.TG_USER_ID) : "";
        notifyOnlyFail = (arg.TG_NOTIFY_ONLY_FAIL === "true" || arg.TG_NOTIFY_ONLY_FAIL === "1" || arg.TG_NOTIFY_ONLY_FAIL === true);
        if (arg.ENABLE_CAPTURE !== undefined) {
            enableCapture = (arg.ENABLE_CAPTURE === "true" || arg.ENABLE_CAPTURE === "1" || arg.ENABLE_CAPTURE === true);
        }
    } catch (e) {
        console.log("[PM签到] 解析参数错误: " + e + ", argument: " + $argument);
    }
}

const isGetHeader = typeof $request !== "undefined";

(async () => {
    if (isGetHeader) {
        handleCaptureCookie();
    } else {
        await handleCheckin();
    }
})().finally(() => {
    $done({});
});

function handleCaptureCookie() {
    if (!enableCapture) {
        console.log("[PM签到] 抓取开关已关闭，跳过。");
        return;
    }
    const allHeaders = $request.headers || {};
    const getHeader = (name) => allHeaders[name] ?? allHeaders[name.toLowerCase()] ?? allHeaders[name.toUpperCase()];
    const cookie = getHeader("Cookie") || getHeader("cookie");
    if (!cookie) {
        console.log("[PM签到] ⚠️ 提取 Cookie 为空");
        $notification.post("PingMe Cookie 获取失败", "", "未能从请求中找到 Cookie，请重新访问页面。");
    } else {
        const success = $persistentStore.write(cookie, COOKIE_CACHE_KEY);
        if (success) {
            console.log("[PM签到] ✨ 成功保存 Cookie");
            $notification.post("PingMe Cookie 获取成功", "", "Cookie 已保存，请关闭【抓取开关】。");
        } else {
            console.log("[PM签到] ❌ 保存 Cookie 失败");
            $notification.post("PingMe Cookie 保存失败", "", "写入存储失败，请检查权限。");
        }
    }
}

async function handleCheckin() {
    let finalCookie = checkinCookie || $persistentStore.read(COOKIE_CACHE_KEY);
    if (!finalCookie) {
        const msg = "未检测到 Cookie，请打开抓取开关重新抓取。";
        console.log("[PM签到] " + msg);
        $notification.post("PingMe签到", "❌ 无法签到", msg);
        await sendTgNotify("<b>❌ PingMe 签到失败</b>\n\n原因: <code>未检测到 Cookie，请检查配置！</code>");
        return;
    }

    const url = "https://api.pingmeapp.net/app/checkIn";
    const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "Cookie": finalCookie
    };

    try {
        const resp = await fetchPromise({ url, method: "POST", headers, body: "" });
        await processCheckinResponse(resp);
    } catch (error) {
        const errStr = error?.error || error?.message || String(error);
        console.log(`[PM签到] 网络请求异常: ${errStr}`);
        $notification.post("PingMe签到", "⚠️ 网络请求异常", errStr);
        await sendTgNotify(`<b>⚠️ PingMe 签到网络异常</b>\n\n详情: <code>${escapeHtml(errStr)}</code>`);
    }
}

async function processCheckinResponse(resp) {
    const status = resp.status;
    const body = resp.body || "";
    let obj = {};
    try { obj = JSON.parse(body); } catch (e) {}
    const content = obj?.retmsg || body.substring(0, 150) || "无详情";

    if (status >= 200 && status < 300 && obj.retcode === 0) {
        const msgs = [];
        msgs.push(`✅ 签到：${(obj.result?.bonusHint || obj.retmsg || '').replace(/\n/g, ' ')}`);
        
        try {
            const balResp = await fetchPromise({
                url: "https://api.pingmeapp.net/app/queryBalanceAndBonus",
                method: "GET",
                headers: { "Cookie": $persistentStore.read(COOKIE_CACHE_KEY) }
            });
            const balObj = JSON.parse(balResp.body || "{}");
            if (balObj.retcode === 0 && balObj.result) {
                msgs.push(`💰 余额：${balObj.result.balance} Coins`);
            }
        } catch (e) {
            console.log("[PM签到] 查询余额失败: " + e);
        }

        try {
            const vidResp = await fetchPromise({
                url: "https://api.pingmeapp.net/app/videoBonus",
                method: "POST",
                headers: { "Cookie": $persistentStore.read(COOKIE_CACHE_KEY) },
                body: ""
            });
            const vidObj = JSON.parse(vidResp.body || "{}");
            if (vidObj.retcode === 0) {
                msgs.push(`🎬 视频奖励：已领取`);
            } else {
                msgs.push(`🎬 视频奖励：${vidObj.retmsg || "未领取"}`);
            }
        } catch (e) {
            console.log("[PM签到] 视频奖励失败: " + e);
        }

        const summary = msgs.join("\n");
        console.log("[PM签到] " + summary);
        $notification.post("PingMe签到", "✅ 签到成功", summary);
        if (!notifyOnlyFail) {
            await sendTgNotify(`<b>🎉 PingMe 自动签到成功</b>\n\n${escapeHtml(summary)}`);
        }
    } else if (status === 403) {
        console.log(`[PM签到] ⚠️ 403风控: ${content}`);
        $notification.post("PingMe签到", "⚠️ 403 风控拦截", content);
        await sendTgNotify(`<b>⚠️ PingMe 签到被风控(403)</b>\n\n详情: <code>${escapeHtml(content)}</code>`);
    } else if (status === 500) {
        console.log(`[PM签到] ❌ 500错误: ${content}`);
        $notification.post("PingMe签到", "❌ 服务器内部错误", content);
        await sendTgNotify(`<b>❌ PingMe 签到服务器错误(500)</b>\n\n详情: <code>${escapeHtml(content)}</code>`);
    } else {
        console.log(`[PM签到] ❓ 异常状态码 ${status}: ${content}`);
        $notification.post("PingMe签到", `❓ 异常 (${status})`, content);
        await sendTgNotify(`<b>❓ PingMe 签到异常 (${status})</b>\n\n详情: <code>${escapeHtml(content)}</code>`);
    }
}

function fetchPromise(request) {
    return new Promise((resolve, reject) => {
        const method = (request.method || "GET").toUpperCase();
        const options = { url: request.url, headers: request.headers || {} };
        if (request.body !== undefined && request.body !== null) {
            options.body = request.body;
        }
        const callback = (error, response, data) => {
            if (error) {
                reject(error);
            } else {
                resolve({
                    status: response.status || response.statusCode,
                    body: data,
                    headers: response.headers
                });
            }
        };
        if (method === "POST") {
            $httpClient.post(options, callback);
        } else {
            $httpClient.get(options, callback);
        }
    });
}

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function sendTgNotify(text) {
    if (!tgToken || !tgUserId) return;
    const tgUrl = `https://api.telegram.org/bot${tgToken}/sendMessage`;
    const requestOpts = {
        url: tgUrl,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: tgUserId,
            text: text,
            parse_mode: "HTML",
            disable_web_page_preview: true
        })
    };
    try {
        const resp = await fetchPromise(requestOpts);
        if (resp.status !== 200) {
            console.log(`[TG_Notify] ❌ 推送失败, 状态码: ${resp.status}, 响应: ${resp.body}`);
        }
    } catch (error) {
        const errStr = error?.error || error?.message || String(error);
        console.log(`[TG_Notify] ❌ 推送网络异常: ${errStr}`);
    }
}
