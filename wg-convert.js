let input = $argument || '';

if (!input.trim()) {
  $notification.post(
    "WG → Surge 配置",
    "参数为空",
    "请在脚本设置 → 参数框 粘贴 wg:// 链接（一行一个，回车分隔）\n\n示例：\nwg://vpn-hk-xxx:51820?...#香港\nwg://120.233.41.75:16818?...#HK-急速直连",
    ""
  );
  $done();
}

let wgLinks = input
  .split(/[\n\r]+/)
  .map(line => line.trim())
  .filter(line => line.startsWith('wg://') && line.length > 20);

if (wgLinks.length === 0) {
  $notification.post("无效输入", "未检测到 wg:// 链接", "请检查参数框内容", "");
  $done();
}

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

    proxyLines.push(`${name} = wireguard, section-name=${name}`);

    let section = [
      `[WireGuard ${name}]`,
     put = $argument || '';

if 
     put = $argument || '';
    ];
    if (dns) section.push(`dns-server = ${dns}`);
    section.push(`mtu = ${mtu}`);

    let peer =    "请在脚本设置 → 参数框 粘贴 wg:// 链接（一行一个，回车分隔）\n\n示例：\nwg://vpn-hk-xxx:51820?...#香港\nwg://120.233.41.
    if (psk) peer += || '';

if (!input.trim()) 
    peer +=$argument || '';

if 
    section.push(peer);

    wgSections.push(section.join('\n'));
  } catch (e) {
    console.log(`解析失败 → ${url.slice(0, 60)}... → ${e.message}`);
  }
}

wgLinks.forEach(parseWgUrl);

if (wgSections.length === 0) {
  $notification.post("转换失败", "所有链接解析出错", "请检查 wg 链接格式", "");
  $done();
}

const result = proxyLines.join('\n') + '\n\n' + wgSections.join('\n\n');

$notification.post(
  (wgLinks.length === 0) {
  $not
  "长按下方内容 → 拷贝",
  result,
  ""
);

console.log("转换结果：\n" + result);

$persistentStore.write(result, "WG_转换结果");

$done();
