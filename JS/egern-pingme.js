/*
@Name：PingMe 自动化签到+视频奖励
@Author：怎么肥事 https://raw.githubusercontent.com/ZenmoFeiShi/Qx/refs/heads/main/PingMe.js
@modify Linsar 重构适配
@date 2026-04-20 12:00:00

let checkinCookie = "";
let enableCapture = true;
const COOKIE_CACHE_KEY = "pingme_capture_v3";

if (typeof $argument !== "undefined" && $argument) {
    try {
        let arg = typeof $argument === "string" ? JSON.parse($argument) : $argument;
        const isValid = (val) => val && val.trim() !== "xxx" && val.trim() !== "无" && val.trim().toLowerCase() !== "none";
        checkinCookie = isValid(arg.PM_COOKIE) ? String(arg.PM_COOKIE) : "";
        if (arg.ENABLE_CAPTURE !== undefined) {
            enableCapture = (arg.ENABLE_CAPTURE === "true" || arg.ENABLE_CAPTURE === "1" || arg.ENABLE_CAPTURE === true);
        }
    } catch (e) {
        console.log("[PM] 解析参数错误: " + e);
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
        console.log("[PM] 抓取开关已关闭");
        return;
    }
    const allHeaders = $request.headers || {};
    const getHeader = (name) => allHeaders[name] ?? allHeaders[name.toLowerCase()] ?? allHeaders[name.toUpperCase()];
    const cookie = getHeader("Cookie") || getHeader("cookie");
    if (!cookie) {
        console.log("[PM] Cookie为空");
        $notification.post("PingMe Cookie获取失败", "", "未找到Cookie");
    } else {
        const success = $persistentStore.write(cookie, COOKIE_CACHE_KEY);
        if (success) {
            console.log("[PM] Cookie保存成功");
            $notification.post("PingMe Cookie获取成功", "", "已保存，请关闭抓取开关");
        } else {
            console.log("[PM] Cookie保存失败");
            $notification.post("PingMe Cookie保存失败", "", "写入失败");
        }
    }
}

async function handleCheckin() {
    let finalCookie = checkinCookie || $persistentStore.read(COOKIE_CACHE_KEY);
    if (!finalCookie) {
        console.log("[PM] 无Cookie");
        $notification.post("PingMe签到", "❌ 无法签到", "请打开抓取开关重新抓取Cookie");
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
        const body = resp.body || "";
        let obj = {};
        try { obj = JSON.parse(body); } catch (e) {}
        
        if (resp.status >= 200 && resp.status < 300 && obj.retcode === 0) {
            const msg = (obj.result?.bonusHint || obj.retmsg || "签到成功").replace(/\n/g, " ");
            console.log("[PM] 签到成功: " + msg);
            $notification.post("PingMe签到", "✅ 成功", msg);
        } else {
            const content = obj?.retmsg || body.substring(0, 150) || "未知错误";
            console.log("[PM] 签到失败: " + content);
            $notification.post("PingMe签到", "❌ 失败", content);
        }
    } catch (error) {
        const errStr = error?.error || error?.message || String(error);
        console.log("[PM] 网络异常: " + errStr);
        $notification.post("PingMe签到", "⚠️ 网络异常", errStr);
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
