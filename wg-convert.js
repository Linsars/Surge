// Surge Module Script: wg-to-surge.js
// 支持：argument 里一行一个 wg:// 链接，直接回车分隔

let argument = $argument || '';

if (!argument.trim()) {
  $notification.post(
    "WG → Surge WireGuard",
    "参数为空",
    "请在模块参数（argument）中填入 wg:// 开头的链接，\n一行一个节点（直接回车分隔）\n\n示例：\nwg://vpn-hk-xxx:51820?...#香港\nwg://vpn-jp-xxx:51820?...#日本",
    ""
  );
  $done();
}

// 按行分割（Surge 的 argument 会保留换行）
let lines = argument.split('\n').map(line => line.trim()).filter(Boolean);

let wgLinks = lines.filter(link => link.startsWith('wg://') && link.length > 10);

if (wgLinks.length === 0) {
  $notification.post(
    "没有找到有效节点",
    "检查输入格式",
    "确保每行都是 wg:// 开头的完整链接",
    ""
  );
  $done();
}

// 开始转换
const proxyLines = ["[Proxy]"];
const wgSections = [];

function parseWgUrl(url) {
  try {
    const wgStr = url.slice(5);
    const [hostPort, queryAndFrag] = wgStr.split('?');
    if (!queryAndFrag) return;

    const [host, port] = hostPort.split(':');
    const [query, fragment = ''] = queryAndFrag.split('#');

    const params = Object.fromEntries(
      query.split('&').map(p => {
        let [k, ...v] = p.split('=');
        let val = v.join('=');
        if (['publicKey', 'privateKey', 'presharedKey'].includes(k)) {
          return [k, val];
        }
        return [k, decodeURIComponent(val.replace(/\+/g, ' '))];
      })
    );

    const name = decodeURIComponent(fragment) || 'WG节点';
    const pubKey = params.publicKey || '';
    const priKey = params.privateKey || '';
    const psk    = params.presharedKey || '';
    const ipStr  = params.ip || '0.0.0.0/32';
    const selfIp = ipStr.split(',')[0].split('/')[0].trim();
    const mtu    = params.mtu || '1280';
    const dns    = (params.dns || '').replace(/\s+/g, '');

    proxyLines.push(`${name} = wireguard, section-name = ${name}`);

    let section = [
      `[WireGuard ${name}]`,
     ge Module Script: wg-to-sur
     ge Module Script: wg-to    ];
    if (dns) section.push(`dns-server = ${dns}`);
    section.push(`mtu = ${mtu}`);

    let peer =';

if (!argument.trim()) {
  $notification.post(
    "WG → Surge WireGuard",
    "参数为空",
    "
    if (psk) peer +=t: wg-to-surge.js
// 支持：argu
    peer +=ule Script: wg-to-sur
    section.push(peer);

    wgSections.push(section.join('\n'));
  } catch (e) {
    console.log(`解析出错: ${url.slice(0, 60)}... → ${e.message}`);
  }
}

wgLinks.forEach(parseWgUrl);

if (wgSections.length === 0) {
  $notification.post("转换失败", "所有节点解析出错", "请检查链接是否完整", "");
  $done();
}

const result = proxyLines.join('\n') + '\n\n' + wgSections.join('\n\n\n');

$notification.post(
 s = argument.split('\n').map(line
  "长按下方内容 → 拷贝",
  result,
  ""
);

// 可选：保存到持久化变量，方便以后查看
$persistentStore.write(result, "WG转换结果");

$done();
