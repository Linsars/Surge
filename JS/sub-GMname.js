// ==UserScript==
// @name         智慧重命名 - GeoIP + 创意命名
// @version      4.5
// @description  SubStore 节点重命名：GeoIP 真实出口检测 + GPT 支持判断 + 多种创意循环命名
// @author       Linsar
// @example      #gm=诡秘&qz=机场&hz=GPT
// ==/UserScript==
//
// ── 参数 ─────────────────────────────────────────────────
// QZ=   前缀                              示例：qz=机场
// HZ=   后缀                              示例：hz=GPT 或 hz=香港
//         hz=GPT  → 仅对支持 GPT 的地区追加，已含 GPT 的跳过
//         hz=其他  → 对所有节点追加
// FGF=  分隔符（默认｜）
// GM=   命名模式（不传 → 节点名改为 地区-序号，CN 用城市名）
//
// ── GM 命名模式列表（含可用数量） ─────────────────────────
// 生肖      780项    12生肖循环，64八卦兜底，数字兜底
// 塔罗      1958项   22塔罗牌循环，88星座兜底，数字兜底
// 天使      96项     12天使循环，7宗罪兜底，数字兜底
// 农药      3810项   127王者荣耀英雄循环，首杀~团灭+斗罗斗破兜底，数字兜底
// 节气      600项    24节气循环，24唐朝官职兜底，数字兜底
// 吃货      1856项   64满汉全席菜名循环，清朝皇帝年号兜底，数字兜底
// 戏神      495项    九君人名→18神道→九君·初代~六代→九君·初代~六代·人~尸体，数字兜底
// 诡秘      198项    22途径×9序列（真实序列名）循环，数字兜底
// 任意文字   —       自定义文字循环，数字兜底

const args = $arguments || {};
const U = {};
for (const k in args) {
  if (Object.prototype.hasOwnProperty.call(args, k)) U[k.toUpperCase()] = args[k];
}

const SEP = U.FGF ? decodeURI(U.FGF) : '｜';
const PREFIX = U.QZ ? decodeURI(U.QZ) + SEP : '';
const SUFFIX = U.HZ ? SEP + decodeURI(U.HZ) : '';
const HZ_TEXT = U.HZ ? decodeURI(U.HZ) : '';
const IS_GPT = HZ_TEXT.toUpperCase() === 'GPT';
const GM = U.GM ? decodeURI(U.GM).trim() : '';

const UNSUPPORTED = new Set([
  'HK', 'TW', 'MO',
  'CN', 'RU', 'IR', 'KP', 'CU', 'BY', 'SY', 'AF', 'MM', 'LY', 'YE',
  'SD', 'ER', 'CF', 'TD', 'SS', 'MK'
]);

const ZODIAC = ['子鼠','丑牛','寅虎','卯兔','辰龙','巳蛇','午马','未羊','申猴','酉鸡','戌狗','亥猪'];
const TAROT = ['愚者','魔术师','女祭司','皇后','皇帝','教皇','恋人','战车','力量','隐士','命运之轮','正义','倒吊人','死神','节制','恶魔','塔','星星','月亮','太阳','审判','世界'];
const ANGELS = ['米迦勒','加百列','拉斐尔','乌列尔','拉贵尔','萨列尔','雷米尔','扎基尔','约菲尔','卡麦尔','哈尼尔','巴拉基勒'];
const SOLAR = ['立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至','小寒','大寒'];
const DOUBATTLE = ['魂士','魂师','大魂师','魂尊','魂宗','魂王','魂帝','魂圣','魂斗罗','封号斗罗','神级','斗之气','斗者','斗师','大斗师','斗灵','斗王','斗皇','斗宗','斗尊','斗圣','斗帝'];
const GUA_64 = ['乾','坤','屯','蒙','需','讼','师','比','小畜','履','泰','否','同人','大有','谦','豫','随','蛊','临','观','噬嗑','贲','剥','复','无妄','大畜','颐','大过','坎','离','咸','恒','遁','大壮','晋','明夷','家人','睽','蹇','解','损','益','夬','姤','萃','升','困','井','革','鼎','震','艮','渐','归妹','丰','旅','巽','兑','涣','节','中孚','小过','既济','未济'];
const SINS = ['傲慢','嫉妒','暴怒','懒惰','贪婪','暴食','色欲'];
const TANG = ['宰相','尚书','侍郎','郎中','员外郎','御史','太守','刺史','县令','主簿','司空','司徒','司马','太尉','中书令','门下侍中','尚书令','给事中','谏议大夫','大夫','卿','将军','校尉','都督'];
const CONSTELLATIONS_88 = ['仙女','唧筒','天燕','宝瓶','天鹰','天坛','白羊','御夫','牧夫','雕具','鹿豹','巨蟹','猎犬','大犬','小犬','摩羯','船底','仙后','半人马','仙王','鲸鱼','蝘蜓','圆规','天鸽','后发','南冕','北冕','乌鸦','巨爵','南十字','天鹅','海豚','箭鱼','天龙','小马','波江','天炉','双子','天鹤','武仙','时钟','长蛇','水蛇','印第安','蝎虎','狮子','小狮','天兔','天秤','豺狼','天猫','天琴','山案','显微镜','麒麟','苍蝇','矩尺','南极','蛇夫','猎户','孔雀','飞马','英仙','凤凰','绘架','双鱼','南鱼','船尾','罗盘','网罟','天箭','人马','天蝎','玉夫','盾牌','巨蛇','六分仪','金牛','望远镜','三角','南三角','杜鹃','大熊','小熊','室女','飞鱼','狐狸','船帆'];

