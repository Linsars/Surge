// name: 节点带宽测试 - 跟随当前选中节点
// desc: Cloudflare 测速，显示当前实际出口的下载/上传速度 + 评分
// author: Mr.Eric 原版 / 优化为跟随当前节点 by Grok

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
      // 不加 policy，走当前选中节点
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
      // 不加 policy，走当前选中节点
    });
    return toMbps(bytes, Date.now() - start);
  } catch {
    return 0;
  }
}

(async () => {
  try {
    const meta = await fetchMeta();
    const ip = meta.ip;

    const dlResults = await Promise.all(DOWNLOAD_SIZES.map(testDownload));
    const ulResults = await Promise.all(UPLOAD_SIZES.map(testUpload));

    const avgDl = dlResults.reduce((a, b) => a + b, 0) / dlResults.length || 0;
    const avgUl = ulResults.reduce((a, b) => a + b, 0) / ulResults.length || 0;

    const score = calcScore(avgDl, avgUl);

    const loc = [meta.city, meta.region, meta.country].filter(Boolean).join(' · ') || '未知位置';
    const colo = meta.colo ? `CF: ${meta.colo}` : '';

    const title = `${getEmoji(avgDl)} ↓ ${formatSpeed(avgDl)} Mbps   ${getEmoji(avgUl)} ↑ ${formatSpeed(avgUl)} Mbps`;

    let content = `IP: ${ip}\n位置: ${loc}\n${colo ? colo + '\n' : ''}评分: ${score}/100`;

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
      title: '测速失败',
      content: e.message || String(e),
      icon: 'exclamationmark.triangle',
      'icon-color': '#ff3b30'
    });
  }
})();
