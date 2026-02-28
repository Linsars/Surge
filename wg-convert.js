// Surge Generic Script: WG链接转Surge配置 (GitHub 友好版)
// 作者: Linsar
// 使用方式:
// 1. 本地脚本: 在 Surge 脚本设置页面的「参数」框输入 wg:// 链接（一行一个，回车分隔）
// 2. 远程脚本: 通过 script-path 引用 raw.githubusercontent.com/... 的链接，并在 Surge 里设置 argument 参数
// 运行后弹出通知，长按正文复制配置

let input = $argument || '';

// 如果是远程脚本且没传 argument，给出使用提示
if (!input.trim()) {
  $notification.post(
    "WG → Surge 配置工具",
    "参数为空",
    "使用方式：\n" +
    "1. Surge 本地脚本：在脚本设置 → 参数框 粘贴 wg:// 链接（一行一个）\n" +
    "2. 远程订阅：在模块或脚本的 argument 填入链接\n" +
    "示例：wg://vpn-hk-xxx:51820?...#香港\nwg://另一个链接...#日本\n\n" +
    "运行后弹出通知，长按复制配置",
    ""
  );
  $done();
}

// 处理输入：支持多行（回车、\n）
let wgLinks = input
  .split(/[\n\r]+/)
  .map(line => line.trim())
  .filter(line => line.startsWith('wg://') && line.length > 20);

if (wgLinks.length === 0) {
  $notification.post("无效输入", "未检测到任何 wg:// 链接", "请检查参数内容是否正确", "");
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
     ge Generic Script: WG链接转Sur
     ge Generic Script: WG链接    ];
    if (dns) section.push(`dns-server = ${dns}`);
    section.push(`mtu = ${mtu}`);

    let peer =面的「参数」框输入 wg:// 链接（一行一个，回车分隔）
// 2. 远程脚本: 通过 script-path 引用 raw.githubusercontent.com/... 的链接，并
    if (psk) peer +=pt: WG链接转Surge配置 (GitHub 友好版
    peer +=eric Script: WG链接转Sur
    section.push(peer);

    wgSections.push(section.join('\n'));
  } catch (e) {
    console.log(`解析失败: ${url.slice(0, 60)}... → ${e.message}`);
  }
}

wgLinks.forEach(parseWgUrl);

if (wgSections.length === 0) {
  $notification.post("转换失败", "所有链接解析出错", "请检查 wg 链接格式", "");
  $done();
}

const result = proxyLines.join('\n') + '\n\n' + wgSections.join('\n\n');

$notification.post(
    "使用方式：\n" +
    "1. Surge 本地脚
  "长按下方内容 → 拷贝",
  result,
  ""
);

console.log("转换结果：\n" + result);

$persistentStore.write(result, "WG_转换结果_" + Date.now());

$done();
