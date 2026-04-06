// =============================================
// SubStore 脚本：移除指定协议的节点
// 用途：根据参数 xy 过滤掉对应协议的代理节点
//  参数 key=xy，value= 直接填简写，例如：  
//   - xy=h2 （删 Hysteria2）  
//   - xy=wg （删 WireGuard）  
//   - xy=hy2 （同 h2）  
//   - xy=tuic、xy=ss、xy=socks 等等。 
// 保存即可，脚本会自动过滤对应协议的节点
// =============================================

function operator(proxies = [], targetPlatform = '', args = {}) {
    const argSource = $arguments || args || {};
    const args_upper = {};
    for (const key in argSource) {
        if (Object.prototype.hasOwnProperty.call(argSource, key)) {
            args_upper[key.toUpperCase()] = argSource[key];
        }
    }
    const typeMap = {
        'ss': 'ss',
        'shadowsocks': 'ss',
        'ss2022': 'ss',
        'ssr': 'ssr',
        'shadowsocksr': 'ssr',
        'trojan': 'trojan',
        'trojan-go': 'trojan',
        'trojan-go': 'trojan',
        'vmess': 'vmess',
        'vless': 'vless',
        'hysteria': 'hysteria',
        'hy': 'hysteria',
        'hy1': 'hysteria',
        'hysteria1': 'hysteria',
        'hysteria2': 'hysteria2',
        'hy2': 'hysteria2',
        'h2': 'hysteria2',
        'tuic': 'tuic',
        'tuicv4': 'tuic',
        'tuicv5': 'tuic',
        'wireguard': 'wireguard',
        'wg': 'wireguard',
        'socks5': 'socks5',
        'socks': 'socks5',
        'socks4': 'socks5',
        'http': 'http',
        'snell': 'snell',
        'naive': 'naive',
        'naiveproxy': 'naive',
        'relay': 'relay',
        'anytls': 'anytls',
        'juicity': 'juicity',
        'juic': 'juicity'
    };
    let protocol = args_upper.XY ? decodeURI(args_upper.XY).trim().toLowerCase() : '';
    if (!protocol) {
        return proxies;
    }
    const targetType = typeMap[protocol] || protocol;
    return proxies.filter((proxy) => {
        if (!proxy || typeof proxy.type !== 'string') {
            return true;
        }
        return proxy.type.toLowerCase() !== targetType;
    });
}
