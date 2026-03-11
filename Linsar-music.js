/**
 * @name Linsar music dev (LX-style)
 * @version 1.0.4-merged
 * @author Linsar
 *
 * 说明
 *  - 将此文件导入到 LX 自定义源或者 歌一刀自定义源
 *  - 六音脚本将从 SIX_YIN_EXTERNAL_URL 拉取并 eval 作为兜底（可改为内嵌字符串）
 */
const { EVENT_NAMES, request, on, send, utils } = globalThis.lx || {};
const CONFIG = {
  DEV_ENABLE: false,
  UPDATE_ENABLE: false,
  API_URL: "https://m-api.ceseet.me",
  GD_API_BASE: "https://music-api.gdstudio.xyz/api.php",
  QSVIP_PROXY: "https://proxy.qishui.vsaa.cn/qishui/proxy",
  QQ_API_KEY: "",
  CACHE_TTL: 5 * 60 * 1000,
  REQUEST_TIMEOUT: 15000,
  LIUYIN_RAW_URL: "https://raw.githubusercontent.com/Linsars/Surge/main/liuyin1.2.1Max.js"
};
const MUSIC_QUALITY = {
  tx: ["128k", "320k", "flac", "flac24bit"],
  kg: ["128k", "320k", "flac", "flac24bit"],
  kw: ["128k", "320k", "flac", "flac24bit"],
  wy: ["128k", "320k", "flac"],
  mg: ["128k", "320k"],
  qsvip: ["128k", "320k", "flac", "flac24bit"],
  local: []
};
const MUSIC_SOURCES = Object.keys(MUSIC_QUALITY).concat(["local", "liuyin"]);
const cache = new Map();
function setCache(key, value, ttl = CONFIG.CACHE_TTL) {
  cache.set(key, { value, expire: Date.now() + ttl });
}
function getCache(key) {
  const v = cache.get(key);
  if (!v) return null;
  if (Date.now() > v.expire) {
    cache.delete(key);
    return null;
  }
  return v.value;
}
const httpFetch = (url, options = { method: "GET" }) =>
  new Promise((resolve, reject) => {
    try {
      const opts = Object.assign({}, options);
      if (!opts.timeout) opts.timeout = CONFIG.REQUEST_TIMEOUT;
      request(url, opts, (err, resp) => {
        if (err) return reject(err);
        let body = resp.body;
        if (typeof body === "string") {
          const t = body.trim();
          if ((t.startsWith("{") || t.startsWith("[")) && t.length < 2000000) {
            try { body = JSON.parse(t); } catch (e) {}
          }
        }
        resolve({ statusCode: resp.statusCode, headers: resp.headers || {}, body });
      });
    } catch (e) {
      reject(e);
    }
  });
