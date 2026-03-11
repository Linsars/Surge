/**
 * @name Linsar music dev
 * @version 1.0.2-merged
 * @author Linsar
 *
 * 说明
 *  - 将此文件导入到 LX 自定义源或者 歌一刀自定义源
 *  - 六音脚本将从 SIX_YIN_EXTERNAL_URL 拉取并 eval 作为兜底（可改为内嵌字符串）
 */

const DEV_ENABLE = false;
const GLOBAL_TIMEOUT = 10000;
const SIX_YIN_ENCRYPTED = "";
const SIX_YIN_EXTERNAL_URL = "https://raw.githubusercontent.com/Linsars/Surge/main/%E5%85%AD%E9%9F%B31.2.1%E7%89%88%EF%BC%88%E6%9C%80%E9%AB%98%E6%94%AF%E6%8C%81%E6%97%A0%E6%8D%9F%E9%9F%B3%E8%B4%A8%EF%BC%89.js";
const ALLOW_REMOTE_EVAL = false;

if (!globalThis.lx) {
  globalThis.MergedMusicSources = { available: false, reason: 'Not running inside LX' };
} else {
  const { EVENT_NAMES, request, on, send, utils, env, version } = globalThis.lx;

  function log(...args) { if (DEV_ENABLE) console.log('[MergedSource]', ...args); }

  const BufferUtil = (utils && utils.buffer) ? utils.buffer : {
    from: (s) => {
      const utf8 = unescape(encodeURIComponent(s));
      const arr = new Uint8Array(utf8.length);
      for (let i = 0; i < utf8.length; ++i) arr[i] = utf8.charCodeAt(i);
      return arr;
    },
    bufToString: (buf) => {
      if (typeof btoa === 'function') {
        let binary = '';
        const bytes = (buf instanceof Uint8Array) ? buf : new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
      }
      return '';
    }
  };

  async function httpFetch(url, options = { method: 'GET', timeout: GLOBAL_TIMEOUT, headers: {} }) {
    return new Promise((resolve, reject) => {
      try {
        request(url, options, (err, resp) => {
          if (err) return reject(new Error(err && err.message ? err.message : String(err)));
          let body = resp && resp.body;
          if (typeof body === 'string') {
            const t = body.trim();
            if (t && (t.startsWith('{') || t.startsWith('[') || t.startsWith('"'))) {
              try { body = JSON.parse(t); } catch (e) { /* keep string */ }
            }
          }
          resolve({ statusCode: resp.statusCode, headers: resp.headers || {}, body });
        });
      } catch (e) {
        reject(new Error(e && e.message ? e.message : String(e)));
      }
    });
  }

  function ensureString(v) { return v == null ? '' : String(v); }

  const QUALITY_MAP = { '128k': '128', '192k': '192', '320k': '320', 'flac': '740', 'flac24bit': '999' };
  function getQualityFallbackChain(q) {
    switch (q) {
      case 'flac24bit': return ['flac24bit','flac','320k','192k','128k'];
      case 'flac': return ['flac','320k','192k','128k'];
      case '320k': return ['320k','192k','128k'];
      case '192k': return ['192k','128k'];
      case '128k': return ['128k'];
      default: return ['320k','128k'];
    }
  }

  const FishMusic = {
    API_URL: "https://m-api.ceseet.me",
    API_KEY: "",
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
    },
    async getLocalFileUrl(songmid) {
      if (!songmid || !songmid.startsWith('server_')) throw new Error('unsupported local file');
      const songId = songmid.replace('server_', '');
      const requestBody = { p: songId };
      const b = BufferUtil.bufToString(BufferUtil.from(JSON.stringify(requestBody))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const t = 'c';
      const targetUrl = `${this.API_URL}/local/${t}?q=${b}`;
      const resp = await httpFetch(targetUrl, { method: 'GET', headers: { 'X-Request-Key': this.API_KEY }, timeout: GLOBAL_TIMEOUT });
      const body = resp.body;
      if (body && body.code === 0 && body.data && body.data.file) {
        const t2 = 'u';
        const b2 = BufferUtil.bufToString(BufferUtil.from(JSON.stringify(requestBody))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        return `${this.API_URL}/local/${t2}?q=${b2}`;
      }
      throw new Error('local file not found');
    }
  };

  const Huibq = {
    API_URL: 'https://render.niuma666bet.buzz',
    API_KEY: 'share-v2',
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

  const AggregateAPI = {
    BASE: 'https://api.music.lerd.dpdns.org',
    async musicUrl(source, musicInfo, quality) {
      const url = `${this.BASE}/${source}`;
      const body = JSON.stringify({ info: musicInfo, quality });
      const resp = await httpFetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, timeout: GLOBAL_TIMEOUT });
      const parsed = resp.body;
      if (!parsed) throw new Error('aggregate: empty response');
      if (parsed.code === 200 && parsed.data) return ensureString(parsed.data.url || parsed.data);
      if (parsed.code === 303 && parsed.data) {
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

  const Suyin = {
    QQ_API_KEY: 'oiapi-ef6133b7-ac2f-dc7d-878c-d3e207a82575',
    async musicUrl(source, musicInfo, quality) {
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
      return AggregateAPI.musicUrl(source, musicInfo, quality);
    }
  };

  const Qishui = {
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
        const proxyResp = await httpFetch(this.PROXY_SERVER, { method: 'POST', body: JSON.stringify({ url: song.url, key: song.ekey, filename: song.name || 'KMusic', ext: song.codec_type || 'aac' }), headers: { 'Content-Type': 'application/json' }, timeout: 60000 });
        const pbody = proxyResp.body;
        if (pbody && Number(pbody.code) === 200 && pbody.url) return ensureString(pbody.url);
        throw new Error('qsvip: proxy failed');
      }
      return ensureString(song.url || '');
    }
  };

  let SixYinLoaded = null;

  async function tryLoadSixYin() {
    if (SixYinLoaded !== null) return SixYinLoaded;
    if (!ALLOW_REMOTE_EVAL) {
      SixYinLoaded = false;
      return SixYinLoaded;
    }
    if (SIX_YIN_ENCRYPTED && SIX_YIN_ENCRYPTED.trim()) {
      try {
        const wrapper = `(function(globalThis){\n${SIX_YIN_ENCRYPTED}\n})(globalThis);`;
        eval(wrapper);
        SixYinLoaded = typeof globalThis.SixYinGetMusicUrl === 'function';
        return SixYinLoaded;
      } catch (e) {
        SixYinLoaded = false;
      }
    }
    if (SIX_YIN_EXTERNAL_URL && SIX_YIN_EXTERNAL_URL.trim()) {
      try {
        const resp = await httpFetch(SIX_YIN_EXTERNAL_URL, { method: 'GET', timeout: 15000 });
        const code = typeof resp.body === 'string' ? resp.body : (resp.body && resp.body.data ? resp.body.data : '');
        if (code && code.trim()) {
          try {
            eval(`(function(globalThis){\n${code}\n})(globalThis);`);
            if (typeof globalThis.SixYinGetMusicUrl === 'function') {
              SixYinLoaded = true;
              return SixYinLoaded;
            }
            const candidates = ['sixYinGetMusicUrl','SixYinGetMusicUrl','sixyin_get_music_url','getSixYinUrl'];
            for (const name of candidates) {
              if (typeof globalThis[name] === 'function') {
                globalThis.SixYinGetMusicUrl = globalThis[name];
                SixYinLoaded = true;
                return SixYinLoaded;
              }
            }
            SixYinLoaded = true;
            return SixYinLoaded;
          } catch (e) {
            SixYinLoaded = false;
          }
        } else {
          SixYinLoaded = false;
        }
      } catch (e) {
        SixYinLoaded = false;
      }
    }
    SixYinLoaded = false;
    return SixYinLoaded;
  }

  const SourceRegistry = {
    fish_music: FishMusic,
    huibq: Huibq,
    aggregate: AggregateAPI,
    suyin: Suyin,
    qsvip: Qishui
  };

  const DefaultChain = {
    kw: ['huibq','aggregate','qsvip','fish_music'],
    wy: ['huibq','aggregate','fish_music','qsvip'],
    tx: ['suyin','huibq','aggregate','qsvip'],
    mg: ['huibq','aggregate','qsvip'],
    kg: ['huibq','aggregate','fish_music'],
    local: ['fish_music']
  };

  async function handleGetMusicUrlUnified(source, musicInfo, quality) {
    if (!musicInfo) throw new Error('missing musicInfo');
    const chain = DefaultChain[source] || [source, 'aggregate', 'huibq', 'qsvip'];
    let lastErr = null;
    for (const key of chain) {
      const adapter = SourceRegistry[key];
      if (!adapter) continue;
      try {
        const url = await adapter.musicUrl(source, musicInfo, quality);
        if (url && typeof url === 'string' && url.startsWith('http')) return url;
      } catch (e) {
        lastErr = e;
        continue;
      }
    }
    try {
      const ok = await tryLoadSixYin();
      if (ok && typeof globalThis.SixYinGetMusicUrl === 'function') {
        try {
          const url = await globalThis.SixYinGetMusicUrl(source, musicInfo, quality);
          if (url) return url;
        } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
    throw new Error(lastErr ? lastErr.message : 'all adapters failed');
  }

  on(EVENT_NAMES.request, async ({ action, source, info }) => {
    try {
      if (action !== 'musicUrl' && action !== 'pic' && action !== 'lyric' && action !== 'search') throw new Error('unsupported action');
      if (!info || !info.musicInfo) throw new Error('missing info');
      const quality = info.type || '320k';
      if (action === 'pic' && source === 'local') {
        const url = await FishMusic.getLocalFileUrl(info.musicInfo.songmid);
        return url;
      }
      if (action === 'lyric' && source === 'local') {
        const songmid = info.musicInfo.songmid;
        if (!songmid || !songmid.startsWith('server_')) throw new Error('unsupported local file');
        const songId = songmid.replace('server_', '');
        const requestBody = { p: songId };
        const b = BufferUtil.bufToString(BufferUtil.from(JSON.stringify(requestBody))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const t = 'l';
        const targetUrl = `${FishMusic.API_URL}/local/${t}?q=${b}`;
        const resp = await httpFetch(targetUrl, { method: 'GET', headers: { 'User-Agent': env ? `lx-music-${env}/${version}` : `lx-music-request/${version}` }, timeout: GLOBAL_TIMEOUT });
        const body = resp.body;
        if (body && body.code === 0 && body.data) return { lyric: ensureString(body.data), tlyric: '', rlyric: '', lxlyric: '' };
        throw new Error('get music lyric failed');
      }
      const url = await handleGetMusicUrlUnified(source, info.musicInfo, quality);
      return url;
    } catch (err) {
      throw err;
    }
  });

  const mergedSources = {
    kw: { name: '酷我音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','320k','flac'] },
    wy: { name: '网易云音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','320k','flac'] },
    tx: { name: 'QQ音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','320k','flac'] },
    kg: { name: '酷狗音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','320k','flac'] },
    mg: { name: '咪咕音乐', type: 'music', actions: ['musicUrl'], qualitys: ['128k','320k'] },
    local: { name: '本地', type: 'music', actions: ['musicUrl','pic','lyric'], qualitys: [] },
    qsvip: { name: '汽水VIP', type: 'music', actions: ['musicUrl','lyric'], qualitys: ['128k','320k','flac','flac24bit'] },
    fish_music: { name: 'fish_music', type: 'music', actions: ['musicUrl','pic','lyric'], qualitys: ['128k','320k','flac','flac24bit'] },
    huibq: { name: 'Huibq', type: 'music', actions: ['musicUrl'], qualitys: ['128k','320k'] },
    aggregate: { name: 'AggregateAPI', type: 'music', actions: ['musicUrl'], qualitys: ['128k','320k','flac'] },
    suyin: { name: '溯音', type: 'music', actions: ['musicUrl'], qualitys: ['128k','320k','flac'] }
  };

  send(EVENT_NAMES.inited, { status: true, openDevTools: DEV_ENABLE, sources: mergedSources });

  globalThis.MergedMusicSources = {
    tryLoadSixYin,
    handleGetMusicUrlUnified,
    SourceRegistry,
    DefaultChain,
    httpFetch,
    available: true
  };
}