function mergeArrays(main, helpers) {
  const result = [];
  for (let c = 0; ; c++) {
    const suffix = c === 0 ? '' : (helpers && c - 1 < helpers.length ? SEP + helpers[c - 1] : SEP + c);
    let added = false;
    for (let i = 0; i < main.length; i++) {
      result.push(main[i] + suffix);
      added = true;
    }
    if (!added || !helpers || c > helpers.length) break;
  }
  return result;
}

const CHIHUO = ['凤凰趴窝','龙肝凤髓','红烧麒麟面','红梅珠香','宫保野兔','祥龙双飞','爆炒田鸡','芫爆仔鸽','金丝烧麦','佛手金卷','龙凤柔情','明珠豆腐','砂锅煨鹿筋','红烧猴头蘑','鸡丝银耳','桂花鱼条','八宝兔酱','玉笋蕨菜','罗汉大虾','花菇鸭掌','五彩牛柳','挂炉走油鸡','麻辣牛肉','红烧鲍鱼','清蒸鳜鱼','松鼠鳜鱼','翠玉豆糕','栗子糕','双色豆糕','如意卷','绣球乾贝','炒珍珠鸡','奶汁鱼片','干连福海参','花菇鲟龙鱼','龙舟镢鱼','滑溜贝球','酱焖鹌鹑','蟹肉双笋丝','砂锅鱼翅','红烧鸡棕菌','牡丹银耳汤','清汤燕窝','凤尾鱼翅','金蟾玉鲍','一品鲍鱼羹','龙井竹荪','玉掌献寿','鸡枞菌汤','草菇西兰花','杏仁豆腐','挂炉烤鸭','燕窝八珍汤','桂花糕','荷花酥','莲子糕','杏仁露','冰糖银耳','拔丝苹果','一品官燕','奶汤蒲菜','御膳八珍','红烧肘子','清蒸龙虾'];

const XISHEN_PATHS = ['书','医','兵','黄','青','巧','弈','戏','偶','巫','力','卜','盗','娼','帝','鬼','天','邪'];
const XISHEN_RANKS = ['I阶','II阶','III阶','IV阶','V阶','VI阶','VII阶','VIII阶','半神'];
const JIUYUN_LORDS = [
  ['若水君','温若水'], ['极光君','杨宵'], ['红尘君','苏知微'],
  ['无极君','楼羽'], ['悬玉君','姬悬'], ['南海君','褚常青'],
  ['灵虚君','吴同源'], ['天枢君','陆循'], ['藏云君','齐暮云']
];
const JIUYUN_GEN = ['初代','二代','三代','四代','五代','六代'];
const JIUYUN_BEYOND = ['人','半神','神','鬼','尸体'];
const XISHEN = [];
// 第一循环：九君人名
for (let l = 0; l < JIUYUN_LORDS.length; l++) {
  XISHEN.push(JIUYUN_LORDS[l][0] + '·' + JIUYUN_LORDS[l][1]);
}
// 第二循环：18神道（主）× 9位阶（辅）
for (let r = 0; r < XISHEN_RANKS.length; r++) {
  for (let p = 0; p < XISHEN_PATHS.length; p++) {
    XISHEN.push(XISHEN_PATHS[p] + '神道·' + XISHEN_RANKS[r]);
  }
}
// 第三循环：九君·初代~六代
for (let l = 0; l < JIUYUN_LORDS.length; l++) {
  for (let g = 0; g < JIUYUN_GEN.length; g++) {
    XISHEN.push(JIUYUN_LORDS[l][0] + '·' + JIUYUN_LORDS[l][1] + '·' + JIUYUN_GEN[g]);
  }
}
// 第四循环：九君·初代~六代·人~尸体
for (let l = 0; l < JIUYUN_LORDS.length; l++) {
  for (let g = 0; g < JIUYUN_GEN.length; g++) {
    for (let b = 0; b < JIUYUN_BEYOND.length; b++) {
      XISHEN.push(JIUYUN_LORDS[l][0] + '·' + JIUYUN_LORDS[l][1] + '·' + JIUYUN_GEN[g] + '·' + JIUYUN_BEYOND[b]);
    }
  }
}

