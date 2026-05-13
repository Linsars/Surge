// ==UserScript==
// @name         智慧重命名 - GeoIP + 创意命名
// @version      7.4
// @description  SubStore 节点重命名：GeoIP 出口检测 + GPT/流媒体判断 + 多创意循环命名
// @author       Linsar
// @example      #gm=诡秘&qz=机场&hz=GPT
// ==/UserScript==
//
// ── 参数 ─────────────────────────────────────────────────
// QZ=       前缀                              示例：qz=机场
// HZ=       后缀                              示例：hz=GPT 或 hz=香港
//             hz=GPT  → 仅对支持 GPT 的地区追加，已含 GPT 的跳过
//             hz=其他  → 对所有节点追加
// FGF=      分隔符（默认｜，地区码分隔符默认 ?）
// RV=       设为1时屏蔽所有 VLESS 节点（优先级最高）  示例：rv=1
// GM=       命名模式（不传 → 地区-序号，CN 用城市名）
//             gm=0    → 轻量模式：跳过 GeoIP 网络请求，仅用节点名识别地区码
//             gm=随机 → 按地区分组，每组随机匹配一个模式，无旗帜用吃货兜底
// CUSTOM=   自定义命名列表（逗号分隔）        示例：custom=东京,大阪,名古屋
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
// 崩坏      525项    15崩坏角色循环，34原神角色兜底，数字兜底
// 克系      2058项   14克苏鲁循环，修仙137境界兜底，数字兜底
// 修仙      1918项   137修仙境界循环，14克苏鲁兜底，数字兜底
// 随机      —        按地区分组，每组随机匹配一个模式，无旗帜用吃货兜底
// 任意文字   —        自定义文字循环，数字兜底
//

const args = $arguments ?? {};
const U = {};
for (const k in args) {
  if (Object.prototype.hasOwnProperty.call(args, k)) {
    U[k.toUpperCase()] = decodeURI(args[k]).trim();
  }
}

const SEP = U.FGF || '｜';
const PREFIX = U.QZ ? U.QZ + SEP : '';
const SUFFIX = U.HZ ? SEP + U.HZ : '';
const HZ_TEXT = U.HZ || '';
const IS_GPT = HZ_TEXT.toUpperCase() === 'GPT';
const GM_MODE = U.GM || '';
const CUSTOM_LIST = U.CUSTOM ? U.CUSTOM.split(/[,，]/).map(s => s.trim()).filter(Boolean) : [];
const NAME_SEP = U.FGF ? SEP : ' ? ';

const UNSUPPORTED = new Set(['HK','TW','MO','CN','RU','IR','KP','CU','BY','SY','AF','MM','LY','YE','SD','ER','CF','TD','SS','MK']);

