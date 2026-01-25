// name: 节点带宽测试 + 入口&落地信息
// desc: Cloudflare 测速 + 显示入口IP/位置 + 落地IP/位置 + 下载/上传速度 + 评分
// author: Mr.Eric & xream

const DOWNLOAD_SIZES = [
  { label: '100KB', bytes: 100 * 1024 },
  { label: '500KB', bytes: 500 * 1024 },
  { label: '1MB',   bytes: 1 * 1024 * 1024 }
];

const UPLOAD_SIZES = DOWNLOAD_SIZES;

const TIMEOUT = 12000;  // ms

function toMbps(bytes, ms) {
  return ms > 0 ? (bytes * 8 * 1000 / ms) / 1e6 : 0;
}

function formatSpeed(mbps) {
  return mbps < 100 ? mbps.toFixed(1) : Math.round(mbps);
}

function getEmoji(speed) {
  if (speed < 5) return '🔴';
  if (speed < 20) return '🟡';
  if (speed < 50) return '🟢';
  return '🔵';
}

function calcScore(dl, ul) {
  const dlNorm = Math.min(dl / 100, 1);
  const ulNorm = Math.min(ul / 50, 1);
  return Math.round((dlNorm * 0.7 + ulNorm * 0.3) * 1000) / 10;
}

function httpRequest(method, options = {}) {
  return new Promise((resolve, reject) => {
    const fn = method === 'POST' ? $httpClient.post : $httpClient.get;
    fn(options, (err, resp, body) => {
      if (err) reject(err);
      else resolve({ resp, body });
    });
  });
}

// 尽量获取“入口”信息（国内侧 IP & 位置）
// 这里用几个常见的国内 API，优先用不需要 key 的
async function fetchEntrance() {
  const sources = [
    { url: 'https://ipinfo.io/json', timeout: 6 },
    { url: 'https://api.ip.sb/geoip', timeout: 6 },
    { url: 'https://cf-ns.com/cdn-cgi/trace', timeout: 5 }  // cloudflare trace 有时能反映真实 client ip
  ];

  for (const src of sources) {
    try {
      const { body } = await httpRequest('GET', {
        url: src.url,
        headers: { 'User-Agent': 'Surge/Panel-Info' },
        timeout: src.timeout
        // 不指定 policy，走系统默认（通常为直连/入口）
      });

      if (src.url.includes('cdn-cgi/trace')) {
        // 解析 cf trace 格式
        const lines = body.split('\n');
        const data = {};
        lines.forEach(line => {
          const [k, v] = line.split('=');
          if (k && v) data[k] = v.trim();
        });
        if (data.ip) {
          return {
            ip: data.ip,
            city: data.loc ? data.loc.split(',')[0] : '',
            region: '',
            country: data.loc ? data.loc.split(',')[1] : '',
            source: 'cf-trace'
          };
        }
      } else {
        let json;
        try { json = JSON.parse(body || '{}'); } catch {}
        if (json && json.ip) {
          return {
            ip: json.ip,
            city: json.city || json.city_name || '',
            region: json.region || json.regionName || '',
            country: json.country || json.country_code || json.countryCode || '',
            source: src.url.split('/')[2]
          };
        }
      }
    } catch {}
  }

  return { ip: '未知', city: '', region: '', country: '', source: '' };
}

// 获取落地信息（走当前选中节点）
async function fetchMeta() {
  try {
    const { body } = await httpRequest('GET', {
      url: 'https://speed.cloudflare.com/meta',
      headers: { 'User-Agent': 'Surge/Panel-Speed' },
      timeout: 8
      // 关键：不加 policy，让 Surge 用当前选中节点的上下文发请求
    });
    const json = JSON.parse(body || '{}');
    return {
      ip: json.clientIp || '未知',
      city: json.city || '',
      region: json.region || '',
      country: json.country || '',
      colo: json.colo || ''
    };
  } catch {
    return { ip: '未知', city: '', region: '', country: '', colo: '' };
  }
}

async function testDownload(size) {
  const start = Date.now();
  try {
    await httpRequest('GET', {
      url: `https://speed.cloudflare.com/__down?bytes=${size.bytes}`,
      headers: { 'User-Agent': 'Surge/Panel-Speed' },
      'binary-mode': true,
      timeout: TIMEOUT / 1000
    });
    return toMbps(size.bytes, Date.now() - start);
  } catch {
    return 0;
  }
}

async function testUpload(size) {
  const bytes = Math.min(size.bytes, 1 * 1024 * 1024);
  const chunk = '0'.repeat(32768);
  const body = chunk.repeat(Math.ceil(bytes / 32768)).slice(0, bytes);

  const start = Date.now();
  try {
    await httpRequest('POST', {
      url: 'https://speed.cloudflare.com/__up',
      headers: {
        'User-Agent': 'Surge/Panel-Speed',
        'Content-Type': 'application/octet-stream'
      },
      body,
      timeout: TIMEOUT / 1000
    });
    return toMbps(bytes, Date.now() - start);
  } catch {
    return 0;
  }
}

(async () => {
  try {
    // 并行获取入口 & 落地信息 + 测速
    const [entrance, meta] = await Promise.all([
      fetchEntrance(),
      fetchMeta()
    ]);

    const dlResults = await Promise.all(DOWNLOAD_SIZES.map(testDownload));
    const ulResults = await Promise.all(UPLOAD_SIZES.map(testUpload));

    const avgDl = dlResults.reduce((a, b) => a + b, 0) / dlResults.length || 0;
    const avgUl = ulResults.reduce((a, b) => a + b, 0) / ulResults.length || 0;

    const score = calcScore(avgDl, avgUl);

    // 格式化位置
    const entranceLoc = [entrance.city, entrance.region, entrance.country].filter(Boolean).join(' · ') || '未知';
    const landingLoc  = [meta.city, meta.region, meta.country].filter(Boolean).join(' · ') || '未知';

    const entranceLine = `入口: ${entrance.ip}  (${entranceLoc})`;
    const landingLine  = `落地: ${meta.ip}  (${landingLoc})${meta.colo ? `  CF:${meta.colo}` : ''}`;

    const title = `${getEmoji(avgDl)} ↓ ${formatSpeed(avgDl)} Mbps   ${getEmoji(avgUl)} ↑ ${formatSpeed(avgUl)} Mbps`;

    let content = `${entranceLine}\n${landingLine}\n评分: ${score}/100`;

    let color = '#f5222d';
    if (score >= 85) color = '#52c41a';
    else if (score >= 60) color = '#faad14';
    else if (score >= 40) color = '#fa541c';

    $done({
      title,
      content,
      icon: 'speedometer',
      'icon-color': color
    });
  } catch (e) {
    $done({
      title: '测速或查询失败',
      content: e.message || String(e),
      icon: 'exclamationmark.triangle',
      'icon-color': '#ff3b30'
    });
  }
})();