const GUIMI_PATHS = [
  ['愚者','占卜家','小丑','魔术师','无面人','秘偶大师','诡法师','古代学者','奇迹师','诡秘侍者'],
  ['门','学徒','诈骗师','戏法大师','记录官','旅行家','秘术导师','神话学专家','旅法师','门之主'],
  ['错误','偷盗者','诈骗师','盗火人','窃梦家','盗贼','寄生者','神偷','解密学者','错误'],
  ['空想家','观众','读心者','心理医生','催眠师','梦境行者','操纵师','织梦人','洞察者','作家'],
  ['白塔','阅读者','博学者','秘术导师','知识皇帝','智者','全知者','天国使者','视界主宰','白塔'],
  ['倒吊人','秘祈人','倾听者','隐修士','蔷薇主教','牧羊人','黑骑士','三首圣堂','秽语长老','暗天使'],
  ['暴君','水手','暴风祭司','航海家','风暴使者','海洋歌者','灾祸祭司','海神','灾难主宰','雷霆之主'],
  ['太阳','歌颂者','祈光人','太阳神官','公证人','光之祭司','无暗之火','巡夜人','圣者','太阳'],
  ['真理','通识者','考古学家','环境分析师','机械专家','物理学家','工匠','博学者','知识教皇','贤者'],
  ['死神','收尸人','掘墓人','不死者','幽魂','怨魂','不死之王','冥使','死亡执政官','死神'],
  ['黑皇帝','律师','野蛮人','贿赂者','警长','仲裁人','堕落伯爵','混乱导师','暴君','黑皇帝'],
  ['审判者','仲裁人','治安官','审判者','公证人','执法者','秩序之首','法官','秩序执法官','裁决者'],
  ['魔女','刺客','潜行者','女巫','欢愉魔女','痛苦魔女','绝望魔女','不老魔女','灾祸魔女','黑魔女'],
  ['战神','猎人','格斗家','纵火家','阴谋家','狼人','猎魔者','征服者','天气支配者','铁血骑士'],
  ['命运之轮','怪物','诈骗师','机器之心','预言家','幸运儿','灾祸之主','神秘学家','智慧之眼','命运之轮'],
  ['大地母神','耕种者','工匠','知识导师','农业学者','自然行者','神谕使','荒野之神','丰收女神','大地之母'],
  ['大地神','药师','医生','药理学家','魔药师','德鲁伊','药王','植物学家','神医','丰收之子'],
  ['战士','战士','格斗家','武器大师','封印师','光之祭司','无暗之火','耀骑士','荣耀战神','铁血骑士'],
  ['隐者','窥秘人','占星人','神秘学家','隐者','星象师','先知','智者','视界主宰','知识皇帝'],
  ['深渊','罪犯','变异人','纵火家','恐惧使者','恐惧之王','梦魇','恶魔','灾祸之主','堕落之主'],
  ['黑夜女神','不眠者','午夜诗人','梦魇','守夜人','灵巫','恐惧之王','隐秘之仆','梦境执政官','黑夜女神'],
  ['红祭司','猎人','格斗家','纵火家','阴谋家','狼人','猎魔者','征服者','天气支配者','铁血骑士']
];
const GUIMI = [];
for (let r = 0; r < 9; r++) {
  for (let p = 0; p < GUIMI_PATHS.length; p++) {
    GUIMI.push(GUIMI_PATHS[p][0] + '·' + GUIMI_PATHS[p][r + 1]);
  }
}