const ZODIAC = ['子鼠','丑牛','寅虎','卯兔','辰龙','巳蛇','午马','未羊','申猴','酉鸡','戌狗','亥猪'];
const TAROT = ['愚者','魔术师','女祭司','皇后','皇帝','教皇','恋人','战车','力量','隐士','命运之轮','正义','倒吊人','死神','节制','恶魔','塔','星星','月亮','太阳','审判','世界'];
const ANGELS = ['米迦勒','加百列','拉斐尔','乌列尔','拉贵尔','萨列尔','雷米尔','扎基尔','约菲尔','卡麦尔','哈尼尔','巴拉基勒'];
const SOLAR = ['立春','雨水','惊蛰','春分','清明','谷雨','立夏','小满','芒种','夏至','小暑','大暑','立秋','处暑','白露','秋分','寒露','霜降','立冬','小雪','大雪','冬至','小寒','大寒'];
const DOUBATTLE = ['魂士','魂师','大魂师','魂尊','魂宗','魂王','魂帝','魂圣','魂斗罗','封号斗罗','神级','斗之气','斗者','斗师','大斗师','斗灵','斗王','斗皇','斗宗','斗尊','斗圣','斗帝'];
const GUA_64 = ['乾','坤','屯','蒙','需','讼','师','比','小畜','履','泰','否','同人','大有','谦','豫','随','蛊','临','观','噬嗑','贲','剥','复','无妄','大畜','颐','大过','坎','离','咸','恒','遁','大壮','晋','明夷','家人','睽','蹇','解','损','益','夬','姤','萃','升','困','井','革','鼎','震','艮','渐','归妹','丰','旅','巽','兑','涣','节','中孚','小过','既济','未济'];
const SINS = ['傲慢','嫉妒','暴怒','懒惰','贪婪','暴食','色欲'];
const TANG = ['宰相','尚书','侍郎','郎中','员外郎','御史','太守','刺史','县令','主簿','司空','司徒','司马','太尉','中书令','门下侍中','尚书令','给事中','谏议大夫','大夫','卿','将军','校尉','都督'];
const CONSTELLATIONS_88 = ['仙女','唧筒','天燕','宝瓶','天鹰','天坛','白羊','御夫','牧夫','雕具','鹿豹','巨蟹','猎犬','大犬','小犬','摩羯','船底','仙后','半人马','仙王','鲸鱼','蝘蜓','圆规','天鸽','后发','南冕','北冕','乌鸦','巨爵','南十字','天鹅','海豚','箭鱼','天龙','小马','波江','天炉','双子','天鹤','武仙','时钟','长蛇','水蛇','印第安','蝎虎','狮子','小狮','天兔','天秤','豺狼','天猫','天琴','山案','显微镜','麒麟','苍蝇','矩尺','南极','蛇夫','猎户','孔雀','飞马','英仙','凤凰','绘架','双鱼','南鱼','船尾','罗盘','网罟','天箭','人马','天蝎','玉夫','盾牌','巨蛇','六分仪','金牛','望远镜','三角','南三角','杜鹃','大熊','小熊','室女','飞鱼','狐狸','船帆'];

const CHIHUO = ['凤凰趴窝','龙肝凤髓','红烧麒麟面','红梅珠香','宫保野兔','祥龙双飞','爆炒田鸡','芫爆仔鸽','金丝烧麦','佛手金卷','龙凤柔情','明珠豆腐','砂锅煨鹿筋','红烧猴头蘑','鸡丝银耳','桂花鱼条','八宝兔酱','玉笋蕨菜','罗汉大虾','花菇鸭掌','五彩牛柳','挂炉走油鸡','麻辣牛肉','红烧鲍鱼','清蒸鳜鱼','松鼠鳜鱼','翠玉豆糕','栗子糕','双色豆糕','如意卷','绣球乾贝','炒珍珠鸡','奶汁鱼片','干连福海参','花菇鲟龙鱼','龙舟镢鱼','滑溜贝球','酱焖鹌鹑','蟹肉双笋丝','砂锅鱼翅','红烧鸡棕菌','牡丹银耳汤','清汤燕窝','凤尾鱼翅','金蟾玉鲍','一品鲍鱼羹','龙井竹荪','玉掌献寿','鸡枞菌汤','草菇西兰花','杏仁豆腐','挂炉烤鸭','燕窝八珍汤','桂花糕','荷花酥','莲子糕','杏仁露','冰糖银耳','拔丝苹果','一品官燕','奶汤蒲菜','御膳八珍','红烧肘子','清蒸龙虾'];

