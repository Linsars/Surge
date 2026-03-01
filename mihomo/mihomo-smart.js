// ==============混合内核脚本==============
// 使用方法：
// 1. 切换内核时只改第 1 行：
//    	Meta/Smart 内核（完整智能策略 + uselightgbm + policy-priority）
//					const USE_SMART_KERNEL = true;
//		传统 Clash 内核（自动转为 url-test + 清理 Meta 专属字段）
//					const USE_SMART_KERNEL = false; 
// 2. 保存 → 在客户端重新加载配置即可

const USE_SMART_KERNEL = true;

const ntpConfig = {
  enable: true,
  "write-to-system": true
};

const dnsConfig = {
  enable: true,
  listen: "0.0.0.0:1053",
  ipv6: true,
  "use-system-hosts": true,
  "prefer-h3": true,
  "respect-rules": true,
  "enhanced-mode": "fake-ip",
  "fake-ip-range": "198.18.0.1/16",
  "fake-ip-filter": [
    "+.lan", "+.local", "dns.msftncsi.com", "+.msftconnecttest.com", "+.msftncsi.com",
    "localhost.ptlogin2.qq.com", "localhost.sec.qq.com", "localhost.work.weixin.qq.com",
    "stun.+.+.+", "stun.+.+", "miwifi.com", "+.music.163.com", "*.126.net",
    "api-jooxtt.sanook.com", "streamoc.music.tc.qq.com", "mobileoc.music.tc.qq.com",
    "isure.stream.qqmusic.qq.com", "dl.stream.qqmusic.qq.com", "aqqmusic.tc.qq.com",
    "amobile.music.tc.qq.com", "+.xiaomi.com", "+.music.migu.cn", "music.migu.cn",
    "netis.cc", "+.ntp.org.cn", "+.openwrt.pool.ntp.org",
    "+.+.+.srv.nintendo.net", "+.+.stun.playstation.net",
    "speedtest.cros.wr.pvp.net", "+.xboxlive.com"
  ],
  "default-nameserver": ["223.5.5.5", "119.29.29.29", "1.1.1.1", "8.8.8.8"],
  nameserver: [
    "https://223.5.5.5/dns-query",
    "https://doh.pub/dns-query",
    "https://dns.alidns.com/dns-query"
  ],
  "proxy-server-nameserver": [
    "https://doh.pub/dns-query",
    "https://1.1.1.1/dns-query"
  ],
  "nameserver-policy": {
    "geosite:private,cn,geolocation-cn": [
      "https://doh.pub/dns-query",
      "https://dns.alidns.com/dns-query"
    ],
    "geosite:netflix,openai,pornhub,tiktok,youtube,telegram,gfw,geolocation-!cn": [
      "https://1.1.1.1/dns-query",
      "https://194.242.2.2/dns-query",
      "https://public.dns.iij.jp/dns-query",
      "https://doh.opendns.com/dns-query"
    ]
  }
};