const QING_EMPERORS = [
  '天命','天聪','崇德','顺治','康熙','雍正','乾隆',
  '嘉庆','道光','咸丰','同治','光绪','宣统',
  '努尔哈赤','皇太极','多尔衮','孝庄','康熙帝',
  '雍正帝','乾隆帝','和珅','嘉庆帝','道光帝',
  '咸丰帝','慈禧','同治帝','光绪帝','溥仪'
];

const NONGYAO = [
  '廉颇','小乔','赵云','墨子','妲己','嬴政','孙尚香','鲁班七号','庄周','刘禅',
  '高渐离','阿轲','钟无艳','孙膑','扁鹊','白起','芈月','吕布','周瑜','夏侯惇',
  '甄姬','曹操','典韦','宫本武藏','李白','马可波罗','狄仁杰','达摩','项羽',
  '武则天','老夫子','关羽','貂蝉','安琪拉','程咬金','露娜','姜子牙','刘邦',
  '韩信','王昭君','兰陵王','花木兰','张良','不知火舞','娜可露露','橘右京',
  '亚瑟','孙悟空','牛魔','后羿','刘备','张飞','李元芳','虞姬','钟馗','杨玉环',
  '杨戬','女娲','哪吒','干将莫邪','雅典娜','蔡文姬','太乙真人','东皇太一',
  '鬼谷子','诸葛亮','大乔','黄忠','铠','百里守约','百里玄策','苏烈','梦奇',
  '明世隐','公孙离','裴擒虎','狂铁','米莱狄','元歌','孙策','司马懿','盾山',
  '伽罗','李信','上官婉儿','嫦娥','猪八戒','盘古','瑶','云中君','曜','马超',
  '西施','鲁班大师','蒙犽','蒙恬','镜','澜','阿古朵','夏洛特','司空震','艾琳',
  '云缨','金蝉','暃','桑启','戈娅','海月','赵怀真','莱西奥','姬小满','亚连',
  '朵莉亚','海诺','敖隐','大司命','元流之子','少司缘','影','苍','空空儿',
  '蚩奼','大禹','孙权','沈梦溪'
];

const KILL_STREAKS = ['首杀','单杀','双杀','三杀','四杀','五杀','团灭'];
const NONGYAO_HELPERS = KILL_STREAKS.concat(DOUBATTLE);

const MODES = {
  '生肖': mergeArrays(ZODIAC, GUA_64),
  '塔罗': mergeArrays(TAROT, CONSTELLATIONS_88),
  '天使': mergeArrays(ANGELS, SINS),
  '农药': mergeArrays(NONGYAO, NONGYAO_HELPERS),
  '节气': mergeArrays(SOLAR, TANG),
  '吃货': mergeArrays(CHIHUO, QING_EMPERORS),
  '戏神': XISHEN,
  '诡秘': GUIMI
};