const XISHEN_PATHS = ['书','医','兵','黄','青','巧','弈','戏','偶','巫','力','卜','盗','娼','帝','鬼','天','邪'];
const XISHEN_RANKS = ['I阶','II阶','III阶','IV阶','V阶','VI阶','VII阶','VIII阶','半神'];
const JIUYUN_LORDS = [['若水君','温若水'],['极光君','杨宵'],['红尘君','苏知微'],['无极君','楼羽'],['悬玉君','姬悬'],['南海君','褚常青'],['灵虚君','吴同源'],['天枢君','陆循'],['藏云君','齐暮云']];
const JIUYUN_GEN = ['初代','二代','三代','四代','五代','六代'];
const JIUYUN_BEYOND = ['人','半神','神','鬼','尸体'];
const XISHEN = [];
for (let l = 0; l < JIUYUN_LORDS.length; l++) XISHEN.push(JIUYUN_LORDS[l][0] + '·' + JIUYUN_LORDS[l][1]);
for (let r = 0; r < XISHEN_RANKS.length; r++) for (let p = 0; p < XISHEN_PATHS.length; p++) XISHEN.push(XISHEN_PATHS[p] + '神道·' + XISHEN_RANKS[r]);
for (let l = 0; l < JIUYUN_LORDS.length; l++) for (let g = 0; g < JIUYUN_GEN.length; g++) XISHEN.push(JIUYUN_LORDS[l][0] + '·' + JIUYUN_LORDS[l][1] + '·' + JIUYUN_GEN[g]);
for (let l = 0; l < JIUYUN_LORDS.length; l++) for (let g = 0; g < JIUYUN_GEN.length; g++) for (let b = 0; b < JIUYUN_BEYOND.length; b++) XISHEN.push(JIUYUN_LORDS[l][0] + '·' + JIUYUN_LORDS[l][1] + '·' + JIUYUN_GEN[g] + '·' + JIUYUN_BEYOND[b]);

const GUIMI_PATHS = [['愚者','占卜家','小丑','魔术师','无面人','秘偶大师','诡法师','古代学者','奇迹师','诡秘侍者'],['门','学徒','诈骗师','戏法大师','记录官','旅行家','秘术导师','神话学专家','旅法师','门之主'],['错误','偷盗者','诈骗师','盗火人','窃梦家','盗贼','寄生者','神偷','解密学者','错误'],['空想家','观众','读心者','心理医生','催眠师','梦境行者','操纵师','织梦人','洞察者','作家'],['白塔','阅读者','博学者','秘术导师','知识皇帝','智者','全知者','天国使者','视界主宰','白塔'],['倒吊人','秘祈人','倾听者','隐修士','蔷薇主教','牧羊人','黑骑士','三首圣堂','秽语长老','暗天使'],['暴君','水手','暴风祭司','航海家','风暴使者','海洋歌者','灾祸祭司','海神','灾难主宰','雷霆之主'],['太阳','歌颂者','祈光人','太阳神官','公证人','光之祭司','无暗之火','巡夜人','圣者','太阳'],['真理','通识者','考古学家','环境分析师','机械专家','物理学家','工匠','博学者','知识教皇','贤者'],['死神','收尸人','掘墓人','不死者','幽魂','怨魂','不死之王','冥使','死亡执政官','死神'],['黑皇帝','律师','野蛮人','贿赂者','警长','仲裁人','堕落伯爵','混乱导师','暴君','黑皇帝'],['审判者','仲裁人','治安官','审判者','公证人','执法者','秩序之首','法官','秩序执法官','裁决者'],['魔女','刺客','潜行者','女巫','欢愉魔女','痛苦魔女','绝望魔女','不老魔女','灾祸魔女','黑魔女'],['战神','猎人','格斗家','纵火家','阴谋家','狼人','猎魔者','征服者','天气支配者','铁血骑士'],['命运之轮','怪物','诈骗师','机器之心','预言家','幸运儿','灾祸之主','神秘学家','智慧之眼','命运之轮'],['大地母神','耕种者','工匠','知识导师','农业学者','自然行者','神谕使','荒野之神','丰收女神','大地之母'],['大地神','药师','医生','药理学家','魔药师','德鲁伊','药王','植物学家','神医','丰收之子'],['战士','战士','格斗家','武器大师','封印师','光之祭司','无暗之火','耀骑士','荣耀战神','铁血骑士'],['隐者','窥秘人','占星人','神秘学家','隐者','星象师','先知','智者','视界主宰','知识皇帝'],['深渊','罪犯','变异人','纵火家','恐惧使者','恐惧之王','梦魇','恶魔','灾祸之主','堕落之主'],['黑夜女神','不眠者','午夜诗人','梦魇','守夜人','灵巫','恐惧之王','隐秘之仆','梦境执政官','黑夜女神'],['红祭司','猎人','格斗家','纵火家','阴谋家','狼人','猎魔者','征服者','天气支配者','铁血骑士']];
const GUIMI = [];
for (let r = 0; r < 9; r++) for (let p = 0; p < GUIMI_PATHS.length; p++) GUIMI.push(GUIMI_PATHS[p][0] + '·' + GUIMI_PATHS[p][r + 1]);

