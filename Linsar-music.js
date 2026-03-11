/**
 * @name Linsar music dev
 * @version 1.0.1-merged
 * @author Linsar
 *
 * 说明
 *  - 将此文件导入到 LX 自定义源
 *  - 六音脚本将从 SIX_YIN_EXTERNAL_URL 拉取并 eval 作为兜底（可改为内嵌字符串）
 */

/* ======= 配置区（可按需修改） ======= */
const DEV_ENABLE = false;
const GLOBAL_TIMEOUT = 10000;
const SIX_YIN_ENCRYPTED = ""; 
const SIX_YIN_EXTERNAL_URL = "https://raw.githubusercontent.com/Linsars/Surge/main/%E5%85%AD%E9%9F%B31.2.1%E7%89%88%EF%BC%88%E6%9C%80%E9%AB%98%E6%94%AF%E6%8C%81%E6%97%A0%E6%8D%9F%E9%9F%B3%E8%B4%A8%EF%BC%89.js";

/* ======= 公共工具函数 ======= */
const { EVENT_NAMES, request, on, send, utils, env, version } = globalThis.lx || {};

function log(...args) {
  if (DEV_ENABLE) console.log('[MergedSource]', ...args);
}

function httpFetch(url, options = { method: 'GET', timeout: GLOBAL_TIMEOUT, headers: {} }) {
  return new Promise((resolve, reject) => {
    try {
      request(url, options, (err, resp) => {
        if (err) {
          reject(new Error(`request error: ${err && err.message ? err.message : String(err)}`));
          return;
        }
        // Normalize response: ensure resp.body is parsed JSON when possible
        let body = resp && resp.body;
        if (typeof body === 'string') {
          const trimmed = body.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')) {
            try { body = JSON.parse(trimmed); } catch (e) { /* keep string */ }
          }
        }
        resolve({ statusCode: resp.statusCode, headers: resp.headers || {}, body });
      });
    } catch (e) {
      reject(new Error(`httpFetch exception: ${e && e.message ? e.message : String(e)}`));
    }
  });
}

function ensureString(v) { return v == null ? '' : String(v); }

/* --- fish_music 适配器 --- */
const FishMusic = {
  id: 'fish_music',
  API_URL: "https://m-api.ceseet.me",
  API_KEY: "",
  qualitys: { kw: ['128k','320k','flac','flac24bit'], kg: ['128k','320k','flac','flac24bit'], tx: ['128k','320k','flac','flac24bit'], wy: ['128k','320k','flac'], mg: ['128k','320k','flac','flac24bit'] },
  async musicUrl(source, musicInfo, quality) {
    const songId = musicInfo.hash ?? musicInfo.songmid ?? musicInfo.id;
    if (!songId) throw new Error('fish_music: missing song id');
    const src = source || (musicInfo.source || 'wy');
    const url = `${this.API_URL}/url/${encodeURIComponent(src)}/${encodeURIComponent(songId)}/${encodeURIComponent(quality)}`;
    const resp = await httpFetch(url, { method: 'GET', headers: { 'X-Request-Key': this.API_KEY, 'User-Agent': env ? `lx-music-${env}/${version}` : `lx-music-request/${version}` }, timeout: GLOBAL_TIMEOUT });
    const body = resp.body;
    if (!body || isNaN(Number(body.code))) throw new Error('fish_music: unknown response');
    switch (Number(body.code)) {
      case 0: return ensureString(body.data || body.url || '');
      case 1: throw new Error('fish_music: block ip');
      default: throw new Error(`fish_music: ${body.msg || 'error'}`);
    }
  }
};

/* --- Huibq 适配器 --- */
const Huibq = {
  id: 'huibq',
  API_URL: 'https://render.niuma666bet.buzz',
  API_KEY: 'share-v2',
  qualitys: { kw: ['128k','320k'], kg: ['128k','320k'], tx: ['128k','320k'], wy: ['128k','320k'], mg: ['128k','320k'] },
  async musicUrl(source, musicInfo, quality) {
    const songId = musicInfo.hash ?? musicInfo.songmid ?? musicInfo.id;
    if (!songId) throw new Error('huibq: missing song id');
    const url = `${this.API_URL}/url/${encodeURIComponent(source)}/${encodeURIComponent(songId)}/${encodeURIComponent(quality)}`;
    const resp = await httpFetch(url, { method: 'GET', headers: { 'X-Request-Key': this.API_KEY, 'User-Agent': env ? `lx-music-${env}/${version}` : `lx-music-request/${version}` }, timeout: GLOBAL_TIMEOUT });
    const body = resp.body;
    if (!body || isNaN(Number(body.code))) throw new Error('huibq: unknown response');
    if (Number(body.code) === 0) return ensureString(body.url || body.data || '');
    throw new Error(`huibq: ${body.msg || 'error'}`);
  }
};

