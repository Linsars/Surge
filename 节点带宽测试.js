// name: Cloudflare Speed Test Panel for Surge
// desc: 使用 speed.cloudflare.com 测速，显示在 Surge 首页 Panel
// author: Mr.Eric 原版 / 优化为 Panel by Grok
// version: 2026.01

const POLICY_NAME = typeof $argument === 'string' && $argument.trim()
  ? $argument.trim()
  : null;

const NODE_NAME = POLICY_NAME || '当前节点';

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

function httpRequest(method, options) {
  return new Promise((resolve, reject) => {
    const fn = method === 'POST' ? $httpClient.post : $httpClient.get;
    fn(options, (err, resp, body) => {
      if (err) reject(err);
      else resolve({ resp, body });
    });
  });
}

async function fetchIP() {
  try {
    const { body } = await httpRequest('GET', {
      url: 'https://speed.cloudflare.com/meta',
      headers: { 'User-Agent': 'Surge/Panel' },
      policy: POLICY_NAME,
      timeout: 8
    });
    const json = JSON.parse(body || '{}');
    return json.clientIp || '未知';
  } catch {
    return '未知';
  }
}

async function testDownload(size) {
  const start = Date.now();
  try {
    await httpRequest('GET', {
      url: `https://speed.cloudflare.com/__down?bytes=${size.bytes}`,
      headers: { 'User-Agent': 'Surge/Panel' },
      policy: POLICY_NAME,
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
        'User-Agent': 'Surge/Panel',
        'Content-Type': 'application/octet-stream'
      },
      body,
      policy: POLICY_NAME,
      timeout: TIMEOUT / 1000
    });
    return toMbps(bytes, Date.now() - start);
  } catch {
    return 0;
  }
}

(async () => {
  try {
    const ip = await fetchIP();

    const dlPromises = DOWNLOAD_SIZES.map(s => testDownload(s));
    const ulPromises = UPLOAD_SIZES.map(s => testUpload(s));

    const dlResults = await Promise.all(dlPromises);
    const ulResults = await Promise.all(ulPromises);

    const avgDl = dlResults.reduce((a, b) => a + b, 0) / dlResults.length || 0;
    const avgUl = ulResults.reduce((a, b) => a + b, 0) / ulResults.length || 0;

    const score = calcScore(avgDl, avgUl);

    const title = `${getEmoji(avgDl)} ↓ ${formatSpeed(avgDl)} Mbps   ${getEmoji(avgUl)} ↑ ${formatSpeed(avgUl)} Mbps`;

    let content = `节点: ${NODE_NAME}\nIP: ${ip}\n评分: ${score}/100`;

    if (avgDl > 0 || avgUl > 0) {
      content += `\n下载: ${formatSpeed(avgDl)} Mbps\n上传: ${formatSpeed(avgUl)} Mbps`;
    }

    let color = '#f5222d';
    if (score >= 85) color = '#52c41a';
    else if (score >= 60) color = '#faad14';
    else if (score >= 40) color = '#fa541c';

    $done({
      title: title,
      content: content,
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