const QING_EMPERORS = ['天命','天聪','崇德','顺治','康熙','雍正','乾隆','嘉庆','道光','咸丰','同治','光绪','宣统','努尔哈赤','皇太极','多尔衮','孝庄','康熙帝','雍正帝','乾隆帝','和珅','嘉庆帝','道光帝','咸丰帝','慈禧','同治帝','光绪帝','溥仪'];
const NONGYAO = ['廉颇','小乔','赵云','墨子','妲己','嬴政','孙尚香','鲁班七号','庄周','刘禅','高渐离','阿轲','钟无艳','孙膑','扁鹊','白起','芈月','吕布','周瑜','夏侯惇','甄姬','曹操','典韦','宫本武藏','李白','马可波罗','狄仁杰','达摩','项羽','武则天','老夫子','关羽','貂蝉','安琪拉','程咬金','露娜','姜子牙','刘邦','韩信','王昭君','兰陵王','花木兰','张良','不知火舞','娜可露露','橘右京','亚瑟','孙悟空','牛魔','后羿','刘备','张飞','李元芳','虞姬','钟馗','杨玉环','杨戬','女娲','哪吒','干将莫邪','雅典娜','蔡文姬','太乙真人','东皇太一','鬼谷子','诸葛亮','大乔','黄忠','铠','百里守约','百里玄策','苏烈','梦奇','明世隐','公孙离','裴擒虎','狂铁','米莱狄','元歌','孙策','司马懿','盾山','伽罗','李信','上官婉儿','嫦娥','猪八戒','盘古','瑶','云中君','曜','马超','西施','鲁班大师','蒙犽','蒙恬','镜','澜','阿古朵','夏洛特','司空震','艾琳','云缨','金蝉','暃','桑启','戈娅','海月','赵怀真','莱西奥','姬小满','亚连','朵莉亚','海诺','敖隐','大司命','元流之子','少司缘','影','苍','空空儿','蚩奼','大禹','孙权','沈梦溪'];
const KILL_STREAKS = ['首杀','单杀','双杀','三杀','四杀','五杀','团灭'];
const NONGYAO_HELPERS = KILL_STREAKS.concat(DOUBATTLE);

const GENSHIN = ['风主','岩主','雷主','草主','水主','火主','冰主','旅行者','空','荧','钟离','温迪','雷电将军','纳西妲','芙宁娜','那维莱特','胡桃','甘雨','魈','荒泷一斗','八重神子','神里绫华','宵宫','申鹤','夜兰','行秋','香菱','班尼特','迪卢克','刻晴','莫娜','七七','可莉','优菈'];
const HONKAI_BASE = ['芽衣','琪亚娜','布洛妮娅','希儿','德丽莎','符华','渡鸦','空之律者','雷之律者','炎之律者','识之律者','终焉之律者','理之律者','死之律者','言灵'];

const RANK_LOW = ['一阶','二阶','三阶','四阶','五阶','六阶','七阶','八阶','九阶','大圆满'];
const RANK_HIGH = ['半步','一转','二转','三转','四转','五转','六转','七转','八转','九转','•真','•极'];
const XIUXIAN_REALMS = ['凡人','练气','筑基','金丹','元婴','化神','炼虚','合道','大乘','渡劫','真仙','仙王','仙帝','仙尊','混沌圣体'];
const XIUXIAN = [];
for (let i = 0; i < XIUXIAN_REALMS.length; i++) {
  const realm = XIUXIAN_REALMS[i];
  if (i === 0) { XIUXIAN.push(realm); continue; }
  const ranks = i <= 9 ? RANK_LOW : RANK_HIGH;
  for (let r = 0; r < ranks.length; r++) XIUXIAN.push(realm + '·' + ranks[r]);
}