/* --- 聚合API接口 适配器 --- */
const AggregateAPI = {
  id: 'aggregate',
  BASE: 'https://api.music.lerd.dpdns.org',
  async musicUrl(source, musicInfo, quality) {
    // POST to /<source> with info in body (as original snippet)
    const url = `${this.BASE}/${source}`;
    const body = JSON.stringify({ info: musicInfo, quality });
    const resp = await httpFetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, timeout: GLOBAL_TIMEOUT });
    const parsed = resp.body;
    if (!parsed) throw new Error('aggregate: empty response');
    if (parsed.code === 200 && parsed.data) {
      // prefer parsed.data.url or parsed.data
      return ensureString(parsed.data.url || parsed.data);
    }
    if (parsed.code === 303 && parsed.data) {
      // follow the redirect-like structure (best-effort)
      try {
        const S = parsed.data;
        const D = S.request;
        const F = S.response;
        if (!D || !D.url) throw new Error('aggregate: invalid 303 payload');
        const sresp = await httpFetch(encodeURI(D.url), D.options || { method: 'GET', timeout: GLOBAL_TIMEOUT });
        const z = sresp.body;
        if (F && F.check && Array.isArray(F.check.key)) {
          const ok = F.check.key.reduce((acc, k) => acc && (z && (z[k] !== undefined)), true);
          if (ok) {
            // try to extract url by following F.url path (array of keys)
            let u = z;
            for (const k of F.url) {
              if (u && (k in u)) u = u[k];
              else { u = null; break; }
            }
            if (u && typeof u === 'string' && u.startsWith('http')) return u;
          }
        }
      } catch (e) {
        throw new Error(`aggregate: 303 follow failed: ${e.message}`);
      }
    }
    throw new Error(parsed.msg || 'aggregate: failed');
  }
};

/* --- 溯音音源 适配器 --- */
const Suyin = {
  id: 'suyin',
  QQ_API_KEY: 'oiapi-ef6133b7-ac2f-dc7d-878c-d3e207a82575',
  async musicUrl(source, musicInfo, quality) {
    // For QQ (tx) use oiapi; otherwise fallback to aggregate
    if (source === 'tx') {
      const songId = musicInfo.meta?.qq?.mid || musicInfo.songmid || musicInfo.id;
      if (!songId) throw new Error('suyin: missing qq id');
      const br = (quality === '320k' || quality === 'flac') ? 5 : 7;
      const url = `https://oiapi.net/api/QQ_Music?key=${encodeURIComponent(this.QQ_API_KEY)}&mid=${encodeURIComponent(songId)}&br=${encodeURIComponent(br)}`;
      const resp = await httpFetch(url, { method: 'GET', timeout: GLOBAL_TIMEOUT });
      const data = resp.body;
      if (data?.music) return ensureString(data.music);
      if (data?.url) return ensureString(data.url);
      throw new Error('suyin: qq fetch failed');
    }
    // other platforms: try aggregate
    return AggregateAPI.musicUrl(source, musicInfo, quality);
  }
};