async function operator(proxies = [], targetPlatform, env) {
  if (!proxies?.length) return proxies;
  const $ = $substore;
  const cache = scriptResourceCache;
  const cacheEnabled = !!$arguments.cache;
  const ccMap = {};
  const geoCache = {};

  const servers = [];
  const seen = {};
  for (let i = 0; i < proxies.length; i++) {
    const s = proxies[i].server;
    if (!seen[s]) { seen[s] = true; servers.push(s); }
  }

  async function geoLookup(host) {
    if (geoCache[host]) { ccMap[host] = geoCache[host]; return; }
    if (cacheEnabled) {
      const cached = cache.get('geo:' + host);
      if (cached != null) {
        const geo = typeof cached === 'string' ? { cc: cached, city: '' } : cached;
        if (geo.cc && geo.cc !== 'XX') {
          geoCache[host] = geo;
          ccMap[host] = geo;
          return;
        }
      }
    }
    let target = host;
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host) && host.indexOf(':') === -1) {
      try {
        const dnsResp = await $.http.get({ url: 'https://cloudflare-dns.com/dns-query?name=' + encodeURIComponent(host) + '&type=A', timeout: 5000, headers: { 'Accept': 'application/dns-json' } });
        const dnsData = typeof dnsResp.body === 'string' ? JSON.parse(dnsResp.body) : dnsResp.body;
        if (dnsData && dnsData.Answer) {
          for (let i = 0; i < dnsData.Answer.length; i++) {
            if (dnsData.Answer[i].type === 1) { target = dnsData.Answer[i].data; break; }
          }
        }
      } catch (e) {}
    }
    try {
      const resp = await $.http.get({ url: 'https://api.ip.sb/geoip/' + target, timeout: 5000 });
      let d;
      try { d = typeof resp.body === 'string' ? JSON.parse(resp.body) : resp.body; } catch (e) { d = null; }
      if (d && d.country_code) {
        const geo = { cc: d.country_code.toUpperCase(), city: d.city || '' };
        geoCache[host] = geo;
        ccMap[host] = geo;
        if (cacheEnabled) cache.set('geo:' + host, geo);
        return;
      }
    } catch (e) {}
    try {
      const resp2 = await $.http.get({ url: 'https://ipinfo.io/' + target + '/json', timeout: 5000 });
      let d2;
      try { d2 = typeof resp2.body === 'string' ? JSON.parse(resp2.body) : resp2.body; } catch (e) { d2 = null; }
      if (d2 && d2.country) {
        const geo2 = { cc: d2.country.toUpperCase(), city: d2.city || '' };
        geoCache[host] = geo2;
        ccMap[host] = geo2;
        if (cacheEnabled) cache.set('geo:' + host, geo2);
        return;
      }
    } catch (e) {}
    geoCache[host] = { cc: 'XX', city: '' };
  }

  const start = Date.now();
  for (let i = 0; i < servers.length; i += 5) {
    if (Date.now() - start > 40000) break;
    await Promise.all(servers.slice(i, i + 5).map(h => geoLookup(h)));
    if (i + 5 < servers.length) await new Promise(r => setTimeout(r, 200));
  }

  const SUP = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
  function sup(n) {
    if (n <= 0) return '';
    let s = '';
    for (const c of n.toString()) s += SUP[c] || c;
    return s;
  }

  function baseName(mode, idx) {
    const arr = MODES[mode];
    if (arr) { const i = idx % arr.length; const c = Math.floor(idx / arr.length); return c > 0 ? arr[i] + sup(c + 1) : arr[i]; }
    return mode;
  }

  function geoLabel(server) {
    const geo = ccMap[server];
    if (!geo || !geo.cc || geo.cc === 'XX') return null;
    return (geo.cc === 'CN' && geo.city) ? geo.city : geo.cc;
  }

  function isSupported(server) {
    const geo = ccMap[server];
    return geo && geo.cc && geo.cc !== 'XX' && !UNSUPPORTED.has(geo.cc);
  }

  const result = [];

  if (GM) {
    const groups = {};
    for (let i = 0; i < proxies.length; i++) {
      proxies[i]._b = baseName(GM, i);
      if (!groups[proxies[i]._b]) groups[proxies[i]._b] = [];
      groups[proxies[i]._b].push(proxies[i]);
    }
    for (const b of Object.keys(groups)) {
      const arr = groups[b];
      for (let i = 0; i < arr.length; i++) {
        const geo = geoLabel(arr[i].server);
        const cc = geo ? geo + SEP : '';
        const name = arr.length > 1 ? b + sup(i + 1) : b;
        arr[i].name = PREFIX + cc + name;
        delete arr[i]._b;
        result.push(arr[i]);
      }
    }
  } else {
    const counter = {};
    for (let i = 0; i < proxies.length; i++) {
      const geo = geoLabel(proxies[i].server);
      if (geo) {
        if (!counter[geo]) counter[geo] = 0;
        counter[geo]++;
        proxies[i].name = PREFIX + geo + '-' + String(counter[geo]).padStart(2, '0');
      } else {
        proxies[i].name = PREFIX + proxies[i].name.trim();
      }
      result.push(proxies[i]);
    }
  }

  if (HZ_TEXT) {
    if (IS_GPT) {
      for (let i = 0; i < result.length; i++) {
        if (isSupported(result[i].server)) result[i].name += SUFFIX;
      }
    } else {
      for (let i = 0; i < result.length; i++) {
        result[i].name += SUFFIX;
      }
    }
  }

  let geoOK = 0;
  for (const k in ccMap) { if (ccMap[k] && ccMap[k].cc && ccMap[k].cc !== 'XX') geoOK++; }
  const geoFail = servers.length - geoOK;
  const msg = geoFail > 0
    ? 'v4.5 地区码 ' + geoOK + '/' + servers.length + ' 失败 ' + geoFail
    : 'v4.5 地区码 ' + geoOK + '/' + servers.length;
  $.notify('命名', '', msg);
  return result;
}