const CTHULHU = ['克苏鲁','阿撒托斯','犹格索托斯','奈亚拉托提普','莎布·尼古拉丝','茨密戈','哈斯塔','达贡','印斯茅斯','拉莱耶','深潜者','古神低语','不可名状','旧日支配者'];

function mergeArrays(main, helpers) {
  const result = [];
  for (let c = 0; ; c++) {
    const suffix = c === 0 ? '' : (helpers && c - 1 < helpers.length ? SEP + helpers[c - 1] : SEP + c);
    let added = false;
    for (const m of main) { result.push(m + suffix); added = true; }
    if (!added || !helpers || c > helpers.length) break;
  }
  return result;
}

const MODES = {
  '生肖': mergeArrays(ZODIAC, GUA_64),
  '塔罗': mergeArrays(TAROT, CONSTELLATIONS_88),
  '天使': mergeArrays(ANGELS, SINS),
  '农药': mergeArrays(NONGYAO, NONGYAO_HELPERS),
  '节气': mergeArrays(SOLAR, TANG),
  '吃货': mergeArrays(CHIHUO, QING_EMPERORS),
  '戏神': XISHEN,
  '诡秘': GUIMI,
  '崩坏': mergeArrays(HONKAI_BASE, GENSHIN),
  '修仙': mergeArrays(XIUXIAN, CTHULHU),
  '克系': mergeArrays(CTHULHU, XIUXIAN),
};
const MODE_KEYS = Object.keys(MODES);

const SUP = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
function sup(n) {
  if (n <= 0) return '';
  let s = '';
  for (const c of n.toString()) s += SUP[c] || c;
  return s;
}

function cc2flag(cc) {
  if (!cc || cc.length !== 2) return '';
  return String.fromCodePoint(...cc.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0)));
}

