/*
 * @author fmz200（https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/cookie/get_cookie.js）
 * @modify Linsar（Egern完整适配 + 所有App弹通知）
 * @function 获取应用的cookie或token通用脚本
 * @date 2026-04-17
 */

const $ = new API("获取Cookie通用脚本");

const req_url = $request.url;
const req_headers = $request.headers;
const req_body = $request.body || "";
let rsp_body = "{}";

if (typeof $response !== 'undefined' && $response !== null) {
    rsp_body = $response.body || "{}";
}

console.log("🔍 开始处理请求 - URL: " + req_url);

// ==================== 各App获取逻辑（全部弹出通知）===================

/** PingMe */
if (req_url.includes("/app/queryBalanceAndBonus")) {
    console.log('🚀 PingMe 开始获取参数');
    const capture = {
        url: req_url,
        paramsRaw: parseRawQuery(req_url),
        headers: normalizeHeaderNameMap(req_headers || {})
    };
    const captureStr = JSON.stringify(capture);
    $.write(captureStr, '#pingme_capture_v3');
    $.notify('🎉 PingMe 获取参数成功', '已保存最新请求头和参数', '现在可以运行签到脚本了！', { "open-url": req_url });
    console.log('PingMe 获取到的完整URL：' + req_url);
}

/** 奇瑞汽车App */
if (req_url.includes("/web/user/current/details?")) {
    const regex = /access_token=([^&]*)/;
    let match = req_url.match(regex);
    const access_token = match ? match[1] : "";
    let rsp_data = JSON.parse(rsp_body);
    if (rsp_data.data?.accountId) {
        let accountId = rsp_data.data.accountId;
        let displayName = rsp_data.data.displayName || "";
        let cache = $.read("#fmz200_chery_account") || "[]";
        let json_data = JSON.parse(cache);
        updateOrAddObject(json_data, "accountId", accountId, "access_token", access_token, "displayName", displayName);
        $.write(JSON.stringify(json_data, null, "\t"), '#fmz200_chery_account');
        $.notify('奇瑞汽车App 获取token成功✅', "", access_token);
    }
}

/** 什么值得买 */
if (req_url.includes("/user-api.smzdm.com/users/info")) {
    const cookie = req_headers['Cookie'] || req_headers['cookie'] || "";
    let regex = /smzdm_id=(\d+)/;
    let match = cookie.match(regex);
    let smzdm_id = match ? match[1] : "";
    $.write(cookie, '#SMZDM_COOKIE');
    $.notify('什么值得买 获取cookie成功✅', "", cookie);
}

/** 拼多多果园 */
if (req_url.includes("/proxy/api/api/server/_stm")) {
    const cookieValue = req_headers["Cookie"] || req_headers["cookie"] || "";
    const token = cookieValue.match(/PDDAccessToken=.+?/) ? cookieValue.match(/PDDAccessToken=.+?/)[0] : "";
    if (token) {
        $.write(token, '#ddgyck');
        $.write(token, '#fmz200_pdd_token');
        $.notify('拼多多果园 token获取成功', token, token);
    }
}

/** 美团 */
if (req_url.includes("/user/v1/info/auditting") || req_url.includes("/mapi/usercenter")) {
    const token = req_headers['token'] || req_headers['Token'] || "";
    if (token) {
        $.write(token, '#meituanCookie');
        $.notify('美团获取token成功✅', "单账号更新成功", token);
    }
}

/** 微博 */
if (req_url.includes("/users/show")) {
    let uidPattern = /uid=(\d+)/;
    let match = req_url.match(uidPattern);
    if (match) {
        $.notify('微博获取cookie 成功✅', "你可以在日志中查看本次获取的数据", "");
    } else {
        $.notify('微博获取cookie 未获取到UID❗️', "", "");
    }
}

/** 顺丰速运 */
if (req_url.includes("/mcs-mimp/share/weChat/shareGiftReceiveRedirect") || req_url.includes("/mcs-mimp/share/app/shareRedirect")) {
    $.write(req_url, '#sfsyBee');
    $.write(req_url, '#fmz200_sf_bee');
    $.notify('顺丰速运 获取成功✅', req_url, req_url);
}