/* --- 汽水VIP 适配器 --- */
const Qishui = {
  id: 'qsvip',
  API_BASE: 'http://api.vsaa.cn/api/music.qishui.vip',
  PROXY_SERVER: 'https://proxy.qishui.vsaa.cn/qishui/proxy',
  mapQuality(type) {
    switch ((type||'').toLowerCase()) {
      case '128k': return 'low';
      case '320k': return 'standard';
      case 'flac': return 'lossless';
      case 'flac24bit': return 'hi_res';
      default: return 'standard';
    }
  },
  pickId(musicInfo) {
    return ensureString(musicInfo.id || musicInfo.songmid || musicInfo.hash || musicInfo.rid || musicInfo.mid || '');
  },
  async musicUrl(source, musicInfo, quality) {
    const id = this.pickId(musicInfo);
    if (!id) throw new Error('qsvip: missing id');
    const q = this.mapQuality(quality);
    const url = `${this.API_BASE}?act=song&id=${encodeURIComponent(id)}&quality=${encodeURIComponent(q)}`;
    const resp = await httpFetch(url, { method: 'GET', timeout: 20000 });
    const body = resp.body;
    if (!body) throw new Error('qsvip: empty response');
    const song = Array.isArray(body.data) ? body.data[0] : (body.data || null);
    if (!song) throw new Error('qsvip: not found');
    if (song.ekey) {
      // try proxy
      const proxyResp = await httpFetch(this.PROXY_SERVER, { method: 'POST', body: JSON.stringify({ url: song.url, key: song.ekey, filename: song.name || 'KMusic', ext: song.codec_type || 'aac' }), headers: { 'Content-Type': 'application/json' }, timeout: 60000 });
      const pbody = proxyResp.body;
      if (pbody && Number(pbody.code) === 200 && pbody.url) return ensureString(pbody.url);
      throw new Error('qsvip: proxy failed');
    }
    return ensureString(song.url || '');
  }
};

/* ======= 六音加密脚本加载器（兜底） ======= */
let SixYinLoaded = null;

async function tryLoadSixYin() {
  if (SixYinLoaded !== null) return SixYinLoaded;
  // 1) 内嵌字符串优先
  if (SIX_YIN_ENCRYPTED && SIX_YIN_ENCRYPTED.trim()) {
    try {
      // 尝试以闭包方式 eval，避免污染局部作用域
      const wrapper = `(function(globalThis){\n${SIX_YIN_ENCRYPTED}\n})(globalThis);`;
      eval(wrapper);
      log('六音脚本已通过内嵌字符串加载（eval）');
      // 尝试检测常见导出函数名
      if (typeof globalThis.SixYinGetMusicUrl === 'function') {
        SixYinLoaded = true;
        return SixYinLoaded;
      }
      // if not exported, still mark loaded (best-effort)
      SixYinLoaded = true;
      return SixYinLoaded;
    } catch (e) {
      log('六音内嵌加载失败:', e.message);
    }
  }

  // 2) 外部 URL 拉取
  if (SIX_YIN_EXTERNAL_URL && SIX_YIN_EXTERNAL_URL.trim()) {
    try {
      const resp = await httpFetch(SIX_YIN_EXTERNAL_URL, { method: 'GET', timeout: 15000 });
      const code = typeof resp.body === 'string' ? resp.body : (resp.body && resp.body.data ? resp.body.data : '');
      if (code && code.trim()) {
        try {
          eval(`(function(globalThis){\n${code}\n})(globalThis);`);
          log('六音脚本已通过外部 URL 加载并 eval');
          // 尝试检测常见导出名并 normalize
          if (typeof globalThis.SixYinGetMusicUrl === 'function') {
            SixYinLoaded = true;
            return SixYinLoaded;
          }
          // some scripts export default function name; try to find common names
          const candidates = ['sixYinGetMusicUrl','SixYinGetMusicUrl','sixyin_get_music_url','getSixYinUrl'];
          for (const name of candidates) {
            if (typeof globalThis[name] === 'function') {
              globalThis.SixYinGetMusicUrl = globalThis[name];
              SixYinLoaded = true;
              return SixYinLoaded;
            }
          }
          // mark loaded even if no known export found
          SixYinLoaded = true;
          return SixYinLoaded;
        } catch (e) {
          log('六音外部 eval 失败:', e.message);
        }
      } else {
        log('六音外部拉取返回空内容');
      }
    } catch (e) {
      log('六音外部拉取失败:', e.message);
    }
  }

  SixYinLoaded = false;
  return SixYinLoaded;
}

/* ======= 主分发器：按 source 调用对应适配器，支持回退链 ======= */
const SourceRegistry = {
  fish_music: FishMusic,
  huibq: Huibq,
  aggregate: AggregateAPI,
  suyin: Suyin,
  qsvip: Qishui
};