const FLAG_CC = {
  '🇭🇰':'HK','🇹🇼':'TW','🇲🇴':'MO','🇨🇳':'CN','🇺🇸':'US','🇯🇵':'JP','🇰🇷':'KR',
  '🇸🇬':'SG','🇬🇧':'GB','🇩🇪':'DE','🇫🇷':'FR','🇨🇦':'CA','🇦🇺':'AU','🇳🇱':'NL',
  '🇸🇪':'SE','🇳🇴':'NO','🇫🇮':'FI','🇨🇭':'CH','🇮🇹':'IT','🇪🇸':'ES','🇵🇹':'PT',
  '🇧🇪':'BE','🇦🇹':'AT','🇮🇪':'IE','🇱🇺':'LU','🇩🇰':'DK','🇵🇱':'PL','🇨🇿':'CZ',
  '🇭🇺':'HU','🇷🇴':'RO','🇧🇬':'BG','🇬🇷':'GR','🇹🇷':'TR','🇷🇺':'RU','🇺🇦':'UA',
  '🇮🇱':'IL','🇦🇪':'AE','🇸🇦':'SA','🇮🇳':'IN','🇹🇭':'TH','🇲🇾':'MY','🇵🇭':'PH',
  '🇻🇳':'VN','🇮🇩':'ID','🇧🇷':'BR','🇦🇷':'AR','🇨🇱':'CL','🇲🇽':'MX','🇨🇴':'CO',
  '🇿🇦':'ZA','🇪🇬':'EG','🇳🇬':'NG','🇰🇪':'KE','🇵🇰':'PK','🇧🇩':'BD','🇱🇰':'LK',
  '🇳🇵':'NP','🇲🇲':'MM','🇰🇭':'KH','🇱🇦':'LA','🇳🇿':'NZ','🇮🇸':'IS',
  '🇪🇪':'EE','🇱🇻':'LV','🇱🇹':'LT','🇸🇰':'SK','🇭🇷':'HR','🇸🇮':'SI','🇷🇸':'RS',
  '🇺🇾':'UY','🇵🇪':'PE','🇪🇨':'EC',
}
const LONG_KW = {
  '香港':'HK','hong kong':'HK','台湾':'TW','taiwan':'TW','澳门':'MO','macau':'MO',
  '中国':'CN','china':'CN','美国':'US','america':'US','united states':'US',
  '日本':'JP','japan':'JP','韩国':'KR','korea':'KR','south korea':'KR',
  '新加坡':'SG','singapore':'SG','英国':'GB','britain':'GB','united kingdom':'GB',
  '德国':'DE','germany':'DE','法国':'FR','france':'FR','加拿大':'CA','canada':'CA',
  '澳大利亚':'AU','australia':'AU','荷兰':'NL','netherlands':'NL',
  '瑞典':'SE','sweden':'SE','挪威':'NO','norway':'NO','芬兰':'FI','finland':'FI',
  '瑞士':'CH','switzerland':'CH','意大利':'IT','italy':'IT',
  '西班牙':'ES','spain':'ES','葡萄牙':'PT','portugal':'PT',
  '比利时':'BE','belgium':'BE','奥地利':'AT','austria':'AT',
  '爱尔兰':'IE','ireland':'IE','卢森堡':'LU','luxembourg':'LU',
  '丹麦':'DK','denmark':'DK','波兰':'PL','poland':'PL',
  '捷克':'CZ','czech':'CZ','czechia':'CZ','匈牙利':'HU','hungary':'HU',
  '罗马尼亚':'RO','romania':'RO','保加利亚':'BG','bulgaria':'BG',
  '希腊':'GR','greece':'GR','土耳其':'TR','turkey':'TR',
  '俄罗斯':'RU','russia':'RU','乌克兰':'UA','ukraine':'UA',
  '以色列':'IL','israel':'IL','阿联酋':'AE','uae':'AE',
  '沙特':'SA','saudi':'SA','印度':'IN','india':'IN',
  '泰国':'TH','thailand':'TH','马来西亚':'MY','malaysia':'MY',
  '菲律宾':'PH','philippines':'PH','越南':'VN','vietnam':'VN',
  '印尼':'ID','indonesia':'ID','巴西':'BR','brazil':'BR',
  '阿根廷':'AR','argentina':'AR','智利':'CL','chile':'CL',
  '墨西哥':'MX','mexico':'MX','哥伦比亚':'CO','colombia':'CO',
  '南非':'ZA','south africa':'ZA','埃及':'EG','egypt':'EG',
  '尼日利亚':'NG','nigeria':'NG','肯尼亚':'KE','kenya':'KE',
  '巴基斯坦':'PK','pakistan':'PK','孟加拉':'BD','bangladesh':'BD',
  '斯里兰卡':'LK','尼泊尔':'NP','缅甸':'MM','柬埔寨':'KH','老挝':'LA',
  '新西兰':'NZ','new zealand':'NZ','冰岛':'IS','iceland':'IS',
  '爱沙尼亚':'EE','拉脱维亚':'LV','立陶宛':'LT',
  '斯洛伐克':'SK','克罗地亚':'HR','斯洛文尼亚':'SI','塞尔维亚':'RS',
  '乌拉圭':'UY','秘鲁':'PE','厄瓜多尔':'EC',
}
const SHORT_CODES = {
  'HK':'HK','TW':'TW','MO':'MO','CN':'CN','US':'US','JP':'JP','KR':'KR',
  'SG':'SG','UK':'GB','GB':'GB','DE':'DE','FR':'FR','CA':'CA','AU':'AU',
  'NL':'NL','SE':'SE','NO':'NO','FI':'FI','CH':'CH','IT':'IT','ES':'ES',
  'PT':'PT','BE':'BE','AT':'AT','IE':'IE','LU':'LU','DK':'DK','PL':'PL',
  'CZ':'CZ','HU':'HU','RO':'RO','BG':'BG','GR':'GR','TR':'TR','RU':'RU',
  'UA':'UA','IL':'IL','AE':'AE','SA':'SA','IN':'IN','TH':'TH','MY':'MY',
  'PH':'PH','VN':'VN','ID':'ID','BR':'BR','AR':'AR','CL':'CL','MX':'MX',
  'CO':'CO','ZA':'ZA','EG':'EG','NG':'NG','KE':'KE','PK':'PK','BD':'BD',
  'LK':'LK','NP':'NP','MM':'MM','KH':'KH','LA':'LA','NZ':'NZ','IS':'IS',
  'EE':'EE','LV':'LV','LT':'LT','SK':'SK','HR':'HR','SI':'SI','RS':'RS',
  'UY':'UY','PE':'PE','EC':'EC',
}
const SHORT_RE = new RegExp('(?:^|[\\s_\\-|｜])(?:' + Object.keys(SHORT_CODES).join('|') + ')(?=[\\s_\\-|｜]|$)', 'i')