const handleBase64Encode = (data) => {
  try {
    const buf = utils && utils.buffer ? utils.buffer.from(data, "utf-8") : Buffer.from(data, "utf-8");
    return (utils && utils.buffer && utils.buffer.bufToString) ? utils.buffer.bufToString(buf, "base64") : buf.toString("base64");
  } catch (e) {
    return Buffer.from(String(data), "utf-8").toString("base64");
  }
};
function pickId(musicInfo) {
  if (!musicInfo) return "";
  return (musicInfo.id || musicInfo.songmid || musicInfo.songId || musicInfo.hash || musicInfo.rid || musicInfo.mid || musicInfo.mediaId || "").toString();
}
function mapQualityForApi(type) {
  if (!type) return "320k";
  const t = String(type).toLowerCase();
  if (["128k", "320k", "flac", "flac24bit"].includes(t)) return t;
  return "320k";
}
async function handleLocalMusicUrl(musicInfo) {
  if (!musicInfo || !musicInfo.songmid) throw new Error("missing musicInfo");
  if (!musicInfo.songmid.startsWith("server_")) throw new Error("unsupported local file");
  const songId = musicInfo.songmid.replace("server_", "");
  const requestBody = { p: songId };
  const b = handleBase64Encode(JSON.stringify(requestBody)).replace(/\+/g, "-").replace(/\//g, "_");
  const checkUrl = `${CONFIG.API_URL}/local/c?q=${b}`;
  const resp = await httpFetch(checkUrl, { method: "GET", headers: { "X-Request-Key": CONFIG.API_KEY || "" } });
  if (resp && resp.body && resp.body.code === 0 && resp.body.data && resp.body.data.file) {
    return `${CONFIG.API_URL}/local/u?q=${b}`;
  }
  throw new Error("404 Not Found");
}
async function handleQsvipMusicUrl(musicInfo, quality) {
  const id = pickId(musicInfo);
  if (!id) return "";
  const q = (function map(t) {
    switch ((t || "").toLowerCase()) {
      case "128k": return "low";
      case "320k": return "standard";
      case "flac": return "lossless";
      case "flac24bit": return "hi_res";
      default: return "standard";
    }
  })(quality);
  const url = `${CONFIG.GD_API_BASE}&types=song&source=qishui&id=${encodeURIComponent(id)}&level=${encodeURIComponent(q)}`;
  try {
    const r = await httpFetch(url, { method: "GET" });
    if (r && r.body) {
      if (r.body.url) return r.body.url;
      if (r.body.data && Array.isArray(r.body.data) && r.body.data[0] && r.body.data[0].url) return r.body.data[0].url;
    }
  } catch (e) {}
  const fallback = `http://api.vsaa.cn/api/music.qishui.vip?act=song&id=${encodeURIComponent(id)}&quality=${encodeURIComponent(q)}`;
  try {
    const r2 = await httpFetch(fallback, { method: "GET" });
    if (r2 && r2.body && r2.body.data && r2.body.data[0] && r2.body.data[0].url) return r2.body.data[0].url;
  } catch (e) {}
  return "";
}
async function getUrlFromGdApi(apiSource, songId, br) {
  const url = `${CONFIG.GD_API_BASE}?types=url&source=${apiSource}&id=${encodeURIComponent(songId)}&br=${encodeURIComponent(br)}`;
  const r = await httpFetch(url, { method: "GET" });
  if (r && r.body) {
    if (typeof r.body === "object" && r.body.url) return r.body.url;
    if (typeof r.body === "object" && r.body.data && r.body.data.url) return r.body.data.url;
    if (typeof r.body === "string") {
      try {
        const parsed = JSON.parse(r.body);
        if (parsed.url) return parsed.url;
        if (parsed.data && parsed.data.url) return parsed.data.url;
      } catch (e) {}
    }
  }
  throw new Error("parse error");
}
async function handleTxMusicUrl(musicInfo, quality) {
  const songId = musicInfo.hash || musicInfo.songmid || pickId(musicInfo);
  if (!songId) throw new Error("missing id");
  const brMap = { "128k": "128", "320k": "320", "flac": "740", "flac24bit": "999" };
  const br = brMap[mapQualityForApi(quality)] || "320";
  try {
    return await getUrlFromGdApi("tencent", songId, br);
  } catch (e) {
    if (CONFIG.QQ_API_KEY) {
      const params = `?key=${encodeURIComponent(CONFIG.QQ_API_KEY)}&songid=${encodeURIComponent(songId)}&br=${br}`;
      const url = `https://oiapi.net/api/QQ_Music${params}`;
      const r = await httpFetch(url, { method: "GET" });
      if (r && r.body) {
        if (r.body.music) return r.body.music;
        if (r.body.url) return r.body.url;
      }
    }
    throw e;
  }
}
async function handleWyMusicUrl(musicInfo, quality) {
  const songId = musicInfo.songmid || musicInfo.id || pickId(musicInfo);
  if (!songId) throw new Error("missing id");
  const brMap = { "128k": "128", "320k": "320", "flac": "740", "flac24bit": "999" };
  const br = brMap[mapQualityForApi(quality)] || "320";
  try {
    return await getUrlFromGdApi("netease", songId, br);
  } catch (e) {
    try {
      const r = await httpFetch(`https://oiapi.net/api/Music_163?id=${encodeURIComponent(songId)}`, { method: "GET" });
      if (r && r.body && r.body.data) {
        const d = Array.isArray(r.body.data) ? r.body.data[0] : r.body.data;
        if (d && d.url) return d.url;
      }
    } catch (e2) {}
    throw e;
  }
}
async function handleKwMusicUrl(musicInfo, quality) {
  const songId = musicInfo.songmid || musicInfo.id || pickId(musicInfo);
  const brMap = { "128k": "128", "320k": "320", "flac": "flac", "flac24bit": "flac" };
  const br = brMap[mapQualityForApi(quality)] || "320";
  try {
    return await getUrlFromGdApi("kuwo", songId, br);
  } catch (e) {
    try {
      const params = { msg: musicInfo.name || pickId(musicInfo), n: 1, br: br };
      const q = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join("&");
      const r = await httpFetch(`https://oiapi.net/api/Kuwo?${q}`, { method: "GET" });
      if (r && r.body) {
        if (r.body.data && r.body.data.url) return r.body.data.url;
        if (r.body.message) {
          const m = String(r.body.message).match(/https?:\/\/[^\s'"]+/);
          if (m) return m[0];
        }
      }
    } catch (e2) {}
    throw e;
  }
}
async function handleKgMusicUrl(musicInfo, quality) {
  const songId = musicInfo.hash || musicInfo.songmid || pickId(musicInfo);
  if (!songId) throw new Error("missing id");
  const brMap = { "128k": "128", "320k": "320", "flac": "740", "flac24bit": "999" };
  const br = brMap[mapQualityForApi(quality)] || "320";
  return await getUrlFromGdApi("kugou", songId, br);
}
async function handleMgMusicUrl(musicInfo, quality) {
  const songId = musicInfo.copyrightId || musicInfo.songmid || pickId(musicInfo);
  if (!songId) throw new Error("missing id");
  const br = (mapQualityForApi(quality) === "320k") ? "HQ" : "PQ";
  try {
    return await getUrlFromGdApi("migu", songId, br);
  } catch (e) {
    try {
      const r = await httpFetch(`https://api.xcvts.cn/api/music/migu?gm=${encodeURIComponent(musicInfo.name || songId)}&n=1&type=json`, { method: "GET" });
      if (r && r.body && r.body.music_url) return r.body.music_url;
    } catch (e2) {}
    throw e;
  }
}
async function handleLocalPic(musicInfo) {
  if (!musicInfo.songmid || !musicInfo.songmid.startsWith("server_")) throw new Error("unsupported local file");
  const songId = musicInfo.songmid.replace("server_", "");
  const requestBody = { p: songId };
  const b = handleBase64Encode(JSON.stringify(requestBody)).replace(/\+/g, "-").replace(/\//g, "_");
  const checkUrl = `${CONFIG.API_URL}/local/c?q=${b}`;
  const r = await httpFetch(checkUrl, { method: "GET" });
  if (r && r.body && r.body.code === 0 && r.body.data && r.body.data.cover) {
    return `${CONFIG.API_URL}/local/p?q=${b}`;
  }
  throw new Error("get music pic failed");
}
async function handleLocalLyric(musicInfo) {
  if (!musicInfo.songmid || !musicInfo.songmid.startsWith("server_")) throw new Error("unsupported local file");
  const songId = musicInfo.songmid.replace("server_", "");
  const requestBody = { p: songId };
  const b = handleBase64Encode(JSON.stringify(requestBody)).replace(/\+/g, "-").replace(/\//g, "_");
  const checkUrl = `${CONFIG.API_URL}/local/c?q=${b}`;
  const r = await httpFetch(checkUrl, { method: "GET" });
  if (r && r.body && r.body.code === 0 && r.body.data && r.body.data.lyric) {
    const r2 = await httpFetch(`${CONFIG.API_URL}/local/l?q=${b}`, { method: "GET" });
    if (r2 && r2.body && r2.body.code === 0) {
      return { lyric: r2.body.data || "", tlyric: "", rlyric: "", lxlyric: "" };
    }
  }
  throw new Error("get music lyric failed");
}
async function tryLiuyinFallback(musicInfo, quality) {
  try {
    const cacheKey = `liuyin_raw`;
    let raw = getCache(cacheKey);
    if (!raw) {
      const r = await httpFetch(CONFIG.LIUYIN_RAW_URL, { method: "GET", timeout: 20000 });
      if (!r || !r.body) return "";
      raw = typeof r.body === "string" ? r.body : JSON.stringify(r.body);
      setCache(cacheKey, raw, 60 * 1000);
    }
    const id = pickId(musicInfo);
    const audioRegex = /https?:\/\/[^\s'"]+\.(mp3|m4a|flac|aac|ogg|wav)(\?[^\s'"]*)?/ig;
    let m;
    while ((m = audioRegex.exec(raw)) !== null) {
      if (m && m[0]) return m[0];
    }
    const urlRegex = /https?:\/\/[^\s'"]+api[^\s'"]+/ig;
    const apis = [];
    while ((m = urlRegex.exec(raw)) !== null) {
      if (m && m[0]) apis.push(m[0]);
    }
    for (let apiBase of apis) {
      try {
        let tryUrl = apiBase;
        if (!/\?/.test(tryUrl)) tryUrl = tryUrl + (tryUrl.endsWith("/") ? "" : "/") + "?id=" + encodeURIComponent(id);
        const r2 = await httpFetch(tryUrl, { method: "GET", timeout: 10000 });
        if (r2 && r2.body) {
          const bodyStr = typeof r2.body === "string" ? r2.body : JSON.stringify(r2.body);
          const am = bodyStr.match(/https?:\/\/[^\s'"]+\.(mp3|m4a|flac|aac|ogg|wav)(\?[^\s'"]*)?/i);
          if (am) return am[0];
          if (r2.body && typeof r2.body === "object") {
            if (r2.body.url && typeof r2.body.url === "string") return r2.body.url;
            if (r2.body.data && typeof r2.body.data === "string") {
              const am2 = r2.body.data.match(/https?:\/\/[^\s'"]+\.(mp3|m4a|flac|aac|ogg|wav)/i);
              if (am2) return am2[0];
            }
          }
        }
      } catch (e) {}
    }
    return "";
  } catch (e) {
    return "";
  }
}
async function handleGetMusicUrl(source, musicInfo, quality) {
  const q = mapQualityForApi(quality);
  try {
    switch (source) {
      case "local":
        return await handleLocalMusicUrl(musicInfo);
      case "qsvip":
        return await handleQsvipMusicUrl(musicInfo, q);
      case "tx":
        return await handleTxMusicUrl(musicInfo, q);
      case "wy":
        return await handleWyMusicUrl(musicInfo, q);
      case "kw":
        return await handleKwMusicUrl(musicInfo, q);
      case "kg":
        return await handleKgMusicUrl(musicInfo, q);
      case "mg":
        return await handleMgMusicUrl(musicInfo, q);
      case "liuyin":
        return await tryLiuyinFallback(musicInfo, q);
      default:
        throw new Error("action(musicUrl) does not support source(" + source + ")");
    }
  } catch (err) {
    try {
      const fallback = await tryLiuyinFallback(musicInfo, q);
      if (fallback) return fallback;
    } catch (e) {}
    throw err;
  }
}
on(EVENT_NAMES.request, ({ action, source, info }) => {
  switch (action) {
    case "musicUrl":
      return handleGetMusicUrl(source, info.musicInfo, info.type)
        .then(data => Promise.resolve(data))
        .catch(err => Promise.reject(err));
    case "pic":
      if (source === "local") {
        return handleLocalPic(info.musicInfo).then(d => Promise.resolve(d)).catch(e => Promise.reject(e));
      }
      return Promise.reject("action(pic) does not support source(" + source + ")");
    case "lyric":
      if (source === "local") {
        return handleLocalLyric(info.musicInfo).then(d => Promise.resolve(d)).catch(e => Promise.reject(e));
      }
      return Promise.reject("action(lyric) does not support source(" + source + ")");
    default:
      return Promise.reject("action not support");
  }
});
const musicSources = {};
MUSIC_SOURCES.forEach(item => {
  musicSources[item] = {
    name: item,
    type: "music",
    actions: (item === "local") ? ["musicUrl", "pic", "lyric"] : ["musicUrl"],
    qualitys: MUSIC_QUALITY[item] || [],
  };
});
send(EVENT_NAMES.inited, { status: true, openDevTools: CONFIG.DEV_ENABLE, sources: musicSources });
globalThis.__merged_music_source__ = {
  config: CONFIG,
  sources: musicSources,
  handlers: { handleGetMusicUrl }
};
