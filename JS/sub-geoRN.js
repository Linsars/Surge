// ==UserScript==
// @name         节点名后追加参数 - 港台除外
// @description  在非香港/台湾节点名称后面追加自定义文本（如流量、倍率、标签等）
// @author       Grok
// @version      1.2
// ==/UserScript==

async function operator(proxies) {
    // ====================== 修改这里为你想追加的内容 ======================
    const appendText = ' | GPT';  
    // 常见写法示例（可替换上面一行）：
    // const appendText = ' 0.5x';
    // const appendText = ' | NF | GPT';
    // const appendText = ' [IEPL]';
    // const appendText = ' ★';
    // ======================================================================

    // 香港/台湾常见关键词（已合并常见 + 更精准两组，基本覆盖大部分命名习惯）
    const hkTwKeywords = [
        // 香港相关
        '香港', '港', 'HK', 'HKG', 'HongKong', 'Hong Kong',
        // 台湾相关
        '台湾', '台灣', '台', 'TW', 'Taiwan', 'Taipei', 'TPE',
        '新北', '桃园', '高雄', '台中', 'Kaohsiung', '台南', '彰化', '基隆'
    ];

    // 转成正则表达式（不区分大小写）
    const regex = new RegExp(hkTwKeywords.join('|'), 'i');

    return proxies.map(p => {
        // 如果节点名包含任意香港/台湾相关关键词 → 保持原名不变
        if (regex.test(p.name)) {
            return p;
        }

        // 否则才在后面追加文字
        p.name = p.name + appendText;
        return p;
    });
}