const parseBody = (body) => {
  try { return typeof body === "string" ? JSON.parse(body) : body ?? null }
  catch { return null }
}

async function operator(proxies = [], targetPlatform, env) {
  if (!proxies?.length) return proxies;
  const $ = $substore;
  const cache = scriptResourceCache;
  const cacheEnabled = !!$arguments.cache;

  const vlessCount = (() => {
    if (U.RV !== '1') return 0;
    const before = proxies.length;
    proxies = proxies.filter(p => p.type !== 'vless');
    return before - proxies.length;
  })();
  if (!proxies.length) return proxies;

  const servers = [...new Set(proxies.map(p => p.server))];
  const ccMap = {};
  const geoFromAPI = new Set();

  const buildName = (cc, base, server) => {
    const sep = server && geoFromAPI.has(server) ? SEP : NAME_SEP
    return PREFIX + (cc ? cc + sep : '') + base
  }

  async function geoQuery(host) {
    let ip = host;
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host) && !host.includes(':')) {
      for (const url of [
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`,
        `https://dns.alidns.com/resolve?name=${encodeURIComponent(host)}&type=A`,
        `https://doh.pub/dns-query?name=${encodeURIComponent(host)}&type=A`,
      ]) {
        try {
          const r = await $.http.get({ url, timeout: 3500, headers: { 'Accept': 'application/dns-json' } });
          const j = parseBody(r.body);
          const a = j?.Answer?.find(a => a.type === 1);
          if (a) { ip = a.data; break; }
        } catch (e) {}
      }
    }
    const apis = [
      { url: `https://ipwho.is/${ip}`, ccKey: 'country_code', isIPAPI: false },
      { url: `https://ipinfo.io/${ip}/json`, ccKey: 'country', isIPAPI: false },
      { url: `http://ip-api.com/json/${host}?fields=countryCode,city&lang=zh-CN`, ccKey: 'countryCode', isIPAPI: true },
      { url: `https://api.ip.sb/geoip/${ip}`, ccKey: 'country_code', isIPAPI: false },
    ];
    for (const api of apis) {
      try {
        const resp = await $.http.get({ url: api.url, timeout: 3500 });
        const data = parseBody(resp.body);
        let cc = (data?.[api.ccKey] || '').toString().toUpperCase();
        if (!cc || cc === 'XX') continue;
        if (cc === 'CN' && !api.isIPAPI) {
          try {
            const r4 = await $.http.get({ url: `http://ip-api.com/json/${host}?fields=countryCode,city&lang=zh-CN`, timeout: 3500 });
            const d4 = parseBody(r4.body);
            if (d4?.countryCode) return { cc: 'CN', city: d4.city ?? '' };
          } catch (e) {}
        }
        return { cc, city: data?.city || '' };
      } catch (e) {}
    }
    return null;
  }

  if (GM_MODE !== '0') {
    const geoCache = {};
    async function geoLookup(host) {
      if (geoCache[host]) { ccMap[host] = geoCache[host]; geoFromAPI.add(host); return; }
      if (cacheEnabled) {
        const cached = cache.get('geo2:' + host);
        if (cached != null) {
          const geo = typeof cached === 'string' ? { cc: cached, city: '' } : cached;
          if (geo.cc && geo.cc !== 'XX') { geoCache[host] = geo; ccMap[host] = geo; geoFromAPI.add(host); return; }
        }
      }
      const geo = await geoQuery(host);
      if (geo) { geoCache[host] = geo; ccMap[host] = geo; geoFromAPI.add(host); if (cacheEnabled) cache.set('geo2:' + host, geo); return; }
      ccMap[host] = { cc: 'XX', city: '' };
    }
    const start = Date.now();
    for (let i = 0; i < servers.length; i += 5) {
      if (Date.now() - start > 40000) break;
      await Promise.all(servers.slice(i, i + 5).map(h => geoLookup(h)));
      if (i + 5 < servers.length) await new Promise(r => setTimeout(r, 100));
    }
  }

  let geoNodeCount = 0, nameNodeCount = 0, failNodeCount = 0;
  for (const proxy of proxies) {
    const srv = proxy.server;
    const existing = ccMap[srv];
    if (existing?.cc && existing.cc !== 'XX') { if (geoFromAPI.has(srv)) geoNodeCount++; else nameNodeCount++; continue; }
    const nameStr = decodeURIComponent(proxy.name || '').toUpperCase();
    let found = false;
    for (const [kw, cc] of Object.entries(FLAG_CC)) {
      if (nameStr.includes(kw)) { ccMap[srv] = { cc, city: '' }; nameNodeCount++; found = true; break; }
    }
    if (!found) {
      for (const [kw, cc] of Object.entries(LONG_KW)) {
        if (nameStr.includes(kw.toUpperCase())) { ccMap[srv] = { cc, city: '' }; nameNodeCount++; found = true; break; }
      }
    }
    if (!found) {
      const m = nameStr.match(SHORT_RE);
      if (m) { ccMap[srv] = { cc: SHORT_CODES[m[0].trim().toUpperCase()], city: '' }; nameNodeCount++; found = true; }
    }
    if (!found) { ccMap[srv] = { cc: 'XX', city: '' }; failNodeCount++; }
  }

  const geoLabel = (server) => {
    const geo = ccMap[server];
    if (!geo?.cc || geo.cc === 'XX') return null;
    return geo.cc === 'CN' && geo.city ? geo.city : cc2flag(geo.cc);
  };
  const isSupported = (server) => {
    const geo = ccMap[server];
    return geo?.cc && geo.cc !== 'XX' && !UNSUPPORTED.has(geo.cc);
  };

  const result = [];
  const isRandomMode = GM_MODE === '随机';
  const pickAndName = (list, p, i) => {
    const item = list[i % list.length];
    const cycle = Math.floor(i / list.length);
    p.name = buildName(geoLabel(p.server), cycle > 0 ? item + sup(cycle + 1) : item, p.server);
    result.push(p);
  };

  if (isRandomMode) {
    const groups = {};
    for (const p of proxies) { const f = geoLabel(p.server) || '无旗'; (groups[f] ??= []).push(p); }
    Object.entries(groups).forEach(([f, g]) => {
      const list = f === '无旗' ? MODES['吃货'] : MODES[MODE_KEYS[Math.floor(Math.random() * MODE_KEYS.length)]];
      g.forEach((p, i) => pickAndName(list, p, i));
    });
  } else if (CUSTOM_LIST.length > 0) {
    proxies.forEach((p, i) => pickAndName(CUSTOM_LIST, p, i));
  } else if (GM_MODE && MODES[GM_MODE]) {
    proxies.forEach((p, i) => pickAndName(MODES[GM_MODE], p, i));
  } else {
    const counter = {};
    for (const p of proxies) {
      const cc = geoLabel(p.server);
      if (cc) { counter[cc] = (counter[cc] || 0) + 1; p.name = buildName(null, cc + '-' + String(counter[cc]).padStart(2, '0'), p.server); }
      else { p.name = PREFIX + p.name.trim(); }
      result.push(p);
    }
  }

  if (HZ_TEXT) for (const p of result) { if (!IS_GPT || isSupported(p.server)) p.name += SUFFIX; }

  let msg = `v7.4 改名${result.length}`;
  if (geoNodeCount) msg += ` geo${geoNodeCount}/${result.length}`;
  if (nameNodeCount) msg += ` 原名${nameNodeCount}`;
  if (failNodeCount) msg += ` 失败${failNodeCount}`;
  msg += ` 服务器${geoFromAPI.size}/${servers.length}`;
  if (vlessCount) msg += ` 屏蔽${vlessCount}`;
  $.notify('智慧重命名', '', msg);
  return result;
}