/** 滴滴果园 */
if (req_url.includes("/api/game/plant/newWatering")) {
    let data = JSON.parse(req_body);
    let uid = data.uid;
    let newToken = data.token;
    let cache = $.read("#fmz200_didi_fruit") || "{}";
    let json_data = parseDataString(cache);
    updateToken(uid, newToken, json_data);
    let string_data = convertDataToString(json_data);
    $.write(string_data, '#ddgyToken');
    $.write(string_data, '#fmz200_didi_fruit');
    $.notify('滴滴果园token 获取成功✅', string_data, string_data);
}

/** 滴滴打车 */
if (req_url.includes("/login/v5/signInByOpenid")) {
    let data = JSON.parse(rsp_body);
    let uid = data.uid;
    let ticket = data.ticket;
    let cache = $.read("#fmz200_didi_ticket") || "";
    let json_data = parseDataString(cache);
    updateToken(uid, ticket, json_data);
    let string_data = convertDataToString(json_data);
    $.write(string_data, '#fmz200_didi_ticket');
    $.notify('滴滴打车 获取成功✅', string_data, string_data);
}

/** 晓晓优选 */
if (req_url.includes("xxyx-client-api.xiaoxiaoyouxuan.com/my")) {
    const token = req_headers['xx-token'] || "";
    if (token) {
        $.notify('晓晓优选token 获取成功✅', '', '');
    }
}

$.done();

// ====================== 辅助函数 ======================
function parseRawQuery(url) {
    const query = (url.split('?')[1] || '').split('#')[0];
    const rawMap = {};
    query.split('&').forEach(pair => {
        if (!pair) return;
        const idx = pair.indexOf('=');
        if (idx < 0) return;
        const k = pair.slice(0, idx);
        const v = pair.slice(idx + 1);
        rawMap[k] = v;
    });
    return rawMap;
}

function normalizeHeaderNameMap(headers) {
    const out = {};
    Object.keys(headers || {}).forEach(k => out[k] = headers[k]);
    return out;
}

function parseDataString(dataString) {
    let data = {};
    let parts = dataString.split(/[\n@]/);
    parts.forEach(part => {
        let [uid, token] = part.split("&");
        if (uid && token) data[uid] = token;
    });
    return data;
}

function updateOrAddObject(collection, ...args) {
    if (args.length % 2 !== 0) throw new Error('Arguments must be provided in pairs.');
    for (let i = 0; i < args.length; i += 2) {
        const id = args[i];
        const key = args[i + 1];
        const index = collection.findIndex(obj => obj[id] === key);
        if (index !== -1) {
            for (let j = i + 2; j < args.length; j += 2) {
                collection[index][args[j]] = args[j + 1];
            }
        } else {
            const newObj = {};
            for (let j = i; j < args.length; j += 2) {
                newObj[args[j]] = args[j + 1];
            }
            collection.push(newObj);
            break;
        }
    }
}

function updateToken(uidToUpdate, newToken, data) {
    data[uidToUpdate] = newToken;
}

function convertDataToString(data) {
    let result = "";
    for (let uid in data) {
        if (data.hasOwnProperty(uid)) result += `${uid}&${data[uid]}@`;
    }
    return result.slice(0, -1);
}

/*********************************** Egern兼容API *************************************/
function API(e = "untitled") {
    return new class {
        write(e, t) {
            if (typeof $persistentStore !== 'undefined') $persistentStore.write(e, t);
            else if (typeof $prefs !== 'undefined') $prefs.setValueForKey(e, t);
        }
        read(e) {
            if (typeof $persistentStore !== 'undefined') return $persistentStore.read(e);
            else if (typeof $prefs !== 'undefined') return $prefs.valueForKey(e);
            return null;
        }
        notify(title, subtitle = "", body = "", opts = {}) {
            if (typeof $notification !== 'undefined') $notification.post(title, subtitle, body);
            else if (typeof $notify !== 'undefined') $notify(title, subtitle, body, opts);
            else console.log(`📢 ${title}\n${subtitle}\n${body}`);
        }
        done() {
            if (typeof $done !== 'undefined') $done();
        }
    }();
}
