/*
 * PingMe 获取参数脚本
 * 作者：Linsar
 * 使用说明：开启 MITM 后，打开 PingMe App 任意页面即可自动抓取
 */

const $ = new Env('PingMe获取Cookie');
const ENABLE_CAPTURE = {{{ENABLE_CAPTURE}}};
if (!ENABLE_CAPTURE) {
    console.log('PingMe Cookie抓取已关闭');
    $.done();
}
const req_url = $request.url;
const req_headers = $request.headers;
try {
    if (req_url.includes('/app/queryBalanceAndBonus')) {
        console.log('PingMe 开始捕获');
        const capture = {
            url: req_url,
            paramsRaw: parseRawQuery(req_url),
            headers: normalizeHeaderNameMap(req_headers || {})
        };
        $.write(JSON.stringify(capture), '#pingme_capture_v3');
        console.log('PingMe 捕获成功，已保存到本地');
        sendNotification('PingMe Cookie 获取成功 ✅', '已自动保存，请关闭抓取开关', req_url);
    }
} catch (e) {
    console.log('脚本运行出现错误：' + e.message);
    sendNotification('PingMe 获取Cookie 错误 ❌', e.message, '');
}
$.done();
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
function sendNotification(title, subtitle, body) {
    if (typeof $notification !== 'undefined') {
        $notification.post(title, subtitle, body);
    } else if (typeof $notify !== 'undefined') {
        $notify(title, subtitle, body);
    } else {
        console.log(`${title}\n${subtitle}\n${body}`);
    }
}
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;"POST"===e&&(s=this.post);const i=new Promise(((e,i)=>{s.call(this,t,((t,s,o)=>{t?i(t):e(s)}))}));return t.timeout?((t,e=1e3)=>Promise.race([t,new Promise(((t,s)=>{setTimeout((()=>{s(new Error("请求超时"))}),e)}))]))(i,t.timeout):i}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.logLevels={debug:0,info:1,warn:2,error:3},this.logLevelPrefixs={debug:"[DEBUG] ",info:"[INFO] ",warn:"[WARN] ",error:"[ERROR] "},this.logLevel="info",this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}getEnv(){return"undefined"!=typeof $environment&&$environment["surge-version"]?"Surge":"undefined"!=typeof $environment&&$environment["stash-version"]?"Stash":"undefined"!=typeof module&&module.exports?"Node.js":"undefined"!=typeof $task?"Quantumult X":"undefined"!=typeof $loon?"Loon":"undefined"!=typeof $rocket?"Shadowrocket":void 0}isNode(){return"Node.js"===this.getEnv()}isQuanX(){return"Quantumult X"===this.getEnv()}isSurge(){return"Surge"===this.getEnv()}isLoon(){return"Loon"===this.getEnv()}isShadowrocket(){return"Shadowrocket"===this.getEnv()}isStash(){return"Stash"===this.getEnv()}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null,...s){try{return JSON.stringify(t,...s)}catch{return e}}getjson(t,e){let s=e;if(this.getdata(t))try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise((e=>{this.get({url:t},((t,s,i)=>e(i)))}))}runScript(t,e){return new Promise((s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let o=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");o=o?1*o:20,o=t.timeout?t.timeout:o;const[r,a]=i.split("@"),n={url:`http://${r}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:o},headers:{"Content-Type":"application/json"}};this.post(n,((t,e,i)=>s(i)))}))}}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t);this.fs.writeFileSync(s?t:e,JSON.stringify(this.data),{flag:"w"})}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let o=t;for(const t of i)if(o=Object(o)[t],void 0===o)return s;return o}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{}),t[e[e.length-1]]=s),t)}getdata(t){let e=this.data[t];if(void 0===e){let s=null;try{s=JSON.parse(localStorage.getItem(t))}catch(t){}void 0!==s&&(e=s)}return e}setdata(t,e){try{this.data[e]=t}catch(t){}}has(t){return void 0!==this.data[t]}unset(t){delete this.data[t]}getkeys(){return Object.keys(this.data)}count(){return Object.keys(this.data).length}run(t,e){return Promise.resolve().then(t).catch(e)}sleep(t){return new Promise((e=>setTimeout(e,t)))}log(t,...e){t=String(t),this.logs.push(t),console.log(`${this.name}:\n${t}`,e)}logErr(t){if(!this.isMute){if(t=String(t),"string"==typeof t)this.log(`${this.logLevelPrefixs.error}${this.name}:\n${t}`);else{this.log(`${this.logLevelPrefixs.error}${this.name}:\n${JSON.stringify(t)}`)}}}info(t){console.log(t)}error(t){console.log(t)}wait(t){return new Promise((e=>setTimeout(e,t)))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕐 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}}(t,e)}
