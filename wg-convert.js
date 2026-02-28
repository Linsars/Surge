// Surge Script: wg-to-surge.js
// 通过 {{{links}}} 拿到用户在参数编辑框输入的多行 wg 链接

let input = $argument || '';

if (!input.trim()) {
  $notification.post(
    "WG → Surge 配置",
    "参数为空",
    "请长按模块 → 编辑参数 → 在 links 输入框粘贴 wg:// 链接（一行一个）",
    ""
  );
  $done();
}

// 处理多行输入（Surge 会把多行参数作为字符串传入，包含换行）
let wgLinks = input
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.startsWith('wg://') && line.length > 20);

if (wgLinks.length === 0) {
  $notification.post("无效输入", "没有检测到 wg:// 链接", "请检查格式并确保每行是完整链接", "");
  $done();
}

const proxyLines = ["[Proxy]"];
const wgSections = [];

function parseWg(url) {
  try {
    const wgStr = url.slice(5);
    const [hostPort, queryFrag] = wgStr.split('?');
    if (!queryFrag) return;

    const [host, port] = hostPort.split(':');
    const [query, fragment = ''] = queryFrag.split('#');

    const params = Object.fromEntries(
      query.split('&').map(p => {
        let [k, ...v] = p.split('=');
        let val = v.join('=');
        if (['publicKey','privateKey','presharedKey'].includes(k)) return [k, val];
        return [k, decodeURIComponent(val.replace(/\+/g, ' '))];
      })
    );

    const name = decodeURIComponent(fragment) || 'WG节点';
    const pub = params.publicKey || '';
    const pri = params.privateKey || '';
    const psk = params.presharedKey || '';
    const ips = params.ip || '0.0.0.0/32';
    const selfIp = ips.split(',')[0].split('/')[0].trim();
    const mtu = params.mtu || '1280';
    const dns = (params.dns || '').replace(/\s+/g, '');

    proxyLines.push(`${name} = wireguard, section-name=${name}`);

    let section = [
      `[WireGuard ${name}]`,
     ge Script: wg-to-surge.j
     ge Script: wg-to-surge.    ];
    if (dns) section.push(`dns-server = ${dns}`);
    section.push(`mtu = ${mtu}`);

    let peer =(!input.trim()) {
  $notification.post(
    "WG → Surge 配置",
    "参数为空",
    "请长按模块 → 编辑参数 →
    if (psk) peer +=o-surge.js
// 通过 {{{links}}}
    peer +=ipt: wg-to-surge.js
/
    section.push(peer);

    wgSections.push(section.join('\n'));
  } catch (e) {
    console.log(`解析失败: ${url.slice(0,50)}... → ${e}`);
  }
}

wgLinks.forEach(parseWg);

if (wgSections.length === 0) {
  $notification.post("转换失败", "所有链接解析出错", "检查链接是否完整有效", "");
  $done();
}

const result = proxyLines.join('\n') + '\n\n' + wgSections.join('\n\n');

$notification.post(
  line.startsWith('wg://') && lin
  "长按下方内容 → 拷贝",
  result,
  ""
);

console.log(result); // 日志备份

$done();
