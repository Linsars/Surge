// ==Surge==
// @name         WireGuard 链接转 Surge 配置
// @version      1.0.1
// @author       Linsar & Eric
// @description  把 wg:// 开头的链接粘贴到 inputText 变量里，运行后输出 Surge 可用的 WireGuard 配置
// ==/Surge==

// 如果你想通过远程参数传 wg 链接，可以改用 $argument
// 这里先用最简单的方式：假设用户已在 Surge 里设置了 persistent 变量 inputText

const inputText = $persistentStore.read("inputText") || `
  // 这里可以留空，或者放默认示例
  wg://你的链接在这里
`;

const 代理列表 = ["[Proxy]"];
const wireguard节点列表 = [];

function 提取WG链接(文本) {
  const wg正则 = /wg:\/\/[^\s'"]+/g;
  return 文本.match(wg正则) || [];
}

function 解析WG链接转Surge格式(网址) {
  try {
    const wg内容 = 网址.slice(5);
    const [主机端口, 查询与标题] = wg内容.split('?');
    const [主机, 端口] = 主机端口.split(':');
    const [查询字符串, 标题] = 查询与标题 ? 查询与标题.split('#') : ['', ''];

    const 原始参数 = Object.fromEntries(
      查询字符串.split('&').map(键值对 => {
        const [键, ...其余] = 键值对.split('=');
        const 值 = 其余.join('=');
        if (['publicKey', 'privateKey', 'presharedKey'].includes(键)) {
          return [键, 值];
        }
        return [键, decodeURIComponent(值.replace(/\+/g, '%20'))];
      })
    );

    const 名称 = decodeURIComponent(标题 || 'WG节点');
    const 公钥 = 原始参数.publicKey || '';
    const 私钥 = 原始参数.privateKey || '';
    const 预共享密钥 = 原始参数.presharedKey || '';
    const IP段 = 原始参数.ip || '0.0.0.0/32';
    const 本机IP = IP段.split(',')[0].split('/')[0];
    const MTU = 原始参数.mtu || '128