const ruleProviders = {
  private:        { type:"http", behavior:"ipcidr",  format:"mrs", interval:604800, url:"https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geoip/private.mrs",      path:"./ruleset/private.mrs" },
  cn:             { type:"http", behavior:"domain",  format:"mrs", interval:604800, url:"https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/cn.mrs",           path:"./ruleset/cn.mrs" },
  cncidr:         { type:"http", behavior:"ipcidr",  format:"mrs", interval:604800, url:"https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geoip/cn.mrs",            path:"./ruleset/cncidr.mrs" },
  gfw:            { type:"http", behavior:"domain",  format:"mrs", interval:43200,  url:"https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/gfw.mrs",          path:"./ruleset/gfw.mrs" },
  tld_not_cn:     { type:"http", behavior:"domain",  format:"mrs", interval:86400,  url:"https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/tld-!cn.mrs",       path:"./ruleset/tld-not-cn.mrs" },
  proxy:          { type:"http", behavior:"domain",  format:"mrs", interval:86400,  url:"https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo-lite/geosite/proxy.mrs",     path:"./ruleset/proxy.mrs" },
  netflix:        { type:"http", behavior:"ipcidr",  format:"mrs", interval:43200,  url:"https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geoip/netflix.mrs",        path:"./ruleset/netflix.mrs" },
  youtube:        { type:"http", behavior:"domain",  format:"mrs", interval:43200,  url:"https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/youtube.mrs",       path:"./ruleset/youtube.mrs" },
  openai:         { type:"http", behavior:"domain",  format:"mrs", interval:43200,  url:"https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/openai.mrs",        path:"./ruleset/openai.mrs" },
  github:         { type:"http", behavior:"domain",  format:"mrs", interval:86400,  url:"https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/github.mrs",        path:"./ruleset/github.mrs" },
  spotify:        { type:"http", behavior:"domain",  format:"mrs", interval:86400,  url:"https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/spotify.mrs",       path:"./ruleset/spotify.mrs" },
  tiktok:         { type:"http", behavior:"domain",  format:"mrs", interval:43200,  url:"https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/tiktok.mrs",        path:"./ruleset/tiktok.mrs" },
  pornhub:        { type:"http", behavior:"domain",  format:"mrs", interval:86400,  url:"https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/pornhub.mrs",       path:"./ruleset/pornhub.mrs" },
  telegram_domain:{ type:"http", behavior:"domain",  format:"mrs", interval:43200,  url:"https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geosite/telegram.mrs",      path:"./ruleset/telegram.mrs" },
  telegram_ip:    { type:"http", behavior:"ipcidr",  format:"mrs", interval:604800, url:"https://github.com/MetaCubeX/meta-rules-dat/raw/refs/heads/meta/geo/geoip/telegram.mrs",       path:"./ruleset/telegramcidr.mrs" },
  twitch:         { type:"http", behavior:"classical",format:"yaml",interval:259200,url:"https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Twitch/Twitch.yaml",path:"./ruleset/twitch.yaml" },
  bilibili:       { type:"http", behavior:"classical",format:"yaml",interval:259200,url:"https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/BiliBili/BiliBili.yaml",path:"./ruleset/bilibili.yaml" },
  microsoft:      { type:"http", behavior:"classical",format:"yaml",interval:259200,url:"https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Microsoft/Microsoft.yaml",path:"./ruleset/microsoft.yaml" },
  apple:          { type:"http", behavior:"classical",format:"yaml",interval:259200,url:"https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Apple/Apple_Classical.yaml",path:"./ruleset/apple.yaml" },
  gamepub:        { type:"http", behavior:"classical",format:"yaml",interval:259200,url:"https://raw.githubusercontent.com/GGsimita/clash-mihomo-js/main/Script-pub/gamepub.yaml",       path:"./ruleset/gamepub.yaml" },
  game_download:  { type:"http", behavior:"classical",format:"text", interval:604800, url:"https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Ruleset/GameDownload.list",     path:"./ruleset/game-download.list" },
  steam:          { type:"http", behavior:"classical",format:"yaml",interval:259200,url:"https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Steam/Steam.yaml",          path:"./ruleset/steam.yaml" },
  steamcn:        { type:"http", behavior:"classical",format:"yaml",interval:259200,url:"https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/SteamCN/SteamCN.yaml",      path:"./ruleset/steamcn.yaml" },
  adblock:        { type:"http", behavior:"domain",  format:"text", interval:43200,  url:"https://raw.githubusercontent.com/Cats-Team/AdRules/main/adrules_domainset.txt",                 path:"./ruleset/adblock.txt" }
};

const rules = [
  "DOMAIN-SUFFIX,googleapis.cn,GitGPT",
  "DOMAIN-SUFFIX,gstatic.com,GitGPT",
  "DOMAIN-SUFFIX,github.io,GitGPT",
  "DOMAIN,copilot.microsoft.com,GitGPT",
  "DOMAIN,sydney.bing.com,GitGPT",

  "RULE-SET,adblock,REJECT",
  "RULE-SET,private,DIRECT",
  "RULE-SET,cn,DIRECT",
  "RULE-SET,cncidr,DIRECT,no-resolve",
  "RULE-SET,telegram_domain,Telegram",
  "RULE-SET,telegram_ip,Telegram,no-resolve",
  "RULE-SET,bilibili,Bilibili",
  "RULE-SET,netflix,外国媒体",
  "RULE-SET,youtube,外国媒体",
  "RULE-SET,tiktok,外国媒体",
  "RULE-SET,pornhub,外国媒体",
  "RULE-SET,spotify,外国媒体",
  "RULE-SET,twitch,外国媒体",
  "RULE-SET,openai,GitGPT",
  "RULE-SET,github,GitGPT",
  "RULE-SET,microsoft,GitGPT",
  "RULE-SET,proxy,节点选择",
  "RULE-SET,gfw,节点选择",
  "RULE-SET,tld_not_cn,节点选择",
  "RULE-SET,gamepub,游戏代理",
  "RULE-SET,steam,游戏代理",
  "RULE-SET,steamcn,游戏直连",
  "RULE-SET,game_download,游戏直连",

  "GEOIP,LAN,DIRECT,no-resolve",
  "GEOIP,CN,DIRECT,no-resolve",

  "MATCH,漏网之鱼"
];