// 默认回退链（按平台优先级）
const DefaultChain = {
  kw: ['huibq','aggregate','qsvip','fish_music'],
  wy: ['huibq','aggregate','fish_music','qsvip'],
  tx: ['suyin','huibq','aggregate','qsvip'],
  mg: ['huibq','aggregate','qsvip'],
  kg: ['huibq','aggregate','fish_music'],
  local: ['fish_music']
};

async function handleGetMusicUrlUnified(source, musicInfo, quality) {
  const chain = DefaultChain[source] || [source, 'aggregate', 'huibq', 'qsvip'];
  let lastErr = null;
  for (const key of chain) {
    const adapter = SourceRegistry[key];
    if (!adapter) continue;
    try {
      log('尝试适配器', key, 'song:', musicInfo.songmid || musicInfo.id || musicInfo.hash, 'quality:', quality);
      const url = await adapter.musicUrl(source, musicInfo, quality);
      if (url && typeof url === 'string' && url.startsWith('http')) {
        log('适配器', key, '成功返回 URL');
        return url;
      }
    } catch (e) {
      lastErr = e;
      log('适配器', key, '失败:', e && e.message ? e.message : e);
      continue;
    }
  }

  // 兜底：尝试六音脚本（如果加载并导出函数）
  try {
    const ok = await tryLoadSixYin();
    if (ok) {
      if (typeof globalThis.SixYinGetMusicUrl === 'function') {
        try {
          const url = await globalThis.SixYinGetMusicUrl(source, musicInfo, quality);
          if (url) return url;
        } catch (e) {
          log('六音兜底调用失败:', e && e.message ? e.message : e);
        }
      } else {
        log('六音已加载但未导出 SixYinGetMusicUrl，无法调用');
      }
    }
  } catch (e) {
    log('tryLoadSixYin 异常:', e && e.message ? e.message : e);
  }

  throw new Error(lastErr ? lastErr.message : '所有适配器均失败');
}

/* ======= 事件监听与初始化注册 ======= */
on(EVENT_NAMES.request, ({ action, source, info }) => {
  if (action !== 'musicUrl') return Promise.reject(new Error('unsupported action'));
  if (!info || !info.musicInfo) return Promise.reject(new Error('missing info'));
  const quality = info.type || '320k';
  return handleGetMusicUrlUnified(source, info.musicInfo, quality);
});

/* ======= 注册 sources 给 LX（合并后的 sources 列表） ======= */
const mergedSources = {
  kw: { name: '酷我音乐', type: 'music', actions: ['musicUrl','search'], qualitys: ['128k','320k','flac'] },
  wy: { name: '网易云音乐', type: 'music', actions: ['musicUrl','search'], qualitys: ['128k','320k','flac'] },
  tx: { name: 'QQ音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','320k','flac'] },
  kg: { name: '酷狗音乐', type: 'music', actions: ['musicUrl','search'], qualitys: ['128k','320k','flac'] },
  mg: { name: '咪咕音乐', type: 'music', actions: ['musicUrl','search'], qualitys: ['128k','320k'] },
  local: { name: '本地', type: 'music', actions: ['musicUrl','pic','lyric'], qualitys: [] },
  qsvip: { name: '汽水VIP', type: 'music', actions: ['musicUrl','lyric','search'], qualitys: ['128k','320k','flac','flac24bit'] },
  fish_music: { name: 'fish_music', type: 'music', actions: ['musicUrl','pic','lyric'], qualitys: ['128k','320k','flac','flac24bit'] },
  huibq: { name: 'Huibq', type: 'music', actions: ['musicUrl'], qualitys: ['128k','320k'] },
  aggregate: { name: 'AggregateAPI', type: 'music', actions: ['musicUrl'], qualitys: ['128k','320k','flac'] },
  suyin: { name: '溯音', type: 'music', actions: ['musicUrl','search'], qualitys: ['128k','320k','flac'] }
};

send(EVENT_NAMES.inited, { status: true, openDevTools: DEV_ENABLE, sources: mergedSources });

/* ======= 导出/调试接口（可在控制台调用） ======= */
globalThis.MergedMusicSources = {
  tryLoadSixYin,
  handleGetMusicUrlUnified,
  SourceRegistry,
  DefaultChain,
  httpFetch
};

log('Linsar合并音源脚本加载完成');