const groupBaseOption = {
  interval: 300,
  timeout: 3000,
  url: "http://connectivitycheck.gstatic.com/generate_204",
  lazy: true,
  "max-failed-times": 3,
  hidden: false
};

// ==================== 动态生成代理组（核心适配逻辑） ====================
function generateProxyGroups() {
  const groups = [
    { ...groupBaseOption, name: "节点选择", type: USE_SMART_KERNEL ? "smart" : "url-test",
      proxies: ["🇭🇰 香港节点", "🇨🇳 台湾节点", "🇺🇲 美国节点", "🇯🇵 日本节点", "🇰🇷 韩国节点", "🌏 东南亚节点", "🇪🇺 欧盟节点"],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Airport.png" },

    { ...groupBaseOption, name: "GitGPT", type: USE_SMART_KERNEL ? "smart" : "url-test",
      proxies: ["🤖 AI 专用节点"], "include-all": true, filter: "(?i)^(?!.*(中国|大陆|内地|俄罗斯|伊朗|朝鲜|叙利亚|古巴|委内瑞拉|白俄罗斯|缅甸|阿富汗|利比亚|苏丹|索马里|也门|伊拉克|CN|RU|KP|IR|SY|CU|VE|BY|MM|AF|LY|SD|SO|YE|IQ|新疆|西藏)).*(AI|ChatGPT|Grok|GPT|Claude|Gemini|US|JP|EU|SG|KR|CN|HK|MO|RU|KP|IR|SY|CU|VE|BY|MM|AF|LY|SD|SO|YE|IQ).*",
      icon: "https://www.clashverge.dev/assets/icons/chatgpt.svg" },

    { ...groupBaseOption, name: "外国媒体", type: USE_SMART_KERNEL ? "smart" : "url-test",
      proxies: ["节点选择", "延迟选优", "故障转移", "🇭🇰 香港节点", "🇨🇳 台湾节点", "🇺🇲 美国节点", "🇯🇵 日本节点", "🇰🇷 韩国节点", "🌏 东南亚节点", "🇪🇺 欧盟节点"],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Server.png" },

    { ...groupBaseOption, name: "Bilibili", type: USE_SMART_KERNEL ? "smart" : "url-test",
      proxies: ["DIRECT"], "include-all": true, filter: "港|澳|台|HK|TW|MO",
      icon: "https://fastly.jsdelivr.net/gh/Orz-3/mini@master/Color/Bili.png" },

    { ...groupBaseOption, name: "Telegram", type: USE_SMART_KERNEL ? "smart" : "url-test",
      proxies: ["节点选择", "🇭🇰 香港节点", "延迟选优", "故障转移", "DIRECT"],
      icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/telegram.svg" },

    { ...groupBaseOption, name: "游戏代理", type: USE_SMART_KERNEL ? "smart" : "url-test",
      proxies: ["节点选择", "延迟选优", "故障转移", "🇭🇰 香港节点", "🇨🇳 台湾节点", "🇺🇲 美国节点", "🇯🇵 日本节点", "🇰🇷 韩国节点", "🌏 东南亚节点", "🇪🇺 欧盟节点"],
      icon: "https://www.twitch.tv/favicon.ico" },

    { ...groupBaseOption, name: "游戏直连", type: USE_SMART_KERNEL ? "smart" : "url-test",
      proxies: ["DIRECT", "节点选择", "延迟选优", "故障转移"],
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Download.png" },

    { ...groupBaseOption, name: "漏网之鱼", type: USE_SMART_KERNEL ? "smart" : "url-test",
      proxies: ["节点选择", "延迟选优", "故障转移", "DIRECT"], "include-all": true,
      icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/fish.svg" },

    // ==================== 隐藏组====================
    { ...groupBaseOption, name: "🇭🇰 香港节点", type: USE_SMART_KERNEL ? "smart" : "url-test",
      "include-all": true, hidden: true, filter: "(?i)(🇭🇰|香港|香港特別行政區|香港特区|\\b(Hong Kong|HKSAR|HK|HKG)\\b|\\b(Kowloon|New Territories|Hong Kong Island)\\b|九龍|九龙|新界|港島|港岛|中環|中环|Central|Causeway Bay|銅鑼灣|铜锣湾|尖沙咀|Tsim Sha Tsui|旺角|Mong Kok|太子|Prince Edward|沙田|Sha Tin|荃灣|Tsuen Wan|元朗|Yuen Long|屯門|Tuen Mun|大埔|Tai Po|觀塘|观塘|Kwun Tong|黃大仙|黄大仙|Wong Tai Sin|西貢|Sai Kung|大嶼山|Lantau|長洲|Cheung Chau|南丫島|Lamma|鴨脷洲|Ap Lei Chau|赤柱|Stanley|淺水灣|浅水湾|Repulse Bay|上環|Sheung Wan|堅尼地城|Kennedy Town|天水圍|Tin Shui Wai)",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Hong_Kong.png" },

    { ...groupBaseOption, name: "🇨🇳 台湾节点", type: USE_SMART_KERNEL ? "smart" : "url-test",
      "include-all": true, hidden: true, filter: "(?i)(🇹🇼|台湾|臺灣|Taiwan|Republic of China|ROC|\\bTW\\b|\\bTPE\\b|\\bTWN\\b|台北|臺北|台北市|臺北市|新北|新北市|Taoyuan|桃園|桃園市|Taichung|台中|臺中|Tainan|台南|臺南|Kaohsiung|高雄|Hsinchu|新竹|Miaoli|苗栗|Changhua|彰化|Nantou|南投|Yunlin|雲林|Chiayi|嘉義|Pingtung|屏東|Yilan|宜蘭|Hualien|花蓮|Taitung|台東|臺東|Penghu|澎湖|Kinmen|金門|Matsu|馬祖|Lienchiang|連江|Keelung|基隆|Taoyuan|桃園|\\bTPE\\b|\\bTSA\\b|\\bKHH\\b|\\bRMQ\\b|\\bTNN\\b|\\bCYI\\b|\\bHUN\\b|\\bMZG\\b|\\bKNH\\b|\\bLZN\\b)",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Taiwan.png" },

    { ...groupBaseOption, name: "🇺🇲 美国节点", type: USE_SMART_KERNEL ? "smart" : "url-test",
      "include-all": true, hidden: true, filter: "(?i)(🇺🇸|United States|United States of America|USA|US|America|Americas|UnitedStates|U\\.S\\.|U\\.S\\.A\\.|East Coast|West Coast|Midwest|Northeast|Southeast|Southwest|Pacific Northwest|New England|Alabama|AL|Alaska|AK|Arizona|AZ|Arkansas|AR|California|CA|Colorado|CO|Connecticut|CT|Delaware|DE|Florida|FL|Georgia|GA|Hawaii|HI|Idaho|ID|Illinois|IL|Indiana|IN|Iowa|IA|Kansas|KS|Kentucky|KY|Louisiana|LA|Maine|ME|Maryland|MD|Massachusetts|MA|Michigan|MI|Minnesota|MN|Mississippi|MS|Missouri|MO|Montana|MT|Nebraska|NE|Nevada|NV|New Hampshire|NH|New Jersey|NJ|New Mexico|NM|New York|NY|North Carolina|NC|North Dakota|ND|Ohio|OH|Oklahoma|OK|Oregon|OR|Pennsylvania|PA|Rhode Island|RI|South Carolina|SC|South Dakota|SD|Tennessee|TN|Texas|TX|Utah|UT|Vermont|VT|Virginia|VA|Washington|WA|West Virginia|WV|Wisconsin|WI|Wyoming|WY|District of Columbia|DC|Washington DC|D\\.C\\.|Puerto Rico|PR|Guam|GU|U\\.S\\. Virgin Islands|VI|American Samoa|AS|Northern Mariana|MP|NYC|New York City|Los Angeles|LA|San Francisco|SF|San Jose|Seattle|Chicago|Houston|Dallas|Austin|San Antonio|Miami|Boston|Atlanta|Denver|Phoenix|San Diego|Orlando|Las Vegas|Minneapolis|St Louis|St\\. Louis|Raleigh|Charlotte|Pittsburgh|Baltimore|Sacramento|Salt Lake City|Honolulu|Tampa|Jacksonville|Cleveland|Columbus|Indianapolis|Kansas City|Nashville|Providence|Birmingham|Rochester|Buffalo|Hartford|Newark)",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/United_States.png" },

    { ...groupBaseOption, name: "🇯🇵 日本节点", type: USE_SMART_KERNEL ? "smart" : "url-test",
      "include-all": true, hidden: true, filter: "(?i)(🇯🇵|日本|Nippon|Nihon|Japan|\\bJP\\b|\\bJPN\\b|東京|Tokyo|大阪|Osaka|京都|Kyoto|北海道|Hokkaido|愛知|Aichi|福岡|Fukuoka|神奈川|Kanagawa|埼玉|Saitama|千葉|Chiba|兵庫|Hyogo|広島|Hiroshima|宮城|Miyagi|沖縄|Okinawa|名古屋|Nagoya|札幌|Sapporo|神戸|Kobe|横浜|Yokohama|川崎|Kawasaki|仙台|Sendai|長崎|Nagasaki|熊本|Kumamoto|鹿児島|Kagoshima|那覇|Naha|\\bNRT\\b|\\bHND\\b|\\bKIX\\b|\\bITM\\b|\\bNGO\\b|\\bCTS\\b|\\bFUK\\b|\\bOKA\\b)",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Japan.png" },

    { ...groupBaseOption, name: "🇰🇷 韩国节点", type: USE_SMART_KERNEL ? "smart" : "url-test",
      "include-all": true, hidden: true, filter: "(?i)(🇰🇷|韩国|대한민국|한국|South Korea|Republic of Korea|ROK|KOR|\\bKR\\b|\\bKorea\\b|서울|釜山|부산|대구|달구|인천|광주|대전|울산|제주|제주도|경기|Gyeonggi|강원|Gangwon|충북|Chungbuk|충남|Chungnam|전북|Jeonbuk|전남|Jeonnam|경북|Gyeongbuk|경남|Gyeongnam|세종|Sejong|ICN|GMP|PUS|CJU|Seoul|Busan|Daegu|Incheon|Gwangju|Daejeon|Ulsan|Jeju|Jeju Island)",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/South_Korea.png" },

    { ...groupBaseOption, name: "🌏 东南亚节点", type: USE_SMART_KERNEL ? "smart" : "url-test",
      "include-all": true, hidden: true, filter: "(?i)(🇸🇬|🇲🇾|🇹🇭|🇮🇩|🇵🇭|🇻🇳|🇧🇳|🇰🇭|🇱🇦|🇲🇲|🇹🇱|新加坡|马来西亚|泰国|印尼|印度尼西亚|菲律宾|越南|文莱|柬埔寨|老挝|缅甸|东帝汶|东南亚|Southeast Asia|ASEAN|Singapore|Malaysia|Thailand|Indonesia|Philippines|Vietnam|Brunei|Cambodia|Laos|Myanmar|Timor|Timor-Leste|SG|MY|TH|ID|PH|VN|BN|KH|LA|MM|TL|KL|Kuala Lumpur|Penang|Johor|Bangkok|BKK|Chiang Mai|Phuket|Jakarta|JKT|Surabaya|Medan|Bandung|Denpasar|Bali|Manila|MNL|Cebu|Davao|Ho Chi Minh|HCMC|Saigon|Hanoi|Da Nang|Phnom Penh|Siem Reap|Vientiane|Naypyidaw|Yangon|Mandalay|Bandar Seri Begawan|Dili|Singaporean|Malaysian|Thai|Indonesian|Filipino|Vietnamese)",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/Southeast_Asia.png" },

    { ...groupBaseOption, name: "🇪🇺 欧盟节点", type: USE_SMART_KERNEL ? "smart" : "url-test",
      "include-all": true, hidden: true, filter: "(?i)(🇪🇺|🇩🇪|🇫🇷|🇮🇹|🇪🇸|🇳🇱|🇵🇱|🇸🇪|🇧🇪|🇦🇹|🇮🇪|🇩🇰|🇫🇮|🇨🇿|🇷🇴|🇵🇹|🇬🇷|🇭🇺|🇧🇬|🇸🇰|🇱🇹|🇱🇻|🇭🇷|🇪🇪|🇱🇺|🇲🇹|🇨🇾|欧盟|德国|法国|意大利|西班牙|荷兰|波兰|瑞典|比利时|奥地利|爱尔兰|丹麦|芬兰|捷克|罗马尼亚|葡萄牙|希腊|匈牙利|保加利亚|斯洛伐克|立陶宛|拉脱维亚|克罗地亚|爱沙尼亚|卢森堡|马耳他|塞浦路斯|Germany|France|Italy|Spain|Netherlands|Poland|Sweden|Belgium|Austria|Ireland|Denmark|Finland|Czech|Romania|Portugal|Greece|Hungary|Bulgaria|Slovakia|Lithuania|Latvia|Croatia|Estonia|Luxembourg|Malta|Cyprus|DE|FR|IT|ES|NL|PL|SE|BE|AT|IE|DK|FI|CZ|RO|PT|GR|HU|BG|SK|LT|LV|HR|EE|LU|MT|CY)",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/European_Union.png" },

    { ...groupBaseOption, name: "🤖 AI 专用节点", type: USE_SMART_KERNEL ? "smart" : "url-test",
      "include-all": true, hidden: true, filter: "(?i)^(?!.*(中国|大陆|内地|俄罗斯|伊朗|朝鲜|叙利亚|古巴|委内瑞拉|白俄罗斯|缅甸|阿富汗|利比亚|苏丹|索马里|也门|伊拉克|CN|RU|KP|IR|SY|CU|VE|BY|MM|AF|LY|SD|SO|YE|IQ|新疆|西藏)).*(AI|ChatGPT|Grok|GPT|Claude|Gemini|US|JP|EU|SG|KR|CN|HK|MO|RU|KP|IR|SY|CU|VE|BY|MM|AF|LY|SD|SO|YE|IQ).*",
      icon: "https://fastly.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/AI.png" },

    { ...groupBaseOption, name: "延迟选优", type: USE_SMART_KERNEL ? "smart" : "url-test",
      "include-all": true, hidden: true, icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/speed.svg" },

    { ...groupBaseOption, name: "故障转移", type: USE_SMART_KERNEL ? "smart" : "url-test",
      "include-all": true, hidden: true, icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/ambulance.svg" },

    { ...groupBaseOption, name: "负载均衡(散列)", type: USE_SMART_KERNEL ? "smart" : "url-test",
      "include-all": true, hidden: true, icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/merry_go.svg" },

    { ...groupBaseOption, name: "负载均衡(轮询)", type: USE_SMART_KERNEL ? "smart" : "url-test",
      "include-all": true, hidden: true, icon: "https://fastly.jsdelivr.net/gh/clash-verge-rev/clash-verge-rev.github.io@main/docs/assets/icons/balance.svg" }
  ];

  // 根据内核类型处理 Meta 专属字段
  groups.forEach(group => {
    if (USE_SMART_KERNEL) {
      // Meta 内核：添加 Smart 专属优化
      group["policy-priority"] = "";
      group.uselightgbm = true;
      group.collectdata = false;
      group.strategy = "round-robin";
    } else {
      // 传统内核：清理所有 Meta 专属字段
      delete group.uselightgbm;
      delete group.collectdata;
      delete group["policy-priority"];
      delete group.strategy;
      if (group.type === "smart") group.type = "url-test";
    }
  });

  return groups;
}

// ==================== 主函数 ====================
function main(config) {
  const proxyCount = config?.proxies?.length ?? 0;
  const proxyProviderCount = typeof config?.["proxy-providers"] === "object" ? Object.keys(config["proxy-providers"]).length : 0;
  
  if (proxyCount === 0 && proxyProviderCount === 0) {
    throw new Error("配置文件中未找到任何代理（config.proxies 或 config['proxy-providers'] 为空）");
  }

  // 应用基础配置
  config["ntp"] = ntpConfig;
  config["dns"] = dnsConfig;
  config["rule-providers"] = ruleProviders;
  config["rules"] = rules;
  config["proxy-groups"] = generateProxyGroups();   // ← 动态生成

  // 只有 Meta 内核才开启的增强特性
  if (USE_SMART_KERNEL) {
    config["sniffer"] = config["sniffer"] || {
      enable: true,
      "force-dns-mapping": true,
      "parse-pure-ip": true,
      "override-destination": true,
      sniff: {
        TLS: { ports: [443, 8443] },
        HTTP: { ports: [80, "8080-8880"], "override-destination": true },
        QUIC: { ports: [443, 8443] }
      },
      "skip-domain": ["Mijia Cloud", "+.oray.com"]
    };

    config["unified-delay"] = true;
    config["tcp-concurrent"] = true;

    config["profile"] = config["profile"] || {};
    config["profile"]["store-selected"] = true;
    config["profile"]["store-fake-ip"] = true;
    config["profile"]["smart-collector-size"] = 100;
  }

  console.log(`[混合内核脚本] 当前模式：${USE_SMART_KERNEL ? '✅ Meta Smart 内核（完整智能）' : '✅ 传统 Clash 内核（url-test 兼容）'}`);
  return config;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { main };
}
